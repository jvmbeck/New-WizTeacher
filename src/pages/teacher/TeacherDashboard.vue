<template>
  <div class="dashboard q-pa-md">
    <div class="text-h3 text-center q-mt-md">Welcome, teacher {{ teacherName }}!</div>

    <div class="query-container">
      <q-input
        v-model="searchQuery"
        label="Pesquisar dias ou horários"
        outlined
        debounce="300"
        rounded
        class="q-mt-sm query-input"
      >
        <template v-slot:append>
          <q-icon name="close" @click="searchQuery = ''" class="cursor-pointer" />
        </template>
        <template v-slot:before>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>

    <div class="list-container q-mt-md q-pa-sm">
      <div class="text-h3">Lista de Turmas</div>

      <q-tabs
        v-model="selectedTab"
        dense
        align="justify"
        indicator-color="primary"
        active-color="primary"
        class="q-mt-md full-width"
      >
        <q-tab name="myClasses" label="Minhas turmas" />
        <q-tab name="allClasses" label="Todas as turmas" />
      </q-tabs>

      <div class="text-subtitle2 text-weight-regular text-grey-9">
        Você está visualizando {{ displayedClasses.length }} turma(s).
      </div>

      <q-list bordered separator>
        <q-item v-if="isLoading">
          <q-item-section class="text-center">
            <q-spinner-dots color="primary" size="2em" />
          </q-item-section>
        </q-item>

        <q-item v-else-if="!displayedClasses.length">
          <q-item-section class="text-center text-grey-7">
            Nenhuma turma encontrada.
          </q-item-section>
        </q-item>

        <q-item
          v-for="classItem in filteredClasses"
          :key="classItem.id"
          clickable
          @click="$router.push({ name: 'ClassDetails', params: { id: classItem.id } })"
        >
          <q-item-section>
            <q-item-label
              ><strong> {{ classItem.className }}</strong>
            </q-item-label>
            <q-item-label class="text-subtitle2 text-weight-regular text-grey-9">
              Quantidade de alunos: {{ classItem.studentIds.length }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useUserStore } from 'src/stores/userStore.js'
import { useClassStore } from 'src/stores/classStore.js'

const classStore = useClassStore()
const userStore = useUserStore()
const teacherName = computed(() => userStore.userInfo?.name || '')
const searchQuery = ref('')
const teacherClasses = ref([])
const allClasses = ref([])
const selectedTab = ref('myClasses')
const isLoading = ref(false)
const hasLoadedAllClasses = ref(false)

async function loadClassesForCurrentTeacher() {
  const teacherId = userStore.userInfo?.uid

  if (!teacherId) {
    teacherClasses.value = []
    allClasses.value = []
    hasLoadedAllClasses.value = false
    return
  }

  isLoading.value = true

  try {
    teacherClasses.value = await classStore.fetchClassesForTeacher(teacherId)

    // Reset lazy-loaded cache when teacher context changes.
    allClasses.value = []
    hasLoadedAllClasses.value = false
  } catch (error) {
    console.error('Error loading classes for teacher dashboard:', error)
    teacherClasses.value = []
    allClasses.value = []
    hasLoadedAllClasses.value = false
  } finally {
    isLoading.value = false
  }
}

async function loadAllClassesIfNeeded() {
  if (hasLoadedAllClasses.value) return

  isLoading.value = true

  try {
    allClasses.value = await classStore.fetchClasses()
    hasLoadedAllClasses.value = true
  } catch (error) {
    console.error('Error loading all classes for teacher dashboard:', error)
    allClasses.value = []
  } finally {
    isLoading.value = false
  }
}

watch(
  () => userStore.userInfo,
  async () => {
    await loadClassesForCurrentTeacher()
  },
  { immediate: true }, // Run immediately if userInfo is already available
)

watch(
  () => selectedTab.value,
  async (tab) => {
    if (tab === 'allClasses') {
      await loadAllClassesIfNeeded()
    }
  },
)

const displayedClasses = computed(() =>
  selectedTab.value === 'allClasses' ? allClasses.value : teacherClasses.value,
)

const daySearchAliases = {
  0: ['domingo', 'dom'],
  1: ['segunda', 'segunda-feira', 'seg'],
  2: ['terca', 'terça', 'terca-feira', 'terça-feira', 'ter'],
  3: ['quarta', 'quarta-feira', 'qua'],
  4: ['quinta', 'quinta-feira', 'qui'],
  5: ['sexta', 'sexta-feira', 'sex'],
  6: ['sabado', 'sábado', 'sab'],
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const filteredClasses = computed(() => {
  if (!searchQuery.value) return displayedClasses.value

  const query = normalizeSearchText(searchQuery.value)
  return displayedClasses.value.filter((classItem) => {
    const daysMatch = Array.isArray(classItem.classDays)
      ? classItem.classDays.some((day) => {
          const dayNumber = Number(day)
          const aliases = daySearchAliases[dayNumber] || []
          return aliases.some((alias) => alias.includes(query))
        })
      : false

    const scheduleMatch = normalizeSearchText(classItem.schedule).includes(query)

    const classNameMatch = normalizeSearchText(classItem.className).includes(query)

    return daysMatch || scheduleMatch || classNameMatch
  })
})
</script>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.query-container {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
.list-container {
  display: flex;
  flex-direction: column;
  max-height: 70vh;
  width: 50vw;
  align-items: center;
  overflow-y: auto;
  margin-top: 16px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  font-size: 1.5rem;
}

/* Mobile / small screens */
@media (max-width: 600px) {
  .dashboard {
    padding: 12px;
  }

  .query-container {
    width: 100%;
    padding: 0 12px;
    margin-top: 12px;
  }

  .query-input {
    width: 100%;
  }

  .list-container {
    width: 95vw;
    max-height: 75vh;
    margin-top: 12px;
    font-size: 2rem;
    padding: 8px;
  }

  .list-container q-card-section {
    padding: 8px 12px;
  }

  .list-container .q-item-label {
    font-size: 0.95rem;
  }

  .list-container .q-item-label strong {
    font-size: 1.05rem;
  }

  .text-h3.text-center.q-mt-md {
    font-size: 1.25rem;
    text-align: center;
  }
}
</style>
