<template>
  <q-layout view="hHh lpR fFf">
    <!-- Top App Bar -->
    <q-header elevated>
      <q-toolbar class="toolbar-shell">
        <q-btn flat no-caps class="title-btn" label="WizTeacher" @click="goToMainDashboard" />

        <q-toolbar-title>
          <div v-if="isAdmin" class="nav-pill-group">
            <q-btn
              v-for="item in mainNavItems"
              :key="item.label"
              unelevated
              no-caps
              class="nav-pill"
              :label="item.label"
              :to="item.to"
            />
          </div>
        </q-toolbar-title>

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
import { computed } from 'vue'
import AuthServices from 'src/services/AuthServices'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { useUserStore } from 'src/stores/userStore.js'

const userStore = useUserStore()
const userName = computed(() => userStore.userInfo?.name || 'Usuário Desconhecido')
const userRole = computed(() => userStore.userInfo?.role || 'Visitante')
const router = useRouter()

const isAdmin = computed(() => userRole.value === 'admin')

const mainNavItems = [
  { label: 'Alunos', to: { name: 'StudentList' } },
  { label: 'Professores', to: { name: 'teacherList' } },
  { label: 'Turmas', to: { name: 'classList' } },
]

function goToMainDashboard() {
  if (userRole.value === 'admin') {
    router.push({ name: 'AdminDashboard' })
    return
  }

  router.push({ name: 'TeacherDashboard' })
}

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
.toolbar-shell {
  gap: 12px;
}

.title-btn {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.3px;
  border-radius: 12px;
  padding: 6px 10px;
}

.nav-pill-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-pill {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-weight: 600;
  padding: 0 12px;
}

.nav-pill:hover {
  background: rgba(255, 255, 255, 0.3);
}

@media (max-width: 900px) {
  .nav-pill-group {
    display: none;
  }
}
</style>
