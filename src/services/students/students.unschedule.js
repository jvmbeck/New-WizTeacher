import { getDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from 'src/key/configKey.js'
import { findNextClassDate, formatLocalDateKey } from 'src/utils/dateHelpers.js'
import { fetchStudentById } from './students.fetch'

export async function unscheduleStudent(classId, studentId, selectedDates = []) {
  const classRef = doc(db, 'classes', classId)
  const classSnap = await getDoc(classRef)
  const sid = String(studentId)
  const studentRef = doc(db, 'students', sid)

  // load the student and make sure we have an up‑to‑date absence count
  const studentData = await fetchStudentById(sid)

  if (!classSnap.exists()) {
    return { success: false, reason: 'Class not found' }
  }

  const classData = classSnap.data()
  const existingUnschedules = classData.unscheduledStudents || {} // keep field name consistent with your DB

  // Normalize input dates
  const normalizedInputDates = Array.isArray(selectedDates)
    ? Array.from(new Set(selectedDates.map((dateKey) => String(dateKey).trim()).filter(Boolean)))
    : []

  let targetDateKeys = normalizedInputDates

  // Only use next class date as default if selectedDates was not explicitly passed (undefined/null)
  // An empty array means "clear all unscheduled dates"
  if (selectedDates === undefined || selectedDates === null) {
    const classDays = classData.classDays || []
    const today = new Date()
    const nextClassDate = findNextClassDate(today, classDays)

    if (!nextClassDate) {
      return { success: false, reason: 'Could not determine next class date' }
    }

    targetDateKeys = [formatLocalDateKey(nextClassDate)]
  }

  targetDateKeys.sort((a, b) => a.localeCompare(b))

  const existingDateKeysForStudent = Object.entries(existingUnschedules)
    .filter(([, ids]) => Array.isArray(ids) && ids.map((id) => String(id)).includes(sid))
    .map(([dateKey]) => dateKey)
    .sort((a, b) => a.localeCompare(b))

  const updatedUnschedules = { ...existingUnschedules }
  const targetSet = new Set(targetDateKeys)
  const existingSet = new Set(existingDateKeysForStudent)

  const addedDates = targetDateKeys.filter((dateKey) => !existingSet.has(dateKey))
  const removedDates = existingDateKeysForStudent.filter((dateKey) => !targetSet.has(dateKey))
  const unchangedDates = targetDateKeys.filter((dateKey) => existingSet.has(dateKey))

  if (addedDates.length === 0 && removedDates.length === 0) {
    return {
      success: true,
      addedDates,
      removedDates,
      unchangedDates,
      absencesDelta: 0,
    }
  }

  addedDates.forEach((dateKey) => {
    if (!Array.isArray(updatedUnschedules[dateKey])) {
      updatedUnschedules[dateKey] = []
    }

    if (!updatedUnschedules[dateKey].includes(sid)) {
      updatedUnschedules[dateKey].push(sid)
    }
  })

  removedDates.forEach((dateKey) => {
    if (!Array.isArray(updatedUnschedules[dateKey])) return

    updatedUnschedules[dateKey] = updatedUnschedules[dateKey].filter((id) => String(id) !== sid)

    if (updatedUnschedules[dateKey].length === 0) {
      delete updatedUnschedules[dateKey]
    }
  })

  const batch = writeBatch(db)

  const totalAbsencesDelta = addedDates.length - removedDates.length
  const updatedTotalAbsences = Math.max(0, (studentData?.totalAbsences || 0) + totalAbsencesDelta)

  batch.update(classRef, {
    unscheduledStudents: updatedUnschedules,
  })
  batch.update(studentRef, {
    totalAbsences: updatedTotalAbsences,
  })

  addedDates.forEach((dateKey) => {
    const globalAbsencesRef = doc(db, 'absences', `${sid}_${classId}_${dateKey}`)
    batch.set(globalAbsencesRef, {
      studentId: sid,
      classId,
      date: dateKey,
      recordedAt: serverTimestamp(),
      type: 'unschedule',
      reason: 'Aula desmarcada',
      ...(studentData?.currentContractId ? { contractId: studentData.currentContractId } : {}),
    })
  })

  removedDates.forEach((dateKey) => {
    const globalAbsencesRef = doc(db, 'absences', `${sid}_${classId}_${dateKey}`)
    batch.delete(globalAbsencesRef)
  })

  // Update contract-level totalAbsences counter if student has an active contract
  if (studentData?.currentContractId && totalAbsencesDelta !== 0) {
    const contractRef = doc(db, 'contracts', studentData.currentContractId)
    const contractSnap = await getDoc(contractRef)
    if (contractSnap.exists()) {
      const nextContractAbsences = Math.max(
        0,
        (contractSnap.data().totalAbsences || 0) + totalAbsencesDelta,
      )
      batch.update(contractRef, { totalAbsences: nextContractAbsences })
    }
  }

  try {
    await batch.commit()
    return {
      success: true,
      addedDates,
      removedDates,
      unchangedDates,
      absencesDelta: totalAbsencesDelta,
    }
  } catch (error) {
    console.warn(error)
    return { success: false, reason: 'Failed to save unschedules' }
  }
}
