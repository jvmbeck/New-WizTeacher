import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../key/configKey.js'

export async function fetchAllClasses() {
  const snapshot = await getDocs(collection(db, 'classes'))
  const classes = []

  snapshot.forEach((doc) => {
    classes.push({ id: doc.id, ...doc.data() })
  })

  return classes
}

export async function fetchClassesByTeacher(teacherId) {
  const q = query(collection(db, 'classes'), where('teacherId', '==', teacherId))
  const snapshot = await getDocs(q)
  const classes = []

  snapshot.forEach((doc) => {
    classes.push({ id: doc.id, ...doc.data() })
  })

  return classes
}
export async function fetchClassById(classId) {
  if (!classId) throw new Error('Missing classId')

  const classRef = doc(db, 'classes', classId)
  const classSnap = await getDoc(classRef)

  if (!classSnap.exists()) {
    throw new Error('Class does not exist')
  }

  return { id: classSnap.id, ...classSnap.data() }
}
