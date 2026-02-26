<template>
  <q-btn @click="handleSignOut" class="q-mt-md">
    <q-icon name="logout" />
    <q-tooltip anchor="top middle" self="bottom middle"> Logout </q-tooltip>
  </q-btn>
</template>

<script setup>
import { useUserStore } from 'src/stores/userStore.js'
import AuthServices from 'src/services/AuthServices.js'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const router = useRouter()

const handleSignOut = async () => {
  AuthServices.handleSignOut().then(() => {
    userStore.clearUserInfo() // Clear user info from the store
    router.push({ name: 'LoginPage' }) // Redirect to LoginPage
  })
}
</script>
