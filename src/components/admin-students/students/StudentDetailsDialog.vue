<template>
  <!-- drawer behaves like a right-side panel, closer to a layout drawer
       than a blocking dialog.  width set to 60vw, full height, overlay mode. -->
  <div v-if="opened" class="student-drawer-focus-backdrop" @click="opened = false" />

  <q-drawer
    v-model="opened"
    anchor="right"
    overlay
    :width="drawerWidth"
    transition-show="slide-right"
    transition-hide="slide-right"
    content-class="student-details-dialog"
    no-swipe-close
    style="z-index: 1001"
    class="student-drawer"
  >
    <q-card flat bordered elevated class="student-details-card" style="height: 100%">
      <!-- header row: title + actions -->
      <q-card-section class="row justify-between items-center">
        <div class="text-h4 card-title">Detalhes do Aluno</div>
        <div class="row items-center">
          <q-btn
            dense
            flat
            icon="edit"
            v-if="!isEditing"
            @click="isEditing = true"
            class="q-mr-sm"
          />
          <q-btn dense flat icon="close" @click="opened = false" />
        </div>
      </q-card-section>
      <p class="q-ml-md text-weight-light">ID: {{ studentId }}</p>

      <!-- student info / edit form -->
      <q-card-section v-if="!isEditing">
        <div class="student-info" v-if="student">
          <p><strong>Nome:</strong> {{ student.name }}</p>
          <p><strong>Livro:</strong> {{ student.book }}</p>
          <p><strong>Lição Atual:</strong> {{ student.currentLesson }}</p>
          <p>
            <strong>Turmas:</strong>
            {{
              Array.isArray(student.classIds)
                ? classStore.getClassNamesByIds(student.classIds)
                : student.classId
                  ? classStore.getClassNameById(student.classId)
                  : '—'
            }}
          </p>
        </div>
      </q-card-section>

      <q-card-section v-if="isEditing">
        <div class="student-edit-form">
          <q-input v-model="student.name" label="Nome" class="q-mb-sm" />
          <q-select
            v-model="student.book"
            :options="bookOptions"
            label="Livro"
            class="q-mb-sm"
            emit-value
            outlined
          />
          <q-select
            v-model="student.currentLesson"
            :options="lessonOptions"
            label="Lição Atual"
            class="q-mb-sm"
            emit-value
            outlined
            :disable="!lessonOptions.length"
          />
          <q-select
            v-model="student.classIds"
            :options="classOptions"
            label="Turmas"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            multiple
          />
          <div class="row q-gutter-sm q-pt-md">
            <q-btn label="Salvar" color="positive" @click="saveChanges" />
            <q-btn label="Cancelar" color="negative" flat @click="discardChanges" />
          </div>
        </div>
      </q-card-section>

      <!-- absences list -->
      <q-card-section>
        <div class="text-h5" style="display: inline-block">
          Faltas: {{ student?.totalAbsences ?? 0 }}
        </div>
        <q-btn
          dense
          flat
          size="sm"
          :label="showAbsences ? 'Ocultar' : 'Mostrar'"
          :icon="showAbsences ? 'visibility_off' : 'visibility'"
          @click="showAbsences = !showAbsences"
          class="q-ml-sm"
        />

        <q-spinner v-if="loadingAbsences && showAbsences" />
        <q-list v-else-if="showAbsences">
          <q-item v-for="absence in absences" :key="absence.id">
            <q-item-section>
              <q-item-label>{{ absence.formattedDate }}</q-item-label>
              <q-item-label caption>
                Turma: {{ classStore.getClassNameById(absence.classId) }}
              </q-item-label>
              <q-item-label caption>
                Motivo: {{ absence.reason || 'Nenhum motivo fornecido' }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-if="!loadingAbsences && absences.length === 0">
            <q-item-section>Nenhuma falta registrada.</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-separator />

      <!-- lessons table -->
      <q-card-section>
        <q-table
          class="excel-style-table"
          title="Lições do Aluno"
          :rows="lessons"
          :columns="columns"
          row-key="id"
          flat
          bordered
          dense
          separator="cell"
          :pagination="{ rowsPerPage: 0 }"
        >
        </q-table>
      </q-card-section>
    </q-card>
  </q-drawer>
</template>

<script setup>
import { computed, watch, ref, onMounted, onUnmounted } from 'vue'
import bookStructure from 'src/data/bookStructure.json'
import { useClassStore } from 'src/stores/classStore'
import { useStudentDetails } from 'src/composables/useStudentDetails'

const props = defineProps({
  studentId: String,
  modelValue: Boolean,
})
const emit = defineEmits(['update:modelValue'])

const opened = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

// inject reusable logic
const {
  studentId: sid,
  isEditing,
  student,
  lessons,
  absences,
  loadingAbsences,
  classOptions,
  showAbsences,
  saveChanges,
  discardChanges,
  loadAbsences,
} = useStudentDetails(props.studentId)

const classStore = useClassStore()

// book/lesson helpers for edit mode
const bookOptions = computed(() => Object.keys(bookStructure))
const lessonOptions = ref([])

// keep lesson options in sync with selected book
watch(
  () => student.value?.book,
  (book) => {
    if (book && bookStructure[book]) {
      lessonOptions.value = bookStructure[book]
      // ensure currentLesson remains valid
      if (!lessonOptions.value.includes(student.value.currentLesson)) {
        student.value.currentLesson = lessonOptions.value[0] || ''
      }
    } else {
      lessonOptions.value = []
      student.value.currentLesson = ''
    }
  },
)

// react to prop changes and re-load when dialog opens
watch(
  () => props.studentId,
  (id) => {
    sid.value = id
  },
)

watch(opened, (val) => {
  if (val && props.studentId) {
    // the composable will already reload when studentId changes
  }
})

// fetch absences only when the user requests them
watch(showAbsences, (val) => {
  if (val && props.studentId) {
    loadAbsences(props.studentId)
  }
})

// width in pixels approximating 60vw; kept reactive to handle viewport resizes
const drawerWidth = ref(0)
function updateWidth() {
  drawerWidth.value = Math.round(window.innerWidth * 0.6)
}
onMounted(() => {
  updateWidth()
  window.addEventListener('resize', updateWidth)
})
onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
})

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
  { name: 'notes', label: 'Anotações', field: 'notes', align: 'left' },
  { name: 'gradeF', label: 'F', field: 'gradeF', align: 'center' },
  { name: 'gradeA', label: 'A', field: 'gradeA', align: 'center' },
  { name: 'gradeL', label: 'L', field: 'gradeL', align: 'center' },
  { name: 'gradeE', label: 'E', field: 'gradeE', align: 'center' },
  { name: 'teacherName', label: 'Professor', field: 'teacherName', align: 'left' },
])
</script>

<style scoped>
.student-details-card {
  display: flex;
  flex-direction: column;
  margin: auto;
  /* card height/width are controlled inline via style, but we
     also ensure it stretches fully for safety */
  height: 100%;
  overflow-y: auto; /* allow scrolling when content overflows */
  overflow-x: auto; /* prevent horizontal growth */
  min-width: 0; /* allow flex parent to constrain width */
}

.student-drawer-focus-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000; /* sit behind the drawer (which is 1001) */
}

/* content-class hooked on the drawer container; no special rules
   are really required because q-drawer handles positioning, but we
   keep this class in case additional tweaks are needed. */
.student-details-dialog {
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}
.student-drawer {
  min-width: 0;
}

.student-edit-form {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-weight: bold;
  margin-bottom: 16px;
  align-self: center;
  text-align: center;
}

.student-info p {
  font-size: 1rem; /* Increased from default */
  margin: 4px 0;
}

.excel-style-table {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 1.1rem; /* Added larger font size */
  width: 100%;
  table-layout: fixed; /* force columns to share width */
  min-width: 0; /* don't force parent to expand */
}

.excel-style-table .q-td,
.excel-style-table .q-th {
  word-break: break-word;
  white-space: normal;
}

.excel-style-table .q-td,
.excel-style-table .q-th {
  border: 1px solid #ccc;
  padding: 8px;
  background-color: #fdfdfd;
}

.excel-style-table .q-tr:hover {
  background-color: #e0f7fa;
}

.grades-cell {
  display: flex;
  flex-direction: row;
  gap: 8px; /* Controls the space between grades */
}

.grades-cell > div {
  min-width: 32px;
  text-align: center;
  border-right: 1px solid #eee;
}

.grades-cell > div:last-child {
  border-right: none;
}
</style>
