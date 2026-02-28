// stores/classStore.js
import { defineStore } from 'pinia'
import ClassServices from '../services/ClassServices.js'

export const useClassStore = defineStore('classStore', {
  state: () => ({
    classes: [],
  }),
  getters: {
    classMap(state) {
      const map = {}
      state.classes.forEach((cls) => {
        map[cls.id] = cls.className || 'Turma sem nome'
      })
      return map
    },
    getClassNameById: (state) => (id) => {
      const found = state.classes.find((cls) => cls.id === id)
      return found ? found.className : '—'
    },
    getClassNamesByIds: (state) => (ids) => {
      return ids
        .map((id) => {
          const found = state.classes.find((cls) => cls.id === id)
          return found ? found.className : '—'
        })
        .join(', ')
    },
  },
  actions: {
    async deleteClass(classId) {
      await ClassServices.deleteClass(classId)
      this.removeClassFromStore(classId)
    },
    async updateClass(classId, classData) {
      await ClassServices.updateClassData(classId, classData)
      this.updateClassInStore({ id: classId, ...classData })
    },
    async fetchClasses() {
      if (this.classes.length > 0) {
        console.log('CLASS STORE: \n\nClass array already exists. Returning array.')
        return this.classes
      }
      const classes = await ClassServices.fetchAllClasses()
      this.classes = classes
      console.log("CLASS STORE: \n\nClass array doesn't exist. Fetching data first.")

      return this.classes
    },
    async createClass(classData) {
      console.log('CLASS STORE: \n\nCreating new class')
      const newClass = await ClassServices.createClass(classData)
      this.addClassToStore(newClass)
      return newClass
    },

    // Helper functions
    updateClassInStore(updatedClass) {
      console.log('CLASS STORE: \n\nUpdating class data in class array')

      const idx = this.classes.findIndex((c) => c.id === updatedClass.id)
      if (idx !== -1) {
        this.classes[idx] = { ...this.classes[idx], ...updatedClass }
      }
    },
    removeClassFromStore(classId) {
      this.classes = this.classes.filter((c) => c.id !== classId)
    },
    addClassToStore(newClass) {
      this.classes.push(newClass)
    },
    syncStudentClassMembership(studentId, oldClassIds = [], newClassIds = []) {
      if (!studentId || !this.classes.length) return

      const normalizeIds = (ids) =>
        (Array.isArray(ids) ? ids : [])
          .map((item) =>
            item && typeof item === 'object' ? (item.value ?? item.id ?? item) : item,
          )
          .filter((item) => item !== null && item !== undefined)
          .map((item) => String(item))

      const normalizedOld = [...new Set(normalizeIds(oldClassIds))]
      const normalizedNew = [...new Set(normalizeIds(newClassIds))]

      const removedClasses = normalizedOld.filter((classId) => !normalizedNew.includes(classId))
      const addedClasses = normalizedNew.filter((classId) => !normalizedOld.includes(classId))

      removedClasses.forEach((classId) => {
        const idx = this.classes.findIndex((c) => c.id === classId)
        if (idx === -1) return

        const currentStudentIds = Array.isArray(this.classes[idx].studentIds)
          ? this.classes[idx].studentIds
          : []

        this.classes[idx] = {
          ...this.classes[idx],
          studentIds: currentStudentIds.filter((id) => id !== studentId),
        }
      })

      addedClasses.forEach((classId) => {
        const idx = this.classes.findIndex((c) => c.id === classId)
        if (idx === -1) return

        const currentStudentIds = Array.isArray(this.classes[idx].studentIds)
          ? this.classes[idx].studentIds
          : []

        if (currentStudentIds.includes(studentId)) return

        this.classes[idx] = {
          ...this.classes[idx],
          studentIds: [...currentStudentIds, studentId],
        }
      })
    },
  },
})
