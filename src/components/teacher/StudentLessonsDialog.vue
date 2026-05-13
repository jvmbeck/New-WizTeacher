<template>
  <q-dialog v-model="dialogOpen" maximized>
    <q-card style="max-width: 960px; width: 100%; margin: auto">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ studentName }}</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="dialogOpen = false" />
      </q-card-section>

      <q-card-section>
        <div v-if="loadingLessons" class="row justify-center q-pa-lg">
          <q-spinner size="40px" color="primary" />
        </div>

        <q-table
          v-else
          class="excel-style-table"
          title="Lições"
          :rows="lessons"
          :columns="columns"
          row-key="id"
          :table-row-class-fn="lessonRowClass"
          flat
          bordered
          dense
          separator="cell"
          :pagination="{ rowsPerPage: 0 }"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStudentDetails } from 'src/composables/useStudentDetails'

const { lessons, load } = useStudentDetails(null)

const dialogOpen = ref(false)
const loadingLessons = ref(false)
const studentName = ref('')

async function open(student) {
  studentName.value = student.name || ''
  dialogOpen.value = true
  loadingLessons.value = true
  try {
    await load(student.uid)
  } finally {
    loadingLessons.value = false
  }
}

defineExpose({ open })

function isPlaceholderLesson(row) {
  return String(row?.id || '').startsWith('placeholder_')
}

function lessonRowClass(row) {
  return isPlaceholderLesson(row) ? 'placeholder-lesson-row' : ''
}

const columns = computed(() => [
  { name: 'lessonNumber', label: 'Lição', field: 'lessonNumber', align: 'left' },
  {
    name: 'completedAt',
    label: 'Concluído em',
    field: (row) =>
      row.completedAt?.toDate
        ? new Date(row.completedAt.toDate()).toLocaleDateString('pt-BR')
        : '—',
    align: 'left',
  },
  {
    name: 'homeworkPages',
    label: 'Homework',
    field: (row) => (row.noHomework ? 'não entregou' : (row.homeworkPages || []).join(', ') || '—'),
    align: 'left',
  },
  {
    name: 'notes',
    label: 'Anotações',
    field: 'notes',
    align: 'left',
    classes: 'notes-cell',
    headerClasses: 'notes-cell',
    style: 'max-width: 260px',
    headerStyle: 'max-width: 260px',
  },
  { name: 'gradeF', label: 'F', field: 'gradeF', align: 'center' },
  { name: 'gradeA', label: 'A', field: 'gradeA', align: 'center' },
  { name: 'gradeL', label: 'L', field: 'gradeL', align: 'center' },
  { name: 'gradeE', label: 'E', field: 'gradeE', align: 'center' },
  { name: 'teacherName', label: 'Professor', field: 'teacherName', align: 'left' },
])
</script>

<style scoped>
.excel-style-table {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 1rem;
  width: 100%;
  table-layout: fixed;
}

.excel-style-table .q-td,
.excel-style-table .q-th {
  word-break: break-word;
  white-space: normal;
  border: 1px solid #ccc;
  padding: 8px;
  background-color: #fdfdfd;
}

.excel-style-table .q-tr:hover {
  background-color: #e0f7fa;
}

.excel-style-table :deep(.placeholder-lesson-row .q-td) {
  background-color: #f6f7f8;
  color: #7c848d;
}

.excel-style-table :deep(.notes-cell) {
  max-width: 260px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
</style>
