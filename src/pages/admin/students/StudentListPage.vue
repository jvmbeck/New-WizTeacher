<template>
  <q-page padding>
    <div class="buttons-container">
      <q-btn class="btns" to="/AdminDashboard" label="Início" />
      <q-input
        v-model="searchQuery"
        label="Digite nome do aluno, livro ou turma"
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
      <q-btn class="btns" @click="isDialogOpen = true">Adicionar Aluno</q-btn>
      <q-btn class="btns" @click="RefreshList" icon="refresh" />
    </div>

    <q-card>
      <q-card-section>
        <div class="text-h6">Lista de alunos</div>
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="filteredStudents"
          :columns="columns"
          row-key="id"
          flat
          bordered
          :filter="searchQuery"
          :pagination="{ rowsPerPage: 0 }"
          separator="cell"
        >
          <template v-slot:body-cell-actions="props">
            <q-td class="text-right">
              <q-btn
                icon="info"
                color="secondary"
                round
                dense
                @click="openDetailsDialog(props.row.uid)"
                class="q-ml-xs"
              />
              <q-btn
                flat
                icon="delete"
                color="negative"
                @click="confirmDelete(props.row)"
                class="q-ml-sm"
              />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <CreateStudentDialog v-model="isDialogOpen" @create="handleCreateStudent"></CreateStudentDialog>
    <StudentDetailsDialog v-model="isDetailsOpen" :student-id="selectedStudentId" />
  </q-page>
</template>

<script setup>
import { useStudentStore } from 'src/stores/studentStore'
import { useClassStore } from 'src/stores/classStore'
import { onMounted, computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { storeToRefs } from 'pinia'
import CreateStudentDialog from 'src/components/admin-students/students/CreateStudentDialog.vue'
import StudentDetailsDialog from 'src/components/admin-students/students/StudentDetailsDialog.vue'

function openDetailsDialog(studentId) {
  selectedStudentId.value = studentId
  isDetailsOpen.value = true
}

const $q = useQuasar()

const isDialogOpen = ref(false)
const isDetailsOpen = ref(false)
const selectedStudentId = ref(null)

const handleCreateStudent = async (newStudent) => {
  try {
    console.log('Creating student:', newStudent.name)
    await studentStore.createStudent(newStudent)
    $q.notify({ type: 'positive', message: 'Aluno criado com sucesso' })
    isDialogOpen.value = false
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Falha ao criar aluno' })
  }
}

const confirmDelete = (student) => {
  console.log('Student to delete:', student) // ✅ check if student is defined
  console.log('Student ID:', student.uid) // ✅ check if id exists

  $q.dialog({
    title: 'Confirmar Exclusão',
    message: `Tem certeza de que deseja desativar o acesso do aluno(a) ${student.name}?    OBS: funcionalidade não implementada`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      // call store action which will update remote and local state
      await studentStore.deleteStudent(student.uid || student.id)
      $q.notify({ type: 'positive', message: 'Aluno excluído com sucesso' })
    } catch (error) {
      console.error(error)
      $q.notify({ type: 'negative', message: 'Falha ao excluir aluno' })
    }
  })
}

const studentStore = useStudentStore()
const classStore = useClassStore()

const { students } = storeToRefs(studentStore)
const { classMap } = storeToRefs(classStore)

onMounted(async () => {
  await classStore.fetchClasses()
  await studentStore.fetchStudents()
})

const searchQuery = ref('')

const filteredStudents = computed(() => {
  const query = searchQuery.value.toLowerCase()

  return students.value
    .map((student) => {
      const classIds = Array.isArray(student.classIds)
        ? student.classIds
        : student.classId
          ? [student.classId]
          : []

      const classNames = classIds.map((id) => classMap.value[id] || '—').join(', ')

      return {
        ...student,
        classes: classNames,
      }
    })
    .filter((student) => {
      const name = student.name?.toLowerCase() || ''
      const book = student.book?.toLowerCase() || ''
      const classNames = student.classes.toLowerCase()

      return name.includes(query) || book.includes(query) || classNames.includes(query)
    })
})

const RefreshList = async () => {
  await studentStore.refreshStudentsArray()
}

const columns = [
  { name: 'name', label: 'Nome', field: 'name', sortable: true },
  { name: 'book', label: 'Livro', field: 'book', sortable: true },
  { name: 'currentLesson', label: 'Lição Atual', field: 'currentLesson', sortable: true },
  { name: 'totalAbsences', label: 'Faltas', field: 'totalAbsences', sortable: true },
  { name: 'classes', label: 'Turmas', field: 'classes', sortable: false },
  { name: 'actions', label: '', field: 'id' },
]
</script>

<style scoped>
.buttons-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 16px;
}

.list-query {
  width: 35vw;
}

.btns {
  background-color: var(--header-bg);
  color: var(--header-text-color);
}
</style>
