import { defineStore } from 'pinia'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../key/configKey'
import AuthServices from '../services/AuthServices'

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null,
  }),
  actions: {
    async loadUserInfo() {
      return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
          if (user) {
            const docSnap = await AuthServices.getSignedInUserInfo(user.uid)
            if (docSnap.exists()) {
              this.userInfo = docSnap.data()
              console.log('User info loaded:', this.userInfo)
            } else {
              console.warn('No user document found.')
            }
          } else {
            this.userInfo = null
            console.warn('No user signed in.')
          }
          resolve()
        })
      })
    },
    clearUserInfo() {
      this.userInfo = null // Clear user info on logout
    },
  },
})
