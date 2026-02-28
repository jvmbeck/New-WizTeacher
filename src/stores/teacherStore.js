import { defineStore } from 'pinia'
import TeacherServices from '../services/TeacherServices.js'

export const useTeacherStore = defineStore('teacherStore', {
  state: () => ({
    teachers: [], // { id, name, ... }
  }),
  getters: {
    getTeacherNameById: (state) => (id) => {
      const found = state.teachers.find((t) => t.id === id)
      return found ? found.name : 'Desconhecido'
    },
  },
  actions: {
    async fetchTeachers() {
      if (this.teachers.length > 0) return this.teachers
      console.log('TEACHER STORE: \n\nFetching teacher data from Firestore.')

      const allUsers = await TeacherServices.fetchAllTeachers()
      this.teachers = allUsers.filter((t) => t.role === 'teacher')
      return this.teachers
    },
  },
})
