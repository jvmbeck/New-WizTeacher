import { getDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from 'src/key/configKey.js'
import { findNextClassDate, formatLocalDateKey } from 'src/utils/dateHelpers.js'
import { fetchStudentById } from './students.fetch'

export async function unscheduleStudent(classId, studentId) {
  const classRef = doc(db, 'classes', classId)
  const classSnap = await getDoc(classRef)
  const studentRef = doc(db, 'students', studentId)

  // load the student and make sure we have an up‑to‑date absence count
  const studentData = await fetchStudentById(studentId)

  if (!classSnap.exists()) {
    return { success: false, reason: 'Class not found' }
  }

  const classData = classSnap.data()
  const classDays = classData.classDays || []
  const existingUnschedules = classData.unscheduledStudents || {} // keep field name consistent with your DB

  const today = new Date()
  const nextClassDate = findNextClassDate(today, classDays)

  if (!nextClassDate) {
    return { success: false, reason: 'Could not determine next class date' }
  }

  const dateKey = formatLocalDateKey(nextClassDate)
  const updatedUnschedules = { ...existingUnschedules }

  if (!Array.isArray(updatedUnschedules[dateKey])) {
    updatedUnschedules[dateKey] = []
  }

  const batch = writeBatch(db)

  const index = updatedUnschedules[dateKey].indexOf(studentId)

  const globalAbsencesRef = doc(db, 'absences', `${studentId}_${classId}_${dateKey}`)

  let isAddRecord = false

  if (index !== -1) {
    // 🔄 Student already unscheduled — remove them (toggle off)
    updatedUnschedules[dateKey].splice(index, 1)

    // If the array becomes empty, you can also optionally delete the key:
    if (updatedUnschedules[dateKey].length === 0) {
      delete updatedUnschedules[dateKey]
    }
    batch.update(classRef, {
      unscheduledStudents: updatedUnschedules,
    })
    batch.update(studentRef, {
      // studentData comes from fetchStudentById and exposes `totalAbsences`.
      // fall back to 0 just in case something is missing, but we should
      // never see the wrong value here.
      totalAbsences: (studentData?.totalAbsences || 0) - 1,
    })
    batch.delete(globalAbsencesRef)
  } else {
    // ➕ Student not unscheduled yet — add them
    updatedUnschedules[dateKey].push(studentId)
    batch.update(classRef, {
      unscheduledStudents: updatedUnschedules,
    })
    batch.update(studentRef, {
      totalAbsences: (studentData?.totalAbsences || 0) + 1,
    })
    batch.set(globalAbsencesRef, {
      studentId,
      classId,
      date: dateKey,
      recordedAt: serverTimestamp(),
      type: 'unschedule',
      reason: 'Aula desmarcada',
    })
    isAddRecord = true
  }

  try {
    await batch.commit()
    return { success: true, date: dateKey, isAddRecord: isAddRecord }
  } catch (error) {
    console.warn(error)
    return { success: false, dateKey }
  }
}
