<template>
  <q-dialog v-model="dialogOpen" maximized>
    <q-card class="lessons-dialog-card">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ studentName }}</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="dialogOpen = false" />
      </q-card-section>

      <q-card-section class="table-section">
        <div v-if="loadingLessons" class="row justify-center q-pa-lg">
          <q-spinner size="40px" color="primary" />
        </div>

        <div v-else class="table-scroll-wrapper">
          <q-table
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
            :table-style="tableStyle"
          >
            <template #body-cell-notes="slotProps">
              <q-td :props="slotProps" class="notes-cell">
                <div class="notes-content">{{ normalizeNotes(slotProps.value) }}</div>
              </q-td>
            </template>
          </q-table>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useStudentDetails } from 'src/composables/useStudentDetails'

const $q = useQuasar()
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

function normalizeNotes(value) {
  if (!value) return '—'

  return (
    String(value)
      .replace(/\u00A0/g, ' ')
      // Break very long unspaced tokens to avoid visual spill into adjacent columns.
      .replace(/([^\s-]{24})(?=[^\s-])/g, '$1\u200B')
  )
}

const isMobileTable = computed(() => $q.screen.lt.md)
const tableStyle = computed(() =>
  isMobileTable.value
    ? {
        width: 'max-content',
        minWidth: '100%',
      }
    : {
        width: '100%',
      },
)

const columns = computed(() => [
  {
    name: 'lessonNumber',
    label: 'Lição',
    field: 'lessonNumber',
    align: 'left',
    classes: 'nowrap-cell',
    headerClasses: 'nowrap-cell',
  },
  {
    name: 'completedAt',
    label: isMobileTable.value ? 'Data' : 'Concluído em',
    field: (row) =>
      row.completedAt?.toDate
        ? new Date(row.completedAt.toDate()).toLocaleDateString('pt-BR')
        : '—',
    align: 'left',
    classes: 'nowrap-cell',
    headerClasses: 'nowrap-cell',
  },
  {
    name: 'homeworkPages',
    label: isMobileTable.value ? 'Hw' : 'Homework',
    field: (row) => (row.noHomework ? 'não entregou' : (row.homeworkPages || []).join(', ') || '—'),
    align: 'left',
  },
  {
    name: 'notes',
    label: isMobileTable.value ? 'Anot.' : 'Anotações',
    field: 'notes',
    align: 'left',
    classes: 'notes-cell',
    headerClasses: 'notes-cell',
    style: isMobileTable.value
      ? 'width: 180px; min-width: 180px; max-width: 180px'
      : 'width: 280px; min-width: 280px; max-width: 280px',
    headerStyle: isMobileTable.value
      ? 'width: 180px; min-width: 180px; max-width: 180px'
      : 'width: 280px; min-width: 280px; max-width: 280px',
  },
  {
    name: 'gradeF',
    label: 'F',
    field: 'gradeF',
    align: 'center',
    style: isMobileTable.value ? 'width: 44px; min-width: 44px; max-width: 44px' : '',
    headerStyle: isMobileTable.value ? 'width: 44px; min-width: 44px; max-width: 44px' : '',
  },
  {
    name: 'gradeA',
    label: 'A',
    field: 'gradeA',
    align: 'center',
    style: isMobileTable.value ? 'width: 44px; min-width: 44px; max-width: 44px' : '',
    headerStyle: isMobileTable.value ? 'width: 44px; min-width: 44px; max-width: 44px' : '',
  },
  {
    name: 'gradeL',
    label: 'L',
    field: 'gradeL',
    align: 'center',
    style: isMobileTable.value ? 'width: 44px; min-width: 44px; max-width: 44px' : '',
    headerStyle: isMobileTable.value ? 'width: 44px; min-width: 44px; max-width: 44px' : '',
  },
  {
    name: 'gradeE',
    label: 'E',
    field: 'gradeE',
    align: 'center',
    style: isMobileTable.value ? 'width: 44px; min-width: 44px; max-width: 44px' : '',
    headerStyle: isMobileTable.value ? 'width: 44px; min-width: 44px; max-width: 44px' : '',
  },
  {
    name: 'teacherName',
    label: isMobileTable.value ? 'Prof.' : 'Professor',
    field: 'teacherName',
    align: 'left',
    classes: 'nowrap-cell',
    headerClasses: 'nowrap-cell',
  },
])
</script>

<style scoped>
.lessons-dialog-card {
  width: min(96vw, 1400px);
  margin: auto;
}

.excel-style-table {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 1rem;
  width: max-content;
  min-width: 100%;
  table-layout: auto;
}

.table-section {
  min-width: 0;
}

.table-scroll-wrapper {
  width: 100%;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 1023px) {
  .table-scroll-wrapper {
    overflow-x: auto;
  }
}

@media (max-width: 1023px) {
  .excel-style-table {
    font-size: 0.86rem;
  }
}

:deep(.excel-style-table .q-td),
:deep(.excel-style-table .q-th) {
  word-break: normal;
  white-space: normal;
  border: 1px solid #ccc;
  padding: 8px;
}

@media (max-width: 1023px) {
  :deep(.excel-style-table .q-td),
  :deep(.excel-style-table .q-th) {
    padding: 4px 6px;
  }
}

.excel-style-table :deep(.placeholder-lesson-row .q-td) {
  opacity: 0.8;
}

.excel-style-table :deep(.notes-cell) {
  width: 280px;
  min-width: 280px;
  max-width: 280px;
  background: inherit;
  color: inherit;
  overflow: hidden;
}

.notes-content {
  display: block;
  width: 100%;
  max-width: 100%;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  background: inherit;
  color: inherit;
  overflow: hidden;
}

@media (max-width: 1023px) {
  .excel-style-table :deep(.notes-cell) {
    width: 180px;
    min-width: 180px;
    max-width: 180px;
  }
}

.excel-style-table :deep(.nowrap-cell) {
  white-space: nowrap;
  word-break: normal;
  overflow-wrap: normal;
}
</style>
