import { getDoc, getDocs, doc, collection } from 'firebase/firestore'
import { db } from 'src/key/configKey.js'

export async function fetchAllStudents() {
  const snapshot = await getDocs(collection(db, 'students'))
  const students = snapshot.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      uid: docSnap.id,
      name: data.name || '',
      book: data.book || '',
      currentLesson: data.currentLesson || '',
      classIds: data.classIds || null,
      totalAbsences: data.totalAbsences,
      currentContractId: data.currentContractId ?? null,
    }
  })
  return students
}
export async function fetchStudentsByIds(studentIds) {
  const promises = studentIds.map((id) => getDoc(doc(db, 'students', id)))
  const snapshots = await Promise.all(promises)

  return snapshots
    .filter((snap) => snap.exists())
    .map((snap) => {
      const data = snap.data()
      return {
        uid: snap.id,
        ...data,
        // Ensure key fields are always present
        currentContractId: data.currentContractId ?? null,
      }
    })
}

export async function fetchStudentById(studentId) {
  if (!studentId) throw new Error('studentId is required')

  try {
    const docRef = doc(db, 'students', studentId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) return null

    const data = docSnap.data() || {}

    return {
      uid: docSnap.id,
      ...data,
      // Provide sensible defaults for commonly-used fields
      name: data.name ?? '',
      book: data.book ?? '',
      currentLesson: data.currentLesson ?? '',
      classIds: data.classIds ?? [],
      totalAbsences: data.totalAbsences ?? 0,
      currentContractId: data.currentContractId ?? null,
    }
  } catch (error) {
    console.error('fetchStudentById error:', error)
    throw error
  }
}
