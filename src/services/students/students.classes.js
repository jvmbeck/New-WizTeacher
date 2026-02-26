import { doc, updateDoc, arrayRemove } from 'firebase/firestore'
import { db } from 'src/key/configKey.js'

export async function removeStudentFromClass(classId, studentId) {
  if (!classId || !studentId) {
    throw new Error('Both classId and studentId are required')
  }

  const classRef = doc(db, 'classes', classId)

  // Remove studentId from the class's studentIds array
  await updateDoc(classRef, {
    studentIds: arrayRemove(studentId),
  })

  const studentRef = doc(db, 'students', studentId)

  // Also remove the classId from the student's classIds array
  await updateDoc(studentRef, {
    classIds: arrayRemove(classId),
  })
}
