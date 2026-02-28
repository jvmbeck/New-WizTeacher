import { defineStore } from 'pinia'
import {
  fetchAllStudents,
  fetchStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
} from 'src/services/students/index'
import { useClassStore } from './classStore'

export const useStudentStore = defineStore('studentStore', {
  state: () => ({
    students: [],
    loaded: false,
  }),
  actions: {
    async fetchStudents(force = false) {
      if (this.loaded && !force) {
        console.log('STUDENTS STORE: \nUSING STUDENTS ARRAY BECAUSE ITS ALREADY BEEN FETCHED')
        console.log(this.students)

        return this.students
      }
      this.refreshStudentsArray()
    },
    async refreshStudentsArray() {
      this.students = await fetchAllStudents()
      console.log('STUDENTS STORE: \nFETCHING NEW STUDENT ARRAY')

      this.loaded = true
      return this.students
    },
    async fetchStudentById(id) {
      return await fetchStudentById(id)
    },
    async createStudent(studentData) {
      const newStudent = await createStudent(studentData)
      this.students.push(newStudent)
    },
    async updateStudent(id, updatedData) {
      const existingIndex = this.students.findIndex((s) => s.id === id || s.uid === id)
      const existingStudent = existingIndex !== -1 ? { ...this.students[existingIndex] } : null
      const oldClassIds = existingStudent?.classIds ? [...existingStudent.classIds] : []
      const classStore = useClassStore()

      const normalizeIds = (ids) =>
        (Array.isArray(ids) ? ids : [])
          .map((item) =>
            item && typeof item === 'object' ? (item.value ?? item.id ?? item) : item,
          )
          .filter((item) => item !== null && item !== undefined)
          .map((item) => String(item))

      // Call service to update remote
      const updatedFromServer = await updateStudent(id, updatedData, oldClassIds)

      // Update local store without re-fetching all students
      if (existingIndex !== -1) {
        if (updatedFromServer) {
          this.students.splice(existingIndex, 1, updatedFromServer)
        } else {
          this.students.splice(existingIndex, 1, {
            ...this.students[existingIndex],
            ...updatedData,
          })
        }
      }

      const normalizedOldClassIds = normalizeIds(oldClassIds)
      const normalizedNewClassIds = normalizeIds(
        updatedFromServer?.classIds ?? updatedData?.classIds,
      )
      classStore.syncStudentClassMembership(id, normalizedOldClassIds, normalizedNewClassIds)
    },
    async deleteStudent(id, classId) {
      const res = await deleteStudent(id, classId)

      // Remove locally if deletion was successful or regardless to keep UI in sync
      const idx = this.students.findIndex((s) => s.id === id || s.uid === id)
      if (idx !== -1) {
        this.students.splice(idx, 1)
      }

      return res
    },
  },
})
