// stores/classStore.js
import { defineStore } from 'pinia'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../key/configKey' // adjust path as needed

export const useClassStore = defineStore('classStore', {
  state: () => ({
    classes: [],
  }),

  getters: {
    classMap(state) {
      const map = {}
      state.classes.forEach((cls) => {
        map[cls.id] = cls.name || 'Turma sem nome'
      })
      return map
    },

    // Helper to get class name by ID
    getClassNameById: (state) => (id) => {
      const found = state.classes.find((cls) => cls.id === id)
      return found ? found.name : '—'
    },
    getClassNamesByIds: (state) => (ids) => {
      return ids
        .map((id) => {
          const found = state.classes.find((cls) => cls.id === id)
          return found ? found.name : '—'
        })
        .join(', ')
    },
  },

  actions: {
    async fetchClasses() {
      const snapshot = await getDocs(collection(db, 'classes'))
      this.classes = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().className || 'Turma sem nome',
      }))
    },
  },
})
