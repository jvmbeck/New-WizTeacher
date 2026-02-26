import { doc, runTransaction } from 'firebase/firestore'
import { db } from 'src/key/configKey.js'
import { findNextClassDate, formatLocalDateKey } from 'src/utils/dateHelpers.js'

export async function addReplenishmentStudent(classId, studentId) {
  const classRef = doc(db, 'classes', classId)

  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(classRef)
      if (!snap.exists()) throw { success: false, reason: 'Class not found' }

      const data = snap.data()

      const today = new Date()
      const nextClassDate = findNextClassDate(today, data.classDays || [])
      if (!nextClassDate) throw { success: false, reason: 'No next class date' }

      const dateKey = formatLocalDateKey(nextClassDate)

      // Current array for this date
      const existing = data.replenishmentStudents?.[dateKey] || []

      const alreadyInList = existing.includes(studentId)
      let isAddRecord = false
      if (alreadyInList) {
        // REMOVE
        tx.update(classRef, {
          [`replenishmentStudents.${dateKey}`]: existing.filter((id) => id !== studentId),
        })
        return { success: true, isAddRecord, date: dateKey }
      } else {
        // ADD
        isAddRecord = true
        tx.update(classRef, {
          [`replenishmentStudents.${dateKey}`]: [...existing, studentId],
        })
        return { success: true, isAddRecord, date: dateKey }
      }
    })

    return result
  } catch (err) {
    console.log(err)

    return err
  }
}
