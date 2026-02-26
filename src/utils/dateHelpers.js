/**
 * Returns the next date (Date object) after `today` that matches any weekday
 * in classDays (array of numbers 0..6). Always returns the nearest future occurrence (1..7 days ahead).
 */
export function formatLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function findNextClassDate(today, classDays) {
  // normalize classDays to numbers and unique
  const daysSet = Array.from(
    new Set(
      (classDays || []).map((d) => Number(d)).filter((n) => !Number.isNaN(n) && n >= 0 && n <= 6),
    ),
  )

  if (daysSet.length === 0) return null

  for (let i = 0; i <= 7; i++) {
    const candidate = new Date(today)
    candidate.setDate(today.getDate() + i)
    const w = candidate.getDay()
    if (daysSet.includes(w)) {
      // return a new Date at local midnight to be safe
      return new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate())
    }
  }

  return null // should never happen
}

export function getNextClassDayKey(classInfo) {
  const nextDate = findNextClassDate(new Date(), classInfo.classDays || [])
  return nextDate ? nextDate.toISOString().split('T')[0] : null
}

export function isToday(timestamp) {
  return timestamp.toDate().toDateString() === new Date().toDateString()
}

export function todaysDate() {
  const today = new Date()
  const dateOnly = today.toLocaleDateString('en-CA')
  return dateOnly
}
