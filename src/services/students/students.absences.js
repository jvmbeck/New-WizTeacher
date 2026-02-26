import {
  getDoc,
  getDocs,
  doc,
  serverTimestamp,
  collection,
  runTransaction,
  where,
  query,
} from 'firebase/firestore'
import { db } from 'src/key/configKey.js'
import { todaysDate } from 'src/utils/dateHelpers.js'

export async function markStudentAbsent(absenceData) {
  const date = todaysDate()
  const stuId = absenceData.studentId
  const classId = absenceData.classId
  const absenceId = `${stuId}_${classId}_${date}`

  const absenceRef = doc(db, 'absences', absenceId)
  const studentRef = doc(db, 'students', absenceData.studentId)
  const studentSnap = await getDoc(studentRef)

  const currentAbsences = studentSnap.data().totalAbsences || 0

  // transaction ensures absence marking and counter update happen together.
  await runTransaction(db, async (transaction) => {
    // Check if absence already exists
    const absenceDoc = await transaction.get(absenceRef)
    if (absenceDoc.exists()) {
      transaction.delete(absenceRef)
      // Write: decrement totalAbsences
      transaction.update(studentRef, {
        totalAbsences: currentAbsences - 1,
      })
      console.log('Student already marked as absent, removing record')
    } else {
      // Write: mark the absence
      console.log('Marking student as absent')

      transaction.set(absenceRef, {
        studentId: stuId,
        classId,
        date: date,
        recordedAt: serverTimestamp(),
        type: 'absence',
        reason: 'Não estava presente na aula',
      })
      // Write: increment totalAbsences
      transaction.update(studentRef, {
        totalAbsences: currentAbsences + 1,
      })
    }
  })
}

export async function queryAbsences(classId) {
  const today = todaysDate()

  const todayQuery = query(
    collection(db, 'absences'),
    where('classId', '==', classId),
    where('date', '==', today),
  )

  const absSnap = await getDocs(todayQuery)
  return absSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
