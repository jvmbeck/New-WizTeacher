import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { auth } from './key/configKey.js'
import { onAuthStateChanged } from 'firebase/auth'
import { useUserStore } from './stores/user'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

onAuthStateChanged(auth, async (user) => {
  const userStore = useUserStore()

  if (user) {
    await userStore.loadUserInfo()
    const role = userStore.userInfo?.role

    if (role === 'admin') {
      router.push({ name: 'AdminDashboard' })
    } else if (role === 'teacher') {
      router.push({ name: 'TeacherDashboard' })
    } else {
      router.push({ name: 'LoginPage' })
    }
  } else {
    router.push({ name: 'LoginPage' })
  }
})

app.mount('#app')
