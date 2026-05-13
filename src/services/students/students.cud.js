import {
  getDoc,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  collection,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from 'src/key/configKey.js'
import classServices from 'src/services/classes/ClassServices' // Adjust the path as necessary
// imported lazily inside createStudent to avoid circular import
// (students.contracts imports students.fetch which imports from here via index)
import { createContract } from 'src/services/students/students.contracts.js'

export async function createStudent(studentData) {
  const docRef = await addDoc(collection(db, 'students'), studentData)
  const studentId = docRef.id

  // Normalize classIds so callers may pass either an array of ids
  // or an array of option objects ({ label, value }) from the UI.
  const normalizedNewClassIds = Array.isArray(studentData.classIds)
    ? studentData.classIds.map((c) => (c && typeof c === 'object' ? (c.value ?? c.id ?? c) : c))
    : []

  if (normalizedNewClassIds.length > 0) {
    const batch = writeBatch(db)
    normalizedNewClassIds.forEach((classId) => {
      const classRef = doc(db, 'classes', classId)
      batch.update(classRef, { studentIds: arrayUnion(studentId) })
    })
    await batch.commit()
  }

  // Create initial contract if enough data was provided (book + contract number + dates)
  if (studentData.book && studentData.contract) {
    try {
      console.log(
        `[createStudent] Creating initial contract for student ${studentId}: contract=${studentData.contract}, book=${studentData.book}`,
      )
      const newContract = await createContract(studentId, {
        contractNumber: studentData.contract,
        book: studentData.book,
        startingLesson: studentData.currentLesson || '',
        currentLesson: studentData.currentLesson || '',
        startDate: (studentData.bookStartDate || '').replaceAll('/', '-'),
        endDate: (studentData.bookEndDate || '').replaceAll('/', '-'),
        exchangeDate: studentData.bookExchangeDate
          ? studentData.bookExchangeDate.replaceAll('/', '-')
          : null,
        isPartB: !!studentData.bookExchangeDate,
        setAsCurrent: true,
      })
      console.log(`[createStudent] Contract created successfully with ID: ${newContract.id}`)
    } catch (err) {
      console.error(
        `[createStudent] Failed to create initial contract for new student ${studentId}:`,
        err,
      )
    }
  } else {
    console.log(
      `[createStudent] Skipping contract creation: book="${studentData.book}", contract="${studentData.contract}"`,
    )
  }

  return { id: studentId, ...studentData, classIds: normalizedNewClassIds }
}

export async function updateStudent(studentId, updatedData, oldClassIds = []) {
  const studentRef = doc(db, 'students', studentId)

  const { name, book, currentLesson, classIds } = updatedData

  // Ensure classIds is an array of primitive ids (strings). The UI
  // may send option objects when using selects, so normalize here.
  const normalizedClassIds = Array.isArray(classIds)
    ? classIds.map((c) => (c && typeof c === 'object' ? (c.value ?? c.id ?? c) : c))
    : []

  // Update student document with the normalized classIds array
  const studentUpdatePayload = { name, book, currentLesson, classIds: normalizedClassIds }
  if (updatedData.currentContractId !== undefined) {
    studentUpdatePayload.currentContractId = updatedData.currentContractId
  }
  await updateDoc(studentRef, studentUpdatePayload)

  // Normalize oldClassIds as well (they may come from the store and be
  // objects if the UI previously stored option objects). This prevents
  // runtime errors when building document refs.
  const normalizedOldClassIds = Array.isArray(oldClassIds)
    ? oldClassIds.map((c) => (c && typeof c === 'object' ? (c.value ?? c.id ?? c) : c))
    : []

  // Determine which classes the student was removed from
  const removedClasses = normalizedOldClassIds.filter(
    (oldId) => !normalizedClassIds.includes(oldId),
  )

  // Determine which new classes the student was added to
  const addedClasses = normalizedClassIds.filter((newId) => !normalizedOldClassIds.includes(newId))

  const batch = writeBatch(db)

  // Remove student from old classes
  removedClasses.forEach((classId) => {
    const cid = classId == null ? classId : String(classId)
    const classRef = doc(db, 'classes', cid)
    batch.update(classRef, {
      studentIds: arrayRemove(studentId),
    })
  })

  // Add student to new classes
  addedClasses.forEach((classId) => {
    const cid = classId == null ? classId : String(classId)
    const classRef = doc(db, 'classes', cid)
    batch.update(classRef, {
      studentIds: arrayUnion(studentId),
    })
  })

  await batch.commit()

  // Return a minimal representation of the updated student for callers
  return { id: studentId, name, book, currentLesson, classIds: normalizedClassIds }
}

// lightweight helper for writing arbitrary fields to a student doc. this
// avoids having to import `db`/`updateDoc` in every consumer and keeps
// the surface of the student service as the single place all student
// writes go through.
export async function patchStudent(studentId, data) {
  const studentRef = doc(db, 'students', studentId)
  // caller is responsible for passing only sane/allowed keys
  await updateDoc(studentRef, data)
  // return data so callers can update local state if needed
  return data
}

export async function deleteStudent(id) {
  try {
    const studentRef = doc(db, 'students', id)

    // Fetch student to get all classIds
    const studentSnap = await getDoc(studentRef)
    if (!studentSnap.exists()) throw new Error('Student not found')

    const studentData = studentSnap.data()
    const classIds = studentData.classIds || []

    // Delete all documents inside 'lessons' subcollection
    const lessonsRef = collection(db, 'students', id, 'lessons')
    const lessonsSnapshot = await getDocs(lessonsRef)
    await Promise.all(lessonsSnapshot.docs.map((doc) => deleteDoc(doc.ref)))

    // Delete student document
    await deleteDoc(studentRef)

    // Remove student from all classes they were part of
    await Promise.all(classIds.map((classId) => classServices.removeStudentFromClass(classId, id)))
  } catch (error) {
    console.error('Error deleting student:', error)
    throw error
  }
}
