import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from 'src/key/configKey'

export async function saveHomeworkGrades({ studentId, studentBook, contractId = null, hwPages }) {
  if (!studentId) throw new Error('Missing required value: studentId')
  if (!studentBook) throw new Error('Missing required value: studentBook')
  if (!Array.isArray(hwPages) || hwPages.length === 0) {
    throw new Error('hwPages must be a non-empty array')
  }

  const batch = writeBatch(db)
  let validEntriesCount = 0

  for (const hw of hwPages) {
    const lessonId = String(hw.lesson ?? '').trim()
    const grade = String(hw.grade ?? '').trim()

    if (!lessonId || !grade) continue
    validEntriesCount += 1

    const lessonDocId = `${studentBook}_${lessonId}`
    const completedDocId = `${lessonDocId}_${studentId}`

    // merge:true upserts the lesson doc even when retroactive lesson records are missing
    const payload = {
      gradeE: grade,
      hwGradedAt: serverTimestamp(),
      lessonNumber: lessonId,
      book: studentBook,
      contractId,
    }

    const completedDocRef = doc(db, 'lessonsCompleted', completedDocId)
    batch.set(completedDocRef, payload, { merge: true })

    const studentLessonRef = doc(db, 'students', studentId, 'lessons', lessonDocId)
    batch.set(studentLessonRef, payload, { merge: true })
  }

  if (validEntriesCount === 0) {
    throw new Error('No valid homework entries to save')
  }

  await batch.commit()
}
