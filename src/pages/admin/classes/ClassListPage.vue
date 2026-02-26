<template>
  <q-page padding>
    <div class="buttons-container">
      <q-btn to="/AdminDashboard" label="Início" />
      <q-input
        v-model="searchQuery"
        label="Buscar por nome da turma, professor ou tipo de aula"
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
      <q-btn label="Criar Turma" @click="openCreateClassDialog" />
    </div>

    <q-card>
      <q-card-section>
        <div class="text-h6">Lista de Turmas</div>
      </q-card-section>
      <q-card-section>
        <q-table
          :rows="filteredClassList"
          :columns="columns"
          row-key="id"
          flat
          bordered
          :filter="searchQuery"
          :loading="loading"
          loading-label="Carregando turmas..."
          separator="cell"
          :pagination="{ rowsPerPage: 0 }"
        >
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn
                icon="info"
                color="secondary"
                round
                dense
                @click="goToClassDetailsPage(props.row.id)"
                class="q-ml-xs"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <CreateClassDialog v-model="isCreateClassDialogOpen" @classCreated="fetchClassList" />
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { db } from 'src/key/configKey'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'vue-router'
import CreateClassDialog from 'src/components/CreateClassDialog.vue'

const router = useRouter()
const classList = ref([])
const loading = ref(true)
const isCreateClassDialogOpen = ref(false)

const goToClassDetailsPage = (classId) => {
  router.push({ name: 'classDetailsAdmin', params: { classId: classId } })
}

const openCreateClassDialog = () => {
  isCreateClassDialogOpen.value = true
}

const searchQuery = ref('')
const filteredClassList = computed(() => {
  if (!searchQuery.value) return classList.value

  const q = searchQuery.value.toLowerCase()

  return classList.value.filter(
    (c) =>
      c.className?.toLowerCase().includes(q) ||
      c.teacherName?.toLowerCase().includes(q) ||
      c.classType?.toLowerCase().includes(q),
  )
})

async function fetchClassList() {
  const querySnapshot = await getDocs(collection(db, 'classes'))
  const classPromises = querySnapshot.docs.map(async (docSnap) => {
    const data = docSnap.data()
    let teacherName = 'Desconhecido'

    // Get teacher name if available
    if (data.teacherId) {
      const teacherRef = doc(db, 'users', data.teacherId)
      const teacherSnap = await getDoc(teacherRef)
      if (teacherSnap.exists()) {
        teacherName = teacherSnap.data().name
      }
    }

    return {
      id: docSnap.id,
      ...data,
      teacherName,
      studentCount: Array.isArray(data.studentIds) ? data.studentIds.length : 0,
    }
  })

  classList.value = await Promise.all(classPromises)
}

const columns = [
  { name: 'className', label: 'Nome da Turma', align: 'left', field: 'className' },
  { name: 'teacherName', label: 'Professor', align: 'left', field: 'teacherName' },
  { name: 'classType', label: 'Tipo de Aula', align: 'left', field: 'classType' },
  { name: 'studentCount', label: 'Qtd. de Alunos', align: 'center', field: 'studentCount' },
  { name: 'actions', label: 'Ações', align: 'center', field: 'actions' },
]

onMounted(async () => {
  try {
    loading.value = true
    await fetchClassList()
    console.log('Turmas carregadas:', classList.value)
  } catch (err) {
    console.error('Erro ao buscar turmas:', err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.buttons-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 16px;
}
</style>
