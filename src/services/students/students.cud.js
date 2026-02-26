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
import classServices from 'src/services/ClassServices' // Adjust the path as necessary

export async function createStudent(studentData) {
  const docRef = await addDoc(collection(db, 'students'), studentData)

  // Normalize classIds so callers may pass either an array of ids
  // or an array of option objects ({ label, value }) from the UI.
  const normalizedNewClassIds = Array.isArray(studentData.classIds)
    ? studentData.classIds.map((c) => (c && typeof c === 'object' ? (c.value ?? c.id ?? c) : c))
    : []

  if (normalizedNewClassIds.length > 0) {
    const batch = writeBatch(db)

    normalizedNewClassIds.forEach((classId) => {
      const classRef = doc(db, 'classes', classId)
      batch.update(classRef, {
        studentIds: arrayUnion(docRef.id),
      })
    })

    await batch.commit()
  }

  return { id: docRef.id, ...studentData, classIds: normalizedNewClassIds }
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
  await updateDoc(studentRef, {
    name,
    book,
    currentLesson,
    classIds: normalizedClassIds,
  })

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
