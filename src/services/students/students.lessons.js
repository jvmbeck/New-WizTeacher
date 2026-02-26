import { getDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from 'src/key/configKey.js'
import bookStructure from 'src/data/bookStructure.json'
import { getAuth } from 'firebase/auth'
import { useUserStore } from 'src/stores/userStore.js'

const userStore = useUserStore()

export async function saveLessonForStudent(studentId, lessonData) {
  const studentRef = doc(db, 'students', studentId)
  const studentSnap = await getDoc(studentRef)
  if (!studentSnap.exists()) throw new Error('Student not found')

  const studentData = studentSnap.data()
  const book = lessonData.book || studentData.book
  const currentLesson = studentData.currentLesson

  const lessonNumber = lessonData.lessonNumber
  const lessonId = `${book}_${lessonNumber}`

  const auth = getAuth()
  const user = auth.currentUser

  let fullLessonInfo = {}

  const lessonRef = doc(db, 'students', studentId, 'lessons', lessonId)
  const lessonSnap = await getDoc(lessonRef)

  if (lessonData.pendingCheck == false) {
    fullLessonInfo = {
      ...lessonData,
      checkedAt: serverTimestamp(),
      status: 'completed',
      studentId,
      teacherId: user.uid,
      teacherName: userStore.userInfo?.name || 'Unknown Teacher',
    }

    if (lessonSnap.exists()) {
      // Preserve the existing completedAt timestamp
      const existingData = lessonSnap.data()
      if (existingData.completedAt) {
        fullLessonInfo.completedAt = existingData.completedAt
      }
    } else {
      // Only add new completedAt for new lessons
      fullLessonInfo.completedAt = serverTimestamp()
    }
  } else {
    fullLessonInfo = {
      ...lessonData,
      studentId,
      completedAt: serverTimestamp(),
      checkedAt: 'pending',
      teacherId: user.uid,
      teacherName: userStore.userInfo?.name || 'Unknown Teacher',
      status: 'pending',
    }
  }

  const batch = writeBatch(db)

  const studentLessonRef = doc(db, 'students', studentId, 'lessons', lessonId)
  const globalLessonRef = doc(db, 'lessonsCompleted', `${lessonId}_${studentId}`)

  batch.set(studentLessonRef, fullLessonInfo)
  batch.set(globalLessonRef, fullLessonInfo)

  if (lessonNumber === currentLesson) {
    const { nextLesson } = this.getNextLesson(currentLesson, book)
    batch.update(studentRef, {
      currentLesson: nextLesson,
    })
  }

  //commit
  try {
    await batch.commit()
    //returns true so page can show success notification
    return true
  } catch (error) {
    console.error('❌ Batch write error:', error.code, error.message)
    return false
  }
}

export function getNextLesson(currentLesson, book) {
  const lessons = bookStructure[book]
  if (!lessons) throw new Error(`Book "${book}" not found in structure`)

  const index = lessons.indexOf(String(currentLesson))

  if (index === -1) {
    throw new Error(`Lesson "${currentLesson}" not found in book "${book}"`)
  }
  const isLastLesson = index === lessons.length - 1
  const nextLesson = isLastLesson ? null : lessons[index + 1]

  return {
    nextLesson,
    isEndOfBook: isLastLesson,
  }
}

export async function fetchLessonCompletion(student, book, lesson) {
  if (!book || !lesson) return false
  const lessonId = `${book}_${lesson}`
  const lessonRef = doc(db, 'students', student.uid, 'lessons', lessonId)
  const lessonSnap = await getDoc(lessonRef)
  return lessonSnap.exists()
}
