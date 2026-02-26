import { collection, getDocs } from 'firebase/firestore'
import { db } from 'src/key/configKey.js'

const TeacherServices = {
  async fetchAllTeachers() {
    const snapshot = await getDocs(collection(db, 'users'))
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  },
}

export default TeacherServices
