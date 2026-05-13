import {
  doc,
  writeBatch,
  serverTimestamp,
  getDoc,
  query,
  collection,
  where,
  getDocs,
} from 'firebase/firestore'
import { db } from 'src/key/configKey.js'
import { findNextClassDate, formatLocalDateKey } from 'src/utils/dateHelpers.js'

/**
 * Schedule a replenishment for a student
 * Creates replenishment record, updates class array, and increments student counter
 */
export async function scheduleReplenishment({
  studentId,
  studentName,
  missedDate,
  replenishmentClassId,
  replenishmentDate,
  notes = '',
  contractId = null,
}) {
  const batch = writeBatch(db)

  // 1. Create replenishment record in collection
  const replenishmentId = `${studentId}_${replenishmentClassId}_${replenishmentDate}`
  const replenishmentRef = doc(db, 'replenishments', replenishmentId)

  batch.set(replenishmentRef, {
    studentId,
    studentName,
    missedDate,
    replenishmentClassId,
    replenishmentDate,
    status: 'scheduled',
    recordedAt: serverTimestamp(),
    completedAt: null,
    notes,
    ...(contractId ? { contractId } : {}),
  })

  // 2. Add to class's replenishmentStudents array
  const classRef = doc(db, 'classes', replenishmentClassId)
  const classSnap = await getDoc(classRef)

  if (!classSnap.exists()) {
    return { success: false, reason: 'Replenishment class not found' }
  }

  const classData = classSnap.data()
  const existing = classData.replenishmentStudents?.[replenishmentDate] || []

  if (!existing.includes(studentId)) {
    const updated = [...existing, studentId]
    batch.update(classRef, {
      [`replenishmentStudents.${replenishmentDate}`]: updated,
    })
  }

  // 3. Increment student's pending replenishments counter
  const studentRef = doc(db, 'students', studentId)
  const studentSnap = await getDoc(studentRef)

  if (studentSnap.exists()) {
    const studentData = studentSnap.data()
    batch.update(studentRef, {
      pendingReplenishments: (studentData.pendingReplenishments || 0) + 1,
    })
    // Increment contract-level counter if contractId is known
    const resolvedContractId = contractId || studentData.currentContractId || null
    if (resolvedContractId) {
      const contractRef = doc(db, 'contracts', resolvedContractId)
      const contractSnap = await getDoc(contractRef)
      if (contractSnap.exists()) {
        batch.update(contractRef, {
          pendingReplenishments: (contractSnap.data().pendingReplenishments || 0) + 1,
        })
      }
    }
  }

  try {
    await batch.commit()
    return {
      success: true,
      replenishmentId,
      replenishmentDate,
    }
  } catch (error) {
    console.error('Error scheduling replenishment:', error)
    return { success: false, reason: 'Failed to schedule replenishment' }
  }
}

/**
 * Cancel a replenishment
 * Removes replenishment record, updates class array, and decrements student counter
 */
export async function cancelReplenishment(replenishmentId) {
  const replenishmentRef = doc(db, 'replenishments', replenishmentId)
  const replenishmentSnap = await getDoc(replenishmentRef)

  if (!replenishmentSnap.exists()) {
    return { success: false, reason: 'Replenishment not found' }
  }

  const replenishmentData = replenishmentSnap.data()
  const { studentId, replenishmentClassId, replenishmentDate } = replenishmentData

  const batch = writeBatch(db)

  // 1. Delete replenishment record
  batch.delete(replenishmentRef)

  // 2. Remove from class array
  const classRef = doc(db, 'classes', replenishmentClassId)
  const classSnap = await getDoc(classRef)

  if (classSnap.exists()) {
    const classData = classSnap.data()
    const existing = classData.replenishmentStudents?.[replenishmentDate] || []
    const updated = existing.filter((id) => id !== studentId)

    if (updated.length > 0) {
      batch.update(classRef, {
        [`replenishmentStudents.${replenishmentDate}`]: updated,
      })
    } else {
      // Remove the date key entirely if empty
      batch.update(classRef, {
        [`replenishmentStudents.${replenishmentDate}`]: [],
      })
    }
  }

  // 3. Decrement student counter
  const studentRef = doc(db, 'students', studentId)
  const studentSnap = await getDoc(studentRef)

  if (studentSnap.exists()) {
    const studentData = studentSnap.data()
    batch.update(studentRef, {
      pendingReplenishments: Math.max(0, (studentData.pendingReplenishments || 0) - 1),
    })
    // Decrement contract-level counter if contractId present on the replenishment doc
    const contractId = replenishmentData.contractId || studentData.currentContractId || null
    if (contractId) {
      const contractRef = doc(db, 'contracts', contractId)
      const contractSnap = await getDoc(contractRef)
      if (contractSnap.exists()) {
        batch.update(contractRef, {
          pendingReplenishments: Math.max(0, (contractSnap.data().pendingReplenishments || 0) - 1),
        })
      }
    }
  }

  try {
    await batch.commit()
    return { success: true }
  } catch (error) {
    console.error('Error canceling replenishment:', error)
    return { success: false, reason: 'Failed to cancel replenishment' }
  }
}

/**
 * Get all pending replenishments for a student
 */
export async function getPendingReplenishments(studentId) {
  try {
    const q = query(
      collection(db, 'replenishments'),
      where('studentId', '==', studentId),
      where('status', '==', 'scheduled'),
    )

    const snapshot = await getDocs(q)
    const replenishments = []

    snapshot.forEach((doc) => {
      replenishments.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return replenishments
  } catch (error) {
    console.error('Error fetching pending replenishments:', error)
    return []
  }
}

/**
 * Get all replenishments for a specific class on a specific date
 */
export async function getReplenishmentsForClassDate(classId, date) {
  try {
    const q = query(
      collection(db, 'replenishments'),
      where('replenishmentClassId', '==', classId),
      where('replenishmentDate', '==', date),
    )

    const snapshot = await getDocs(q)
    const replenishments = []

    snapshot.forEach((doc) => {
      replenishments.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return replenishments
  } catch (error) {
    console.error('Error fetching replenishments for class:', error)
    return []
  }
}

/**
 * Set replenishment dates for a student in a class
 * Reconciles selected dates against existing dates and syncs all 3 data locations:
 * - replenishments collection
 * - classes.replenishmentStudents map
 * - students.pendingReplenishments counter
 */
export async function setReplenishmentDatesForStudent(
  classId,
  studentId,
  selectedDates = [],
  notes = '',
) {
  const sid = String(studentId)
  const classRef = doc(db, 'classes', classId)
  const studentRef = doc(db, 'students', sid)

  const [classSnap, studentSnap] = await Promise.all([getDoc(classRef), getDoc(studentRef)])

  if (!classSnap.exists()) {
    return { success: false, reason: 'Class not found' }
  }

  if (!studentSnap.exists()) {
    return { success: false, reason: 'Student not found' }
  }

  const classData = classSnap.data()
  const studentData = studentSnap.data()
  const studentName = studentData.studentName || studentData.name || 'Aluno'

  const replenishmentByDate = classData.replenishmentStudents || {}

  const normalizedInputDates = Array.isArray(selectedDates)
    ? Array.from(new Set(selectedDates.map((dateKey) => String(dateKey).trim()).filter(Boolean)))
    : []

  normalizedInputDates.sort((a, b) => a.localeCompare(b))

  const existingDateKeysForStudent = Object.entries(replenishmentByDate)
    .filter(([, ids]) => Array.isArray(ids) && ids.map((id) => String(id)).includes(sid))
    .map(([dateKey]) => dateKey)
    .sort((a, b) => a.localeCompare(b))

  const targetSet = new Set(normalizedInputDates)
  const existingSet = new Set(existingDateKeysForStudent)

  const addedDates = normalizedInputDates.filter((dateKey) => !existingSet.has(dateKey))
  const removedDates = existingDateKeysForStudent.filter((dateKey) => !targetSet.has(dateKey))
  const unchangedDates = normalizedInputDates.filter((dateKey) => existingSet.has(dateKey))

  if (addedDates.length === 0 && removedDates.length === 0) {
    return {
      success: true,
      addedDates,
      removedDates,
      unchangedDates,
      pendingDelta: 0,
    }
  }

  const updatedReplenishmentsByDate = { ...replenishmentByDate }

  addedDates.forEach((dateKey) => {
    const current = Array.isArray(updatedReplenishmentsByDate[dateKey])
      ? [...updatedReplenishmentsByDate[dateKey]].map((id) => String(id))
      : []

    if (!current.includes(sid)) {
      current.push(sid)
    }

    updatedReplenishmentsByDate[dateKey] = current
  })

  removedDates.forEach((dateKey) => {
    const current = Array.isArray(updatedReplenishmentsByDate[dateKey])
      ? updatedReplenishmentsByDate[dateKey].map((id) => String(id))
      : []

    const filtered = current.filter((id) => id !== sid)

    if (filtered.length > 0) {
      updatedReplenishmentsByDate[dateKey] = filtered
    } else {
      delete updatedReplenishmentsByDate[dateKey]
    }
  })

  const pendingDelta = addedDates.length - removedDates.length
  const nextPending = Math.max(0, (studentData.pendingReplenishments || 0) + pendingDelta)

  const batch = writeBatch(db)

  batch.update(classRef, {
    replenishmentStudents: updatedReplenishmentsByDate,
  })

  batch.update(studentRef, {
    pendingReplenishments: nextPending,
  })

  // Update contract-level counter if student has an active contract
  if (studentData.currentContractId && pendingDelta !== 0) {
    const contractRef = doc(db, 'contracts', studentData.currentContractId)
    const contractSnap = await getDoc(contractRef)
    if (contractSnap.exists()) {
      const nextContractPending = Math.max(
        0,
        (contractSnap.data().pendingReplenishments || 0) + pendingDelta,
      )
      batch.update(contractRef, { pendingReplenishments: nextContractPending })
    }
  }

  addedDates.forEach((dateKey) => {
    const replenishmentId = `${sid}_${classId}_${dateKey}`
    const replenishmentRef = doc(db, 'replenishments', replenishmentId)

    batch.set(replenishmentRef, {
      studentId: sid,
      studentName,
      missedClassId: classId,
      missedDate: dateKey,
      replenishmentClassId: classId,
      replenishmentDate: dateKey,
      status: 'scheduled',
      recordedAt: serverTimestamp(),
      completedAt: null,
      notes,
      ...(studentData.currentContractId ? { contractId: studentData.currentContractId } : {}),
    })
  })

  removedDates.forEach((dateKey) => {
    const replenishmentRef = doc(db, 'replenishments', `${sid}_${classId}_${dateKey}`)
    batch.delete(replenishmentRef)
  })

  try {
    await batch.commit()
    return {
      success: true,
      addedDates,
      removedDates,
      unchangedDates,
      pendingDelta,
    }
  } catch (error) {
    console.error('Error setting replenishment dates:', error)
    return { success: false, reason: 'Failed to save replenishment dates' }
  }
}

/**
 * Legacy function - toggle replenishment for next class date
 * Updated to maintain data consistency across all three collections
 */
export async function addReplenishmentStudent(classId, studentId) {
  const classRef = doc(db, 'classes', classId)
  const classSnap = await getDoc(classRef)

  if (!classSnap.exists()) {
    return { success: false, reason: 'Class not found' }
  }

  const data = classSnap.data()

  const today = new Date()
  const nextClassDate = findNextClassDate(today, data.classDays || [])
  if (!nextClassDate) {
    return { success: false, reason: 'No next class date' }
  }

  const dateKey = formatLocalDateKey(nextClassDate)

  const existing = data.replenishmentStudents?.[dateKey] || []
  const alreadyInList = existing.includes(studentId)

  const targetDates = alreadyInList ? [] : [dateKey]
  const result = await setReplenishmentDatesForStudent(
    classId,
    studentId,
    targetDates,
    'Added via quick-add button',
  )

  if (!result.success) {
    return result
  }

  return {
    success: true,
    isAddRecord: !alreadyInList,
    date: dateKey,
    addedDates: result.addedDates,
    removedDates: result.removedDates,
  }
}
