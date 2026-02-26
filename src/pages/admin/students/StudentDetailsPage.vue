<template>
  <q-page padding>
    <q-btn to="/AdminDashboard/studentList" label="Voltar" color="primary" class="q-mb-md" />
    <q-card flat bordered class="student-details-card">
      <q-card-section v-if="!isEditing">
        <div class="text-h4 card-title">Detalhes do Aluno</div>
        <q-btn @click="isEditing = true">
          <q-icon name="edit" class="q-mr-sm" />
          Editar
        </q-btn>
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
          <q-input v-model="student.book" label="Livro" class="q-mb-sm" />
          <q-input v-model="student.currentLesson" label="Lição Atual" class="q-mb-sm" />
          <q-select
            v-model="student.classIds"
            :options="classOptions"
            label="Turmas"
            option-label="label"
            option-value="value"
            emit-value
            multiple
          />
          <div class="row q-gutter-sm q-pt-md">
            <q-btn label="Salvar" color="positive" @click="saveChanges" />
            <q-btn label="Cancelar" color="negative" flat @click="discardChanges" />
          </div>
        </div>
      </q-card-section>
      <q-card-section>
        <div class="text-h5" style="display: inline-block">Faltas: {{ absences.length }}</div>
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
  </q-page>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from 'src/key/configKey.js'
import { useQuasar } from 'quasar'
import { useClassStore } from 'src/stores/classStore'
import { storeToRefs } from 'pinia'
import { useStudentStore } from 'src/stores/studentStore'

const studentStore = useStudentStore()
const $q = useQuasar()
const route = useRoute()
const classStore = useClassStore()
const { classMap } = storeToRefs(classStore)

const studentId = route.params.studentId
const isEditing = ref(false)
const student = ref(null)
const lessons = ref([])
const absences = ref([])
const loadingAbsences = ref(true)
const className = ref('')
const classOptions = ref([])
const showAbsences = ref(false)

// Fetch Absences
async function fetchStudentAbsences(studentId) {
  try {
    console.log('Fetching absences for ID:', studentId)

    // Make sure classes are loaded
    await classStore.fetchClasses()

    const absencesQuery = query(collection(db, 'absences'), where('studentId', '==', studentId))
    const querySnapshot = await getDocs(absencesQuery)

    absences.value = querySnapshot.docs
      .map((doc) => {
        const data = doc.data()
        const [year, month, day] = data.date.split('-')

        // Format to dd/mm/yy (take last 2 digits of year)
        const formattedDate = `${day}/${month}/${year.slice(-2)}`

        return {
          id: doc.id,
          ...data,
          formattedDate, // 👈 add this field for display
        }
      })
      .sort((a, b) => b.date.localeCompare(a.date)) // sort newest → oldest
    console.log('Absences:', absences.value)
  } catch (error) {
    console.error('Error fetching absences:', error)
  } finally {
    loadingAbsences.value = false
  }
}

// Fetch Student Info + Lessons
async function fetchStudentData(studentId) {
  try {
    console.log('Fetching student data for ID:', studentId)

    studentStore.fetchStudentById(studentId).then(async (studentData) => {
      if (studentData) {
        student.value = studentData

        // Normalize `classIds` so the model contains primitive ids (strings).
        // This allows the `QSelect` with `emit-value` to display labels
        // while keeping the model as an array of ids.
        student.value.classIds = Array.isArray(student.value.classIds)
          ? student.value.classIds.map((c) =>
              c && typeof c === 'object' ? (c.value ?? c.id ?? c) : c,
            )
          : []

        // If any stored values are actually class labels, map them to
        // the corresponding option `value` (id) so the select shows labels.
        if (classOptions.value && classOptions.value.length) {
          student.value.classIds = student.value.classIds.map((cid) => {
            // already an id matching an option
            const byValue = classOptions.value.find((o) => o.value === cid)
            if (byValue) return byValue.value
            // maybe stored as label; find option with same label
            const byLabel = classOptions.value.find((o) => o.label === cid)
            if (byLabel) return byLabel.value
            return cid
          })
        }

        console.log('DEBUG student.classIds after normalize:', student.value.classIds)

        // Fetch class name if classId exists
        className.value = student.value.classId
          ? classMap.value[student.value.classId] || student.value.classId
          : ''
      } else {
        console.error('No such student found in Firestore!')
      }
      const lessonsRef = collection(db, 'students', studentId, 'lessons')
      const lessonSnaps = await getDocs(lessonsRef)

      lessons.value = lessonSnaps.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    })
  } catch (error) {
    console.error('Error fetching student data:', error)
  }
}
// Watch for route change
watch(
  () => route.params.studentId,
  async (id) => {
    console.log('ROUTE PARAM studentId:', id)
    if (id) {
      // Load classes first so we can map any stored class *names*
      // to their IDs when normalizing student.classIds.
      await classStore.fetchClasses()
      classOptions.value = classStore.classes.map((cls) => ({
        label: cls.name || 'Unnamed Class',
        value: cls.id,
      }))
      console.log('DEBUG classOptions:', classOptions.value)

      await fetchStudentData(id)
      await fetchStudentAbsences(id)
    } else {
      console.warn('No studentId found in route params')
    }
  },
  { immediate: true },
)

const saveChanges = async () => {
  studentStore
    .updateStudent(studentId, student.value)
    .then(() => {
      isEditing.value = false
      $q.notify({ type: 'positive', message: 'Aluno atualizado com sucesso' })
    })
    .catch((error) => {
      console.error('Error updating student:', error)
      $q.notify({ type: 'negative', message: 'Falha ao atualizar aluno' })
    })
}

const discardChanges = () => {
  isEditing.value = false
  fetchStudentData(studentId)
}

onMounted(async () => {
  await classStore.fetchClasses()
})

const columns = [
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
  { name: 'notes', label: 'Anotações', field: 'notes', align: 'left' },
  { name: 'gradeF', label: 'F', field: 'gradeF', align: 'center' },
  { name: 'gradeA', label: 'A', field: 'gradeA', align: 'center' },
  { name: 'gradeL', label: 'L', field: 'gradeL', align: 'center' },
  { name: 'gradeE', label: 'E', field: 'gradeE', align: 'center' },
  { name: 'teacherName', label: 'Professor', field: 'teacherName', align: 'left' },
]
</script>

<style scoped>
.student-details-card {
  display: flex;
  flex-direction: column;
  margin: auto;
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
