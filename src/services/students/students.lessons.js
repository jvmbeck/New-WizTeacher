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

  // interpret homework pages; teacher may indicate no homework or supply
  // ranges such as "12-15".
  if (lessonData.noHomework) {
    lessonData.homeworkPages = []
  } else if (typeof lessonData.homeworkPages === 'string') {
    const parts = lessonData.homeworkPages
      .split(/[,;]/)
      .map((p) => p.trim())
      .filter((p) => p)
    const pages = []
    for (const part of parts) {
      const rangeMatch = part.match(/^(\d+)-(\d+)$/)
      if (rangeMatch) {
        let start = parseInt(rangeMatch[1], 10)
        let end = parseInt(rangeMatch[2], 10)
        if (end < start) [start, end] = [end, start]
        for (let i = start; i <= end; i++) {
          pages.push(String(i))
        }
      } else {
        pages.push(part)
      }
    }
    lessonData.homeworkPages = pages
  }

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
      noHomework: lessonData.noHomework || false,
      studentId,
      teacherId: user.uid,
      teacherName: userStore.userInfo?.name || 'Unknown Teacher',
    }

    if (lessonSnap.exists()) {
      // Preserve the existing completedAt timestamp
      const existingData = lessonSnap.data()
      if (existingData.completedAt) {
        fullLessonInfo.completedAt = existingData.completedAt
      } else {
        // HW-only rows can exist without completedAt; set it on first full lesson save.
        fullLessonInfo.completedAt = serverTimestamp()
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
      noHomework: lessonData.noHomework || false,
      teacherId: user.uid,
      teacherName: userStore.userInfo?.name || 'Unknown Teacher',
      status: 'pending',
    }
  }

  const batch = writeBatch(db)

  const studentLessonRef = doc(db, 'students', studentId, 'lessons', lessonId)
  const globalLessonRef = doc(db, 'lessonsCompleted', `${lessonId}_${studentId}`)

  // Resolve contractId: caller may supply it; otherwise fall back to student's active contract
  const contractId = lessonData.contractId || studentData.currentContractId || null
  console.log(
    `[saveLessonForStudent] studentId=${studentId}, lessonId=${lessonId}, lessonData.contractId=${lessonData.contractId}, studentData.currentContractId=${studentData.currentContractId}, resolved contractId=${contractId}`,
  )
  if (contractId) {
    fullLessonInfo.contractId = contractId
  }

  // Never overwrite an existing homework grade with an empty value.
  if (fullLessonInfo.gradeE === '' || fullLessonInfo.gradeE === null) {
    delete fullLessonInfo.gradeE
  }

  batch.set(studentLessonRef, fullLessonInfo, { merge: true })
  batch.set(globalLessonRef, fullLessonInfo, { merge: true })

  if (lessonNumber === currentLesson) {
    const { nextLesson } = getNextLesson(currentLesson, book)
    batch.update(studentRef, {
      currentLesson: nextLesson,
    })
    // Mirror progression into active contract if linked
    const resolvedContractId = lessonData.contractId || studentData.currentContractId || null
    if (resolvedContractId && nextLesson) {
      const contractRef = doc(db, 'contracts', resolvedContractId)
      const contractSnap = await getDoc(contractRef)
      if (contractSnap.exists()) {
        batch.update(contractRef, { currentLesson: nextLesson })
        // If the contract had no currentLesson yet, this also serves as the soft-fill
      }
    }
  }

  // if pages were provided, append them to the student document's homeworkPages array
  if (lessonData.homeworkPages && lessonData.homeworkPages.length) {
    // fetch current pages so we can concatenate the new ones
    const currentHomeworkPages = studentData.homeworkPages || []
    const updatedHomeworkPages = [...currentHomeworkPages, ...lessonData.homeworkPages]
    batch.update(studentRef, {
      homeworkPages: updatedHomeworkPages,
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
