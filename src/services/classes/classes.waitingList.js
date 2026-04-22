import { doc, writeBatch, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from 'src/key/configKey.js'

export async function addStudentToWaitingList(classId, studentId) {
  if (!classId || !studentId) {
    throw new Error('Both classId and studentId are required')
  }

  const classRef = doc(db, 'classes', classId)
  const studentRef = doc(db, 'students', studentId)
  const batch = writeBatch(db)

  batch.update(classRef, {
    waitingList: arrayUnion(studentId),
    studentIds: arrayRemove(studentId),
  })

  batch.update(studentRef, {
    classIds: arrayRemove(classId),
  })

  await batch.commit()
}

export async function restoreStudentFromWaitingList(classId, studentId) {
  if (!classId || !studentId) {
    throw new Error('Both classId and studentId are required')
  }

  const classRef = doc(db, 'classes', classId)
  const studentRef = doc(db, 'students', studentId)
  const batch = writeBatch(db)

  batch.update(classRef, {
    waitingList: arrayRemove(studentId),
    studentIds: arrayUnion(studentId),
  })

  batch.update(studentRef, {
    classIds: arrayUnion(classId),
  })

  await batch.commit()
}
