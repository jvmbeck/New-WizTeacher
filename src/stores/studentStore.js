import { defineStore } from 'pinia'
import {
  fetchAllStudents,
  fetchStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  fetchContractsByStudentId,
  fetchActiveContract,
  createContract,
  updateContract,
  setActiveContract,
  closeContract,
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
        console.log('STUDENTS STORE: \n\nStudent array already exists. Returning array. ')
        console.log(this.students)

        return this.students
      }
      this.refreshStudentsArray()
    },
    async refreshStudentsArray() {
      this.students = await fetchAllStudents()
      console.log("STUDENTS STORE: \n\nStudent array doesn't exist. Fetching data first.")

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

    // ── Contract actions ────────────────────────────────────────────────────
    async fetchContractsByStudentId(studentId) {
      return await fetchContractsByStudentId(studentId)
    },
    async fetchActiveContract(studentId) {
      return await fetchActiveContract(studentId)
    },
    async createContract(studentId, contractData) {
      const contract = await createContract(studentId, contractData)
      // Sync currentContractId only when this new contract should become current
      if (contractData?.setAsCurrent) {
        const idx = this.students.findIndex((s) => s.id === studentId || s.uid === studentId)
        if (idx !== -1) {
          this.students[idx] = {
            ...this.students[idx],
            currentContractId: contract.id,
            book: contract.book,
            currentLesson: contract.currentLesson,
          }
        }
      }
      return contract
    },
    async updateContract(contractId, updates) {
      return await updateContract(contractId, updates)
    },
    async setActiveContract(studentId, contractId) {
      await setActiveContract(studentId, contractId)
      const idx = this.students.findIndex((s) => s.id === studentId || s.uid === studentId)
      if (idx !== -1) {
        this.students[idx] = { ...this.students[idx], currentContractId: contractId }
      }
    },
    async closeContract(studentId, contractId, closeData) {
      await closeContract(studentId, contractId, closeData)
      const idx = this.students.findIndex((s) => s.id === studentId || s.uid === studentId)
      if (idx !== -1 && this.students[idx].currentContractId === contractId) {
        this.students[idx] = { ...this.students[idx], currentContractId: null }
      }
    },
  },
})
