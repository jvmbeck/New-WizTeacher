<template>
  <q-layout view="hHh lpR fFf">
    <!-- Top App Bar -->
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title> WizTeacher </q-toolbar-title>

        <!-- Avatar with Dropdown Menu -->
        <q-btn round color="white" class="q-ml-md">
          <q-avatar size="32px">
            <img src="https://cdn.quasar.dev/logo-v2/svg/logo.svg" />
          </q-avatar>
          <q-menu>
            <q-card class="q-pt-md" style="min-width: 220px">
              <div class="q-pl-md row items-center q-mb-md">
                <q-avatar size="48px">
                  <img src="https://cdn.quasar.dev/logo-v2/svg/logo.svg" />
                </q-avatar>
                <div class="q-ml-md">
                  <div class="text-subtitle1">{{ userName }}</div>
                  <div class="text-caption text-grey text-capitalize">{{ userRole }}</div>
                </div>
              </div>
              <q-separator />
              <q-list>
                <q-item clickable v-close-popup @click="goToSettings">
                  <q-item-section avatar>
                    <q-icon name="settings" />
                  </q-item-section>
                  <q-item-section>Configurações</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="logout">
                  <q-item-section avatar>
                    <q-icon name="logout" />
                  </q-item-section>
                  <q-item-section>Sair</q-item-section>
                </q-item>
              </q-list>
            </q-card>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Main Content Area -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import AuthServices from 'src/services/AuthServices'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { useUserStore } from 'src/stores/userStore.js'

const userStore = useUserStore()
const userName = userStore.userInfo?.name || 'Usuário Desconhecido'
const userRole = userStore.userInfo?.role || 'Visitante'
const router = useRouter()

function goToSettings() {
  router.push('/settings')
}

function logout() {
  AuthServices.handleSignOut()
    .then(() => {
      Notify.create({
        type: 'positive',
        message: 'Logout realizado com sucesso!',
      })
      console.log('User logged out successfully')
      // Optionally clear user info from store or state
    })
    .catch((error) => {
      console.error('Error logging out:', error)
    })
  console.log('Logging out...')
  router.push('/')
}
</script>

<style scoped>
/* Optional styling */
</style>
