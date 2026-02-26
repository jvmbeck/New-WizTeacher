// services/classes.js
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  arrayRemove,
  arrayUnion,
  addDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../key/configKey.js'
import { getNextClassDayKey } from '../utils/dateHelpers.js'
//import { useUserStore } from '../stores/userStore.js'

const ClassServices = {
  async createClass({ classDays, schedule, teacherId, classType, classDuration }) {
    if (!classDays || !schedule || !teacherId || !classType || !classDuration) {
      throw new Error('Missing required fields')
    }

    const dayNamesMap = {
    0: 'Domingo',
    1: 'Segunda',
    2: 'Terça',
    3: 'Quarta',
    4: 'Quinta',
    5: 'Sexta',
    6: 'Sábado',
  }

    const dayNames = classDays.map(dayNum => dayNamesMap[dayNum])

    const className = `${dayNames.join('-')} ${schedule} - ${classType}`

    const classData = {
      className,
      classDays,
      schedule,
      teacherId,
      studentIds: [],
      unschedules: [],
      replenishments: [],
      classType,
      classDuration,
    }

    await addDoc(collection(db, 'classes'), classData)
  },

  async fetchAllClasses() {
    const snapshot = await getDocs(collection(db, 'classes'))
    const classes = []

    snapshot.forEach((doc) => {
      classes.push({ id: doc.id, ...doc.data() })
    })

    return classes
  },
  async fetchClassesByTeacher(teacherId) {
    const q = query(collection(db, 'classes'), where('teacherId', '==', teacherId))
    const snapshot = await getDocs(q)
    const classes = []

    snapshot.forEach((doc) => {
      classes.push({ id: doc.id, ...doc.data() })
    })

    return classes
  },
  async fetchClassById(classId) {
    if (!classId) throw new Error('Missing classId')

    const classRef = doc(db, 'classes', classId)
    const classSnap = await getDoc(classRef)

    if (!classSnap.exists()) {
      throw new Error('Class does not exist')
    }

    return { id: classSnap.id, ...classSnap.data() }
  },

  async updateClassData(classId, classData) {
    if (!classId || !classData) {
      throw new Error('Missing classId or classData')
    }

    const className = classData.classDay + ' ' + classData.schedule + ' - ' + classData.classType
    classData.className = className
    console.log('Updating class data for classId:', classId, 'with data:', classData)

    const classRef = doc(db, 'classes', classId)
    const existing = await getDoc(classRef)

    if (!existing.exists()) {
      throw new Error('Class does not exist')
    }

    await updateDoc(classRef, classData)
  },

  async updateClassStudentRefs(oldClassId, newClassId, studentId) {
    if (oldClassId) {
      await updateDoc(doc(db, 'classes', oldClassId), {
        students: arrayRemove(studentId),
      })
    }
    if (newClassId) {
      await updateDoc(doc(db, 'classes', newClassId), {
        students: arrayUnion(studentId),
      })
    }
  },

  async deleteClass(classId) {
    if (!classId) throw new Error('Missing classId')

    const classRef = doc(db, 'classes', classId)
    const classSnap = await getDoc(classRef)

    if (!classSnap.exists()) {
      throw new Error('Class does not exist')
    }

    // Delete all students in this class
    const studentIds = classSnap.data().studentIds || []
    await Promise.all(
      studentIds.map((studentId) => {
        return updateDoc(doc(db, 'students', studentId), {
          classId: null,
        })
      }),
    )

    // Delete the class document
    await deleteDoc(classRef)
  },

  async addStudentToClass(classId, studentId) {
    const classRef = doc(db, 'classes', classId)
    await updateDoc(classRef, {
      studentIds: arrayUnion(studentId),
    })
  },

  async addStudentToClassAdmin(classId, studentId) {
    if (!classId || !studentId) throw new Error('Missing classId or studentId')

    const classRef = doc(db, 'classes', classId)
    const studentRef = doc(db, 'students', studentId)

    await updateDoc(classRef, {
      studentIds: arrayUnion(studentId),
    })

    await updateDoc(studentRef, {
      classIds: arrayUnion(classId),
    })
  },

  async removeStudentFromClass(classId, studentId) {
    const classRef = doc(db, 'classes', classId)
    await updateDoc(classRef, {
      studentIds: arrayRemove(studentId),
    })
  },

  getUnscheduledForNextClass(classInfo) {
    const nextDateKey = getNextClassDayKey(classInfo)
    if (!nextDateKey) return []

    const unscheduled = classInfo.unscheduledStudents || {}
    return unscheduled[nextDateKey] || []
  },

  getReplenishmentsForNextClass(classInfo) {
    const nextDateKey = getNextClassDayKey(classInfo)
    if (!nextDateKey) return []

    const replenishments = classInfo.replenishmentStudents || {}
    return replenishments[nextDateKey] || []
  }
}
export default ClassServices
