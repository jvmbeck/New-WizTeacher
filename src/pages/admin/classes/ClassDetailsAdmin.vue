<template>
  <q-page padding>
    <q-btn to="/AdminDashboard/classList" label="Voltar" color="primary" class="q-mb-md" />

    <q-card>
      <StudentDetailsDialog v-model="isDetailsOpen" :student-id="detailStudentId" />

      <q-card-section>
        <div class="text-h4 text-center">{{ classData.className }}</div>
        <div class="text-h5">
          Detalhes da Turma <q-btn icon="edit" @click="editDialog = true" />
        </div>
        <div v-if="classData">
          <p>
            <strong>Dias:</strong>
            {{ classData.classDays.map((d) => dayNamesMap[d] || d).join(', ') }}
          </p>
          <p>
            <strong>Próxima aula: </strong>
            <span v-if="nextClassDateFormatted"
              >Dia {{ nextClassDateDay }} ({{ nextClassDateFormatted }})</span
            >
            <span v-else>Não foi possível determinar</span>
          </p>
          <p><strong>Horário:</strong> {{ classData.schedule }}</p>
          <p><strong>Duração:</strong> {{ classData.classDuration }} minutos</p>
          <p><strong>Professor:</strong> {{ teacherName }}</p>
          <p><strong>Tipo de Turma:</strong> {{ classData.classType }}</p>
          <p><strong>Quantidade de Alunos:</strong> {{ students.length }}</p>
        </div>
      </q-card-section>

      <q-separator />

      <q-btn
        label="Adicionar aluno à turma"
        color="primary"
        @click="openAddStudentDialog()"
        class="q-mb-md"
      />
      <q-btn
        label="Adicionar aluno de reposição à turma"
        color="primary"
        @click="openAddReplenishmentStudentDialog()"
        class="q-mb-md"
      />

      <q-card-section>
        <div class="text-subtitle1">Alunos</div>
        <q-list bordered>
          <q-item v-for="student in students" :key="student.id">
            <q-item-section>
              <q-item-label
                >{{ student.name }}
                <q-badge v-if="student.isReplenishment" color="orange" class="q-ml-sm">
                  Reposição
                </q-badge>

                <q-badge v-if="student.isUnscheduled" color="grey" class="q-ml-sm">
                  Desmarcado
                </q-badge></q-item-label
              >
              <q-item-label caption>ID: {{ student.id }}</q-item-label>
            </q-item-section>

            <q-item-section side>
              <div class="row q-gutter-sm">
                <q-btn
                  label="Ver detalhes"
                  flat
                  color="primary"
                  icon="visibility"
                  @click="openStudentDialog(student.id)"
                >
                  <q-tooltip>Ver detalhes</q-tooltip>
                </q-btn>

                <q-btn
                  v-if="!student.isReplenishment"
                  label="Desmarcar próxima aula"
                  flat
                  color="negative"
                  icon="event_busy"
                  @click="addUnscheduledStudentToClass(classId, student.id)"
                >
                  <q-tooltip>Desmarcar próxima aula</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="student.isReplenishment"
                  label="Remover reposição"
                  flat
                  color="negative"
                  icon="event_busy"
                  @click="addReplenishmentStudentToClass(classId, student.id)"
                >
                  <q-tooltip>Desmarcar próxima aula</q-tooltip>
                </q-btn>
              </div>
            </q-item-section>
          </q-item>

          <q-item v-if="students.length === 0">
            <q-item-section>Nenhum aluno encontrado.</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- Add Student Dialog -->
    <q-dialog v-model="isAddDialogOpen">
      <q-card style="min-width: 500px">
        <q-card-section class="row items-center">
          <div class="text-h6">Selecionar Aluno</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-select
            v-model="selectedStudentId"
            :options="filteredStudents"
            label="Aluno"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            dense
            filled
            use-input
            hide-selected
            fill-input
            input-debounce="0"
            @filter="filterStudents"
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"> Nenhum aluno encontrado </q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            flat
            label="Adicionar"
            color="primary"
            :disable="!selectedStudentId"
            @click="addStudentToClass"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <!-- Add Replenishment Student Dialog -->
    <q-dialog v-model="isAddReplenishmentDialogOpen">
      <q-card style="min-width: 500px">
        <q-card-section class="row items-center">
          <div class="text-h6">Selecionar Aluno</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <q-select
            v-model="selectedStudentId"
            :options="filteredStudents"
            label="Aluno"
            option-label="label"
            option-value="value"
            emit-value
            map-options
            dense
            filled
            use-input
            hide-selected
            fill-input
            input-debounce="0"
            @filter="filterStudents"
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"> Nenhum aluno encontrado </q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            flat
            label="Adicionar"
            color="primary"
            :disable="!selectedStudentId"
            @click="addReplenishmentStudentToClass(classId, selectedStudentId)"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <UpdateClassDialog v-model="editDialog" :class-id="classId" :class-data="classData" />
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import StudentDetailsDialog from 'src/components/admin-students/students/StudentDetailsDialog.vue'
import dayjs from 'dayjs'
import ClassServices from 'src/services/ClassServices.js'
import { unscheduleStudent, addReplenishmentStudent } from 'src/services/students/index.js'
import { getNextClassDayKey } from 'src/utils/dateHelpers.js'
import UpdateClassDialog from 'src/components/UpdateClassDialog.vue'
import { useClassStore } from 'src/stores/classStore'
import { useTeacherStore } from 'src/stores/teacherStore'
import { useStudentStore } from 'src/stores/studentStore'
import { storeToRefs } from 'pinia'

// helper for day names
const dayNamesMap = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}

const nextClassDateKey = computed(() => {
  if (!classData.value) return null
  return getNextClassDayKey(classData.value)
})

const nextClassDateFormatted = computed(() => {
  if (!nextClassDateKey.value) return null
  // Format as DD/MM/YYYY
  return dayjs(nextClassDateKey.value).format('DD/MM/YYYY')
})

const nextClassDateDay = computed(() => {
  if (!nextClassDateKey.value) return null
  return dayjs(nextClassDateKey.value).date()
})

const route = useRoute()
const $q = useQuasar()
const classId = route.params.classId

const classStore = useClassStore()
const teacherStore = useTeacherStore()
const studentStore = useStudentStore()
const { students: studentList } = storeToRefs(studentStore)
const classData = computed(() => classStore.classes.find((c) => c.id === classId) || null)
const teacherName = computed(() =>
  classData.value ? teacherStore.getTeacherNameById(classData.value.teacherId) : '',
)

const editDialog = ref(false)
const isAddDialogOpen = ref(false)
const isAddReplenishmentDialogOpen = ref(false)
const selectedStudentId = ref(null)
// details dialog state
const detailStudentId = ref(null)
const isDetailsOpen = ref(false)
const availableStudents = ref([]) // { label: 'Name', value: 'id' }
const filteredStudents = ref([])

const mainStudentIds = computed(() =>
  Array.isArray(classData.value?.studentIds) ? classData.value.studentIds : [],
)
const unscheduledIds = computed(() =>
  classData.value ? ClassServices.getUnscheduledForNextClass(classData.value) : [],
)
const replenishmentIds = computed(() =>
  classData.value ? ClassServices.getReplenishmentsForNextClass(classData.value) : [],
)

const allStudentIds = computed(() =>
  Array.from(
    new Set([...mainStudentIds.value, ...unscheduledIds.value, ...replenishmentIds.value]),
  ),
)

const students = computed(() => {
  const byId = new Map(
    studentList.value.map((student) => {
      const sid = String(student.id || student.uid)
      return [sid, student]
    }),
  )

  return allStudentIds.value
    .map((id) => {
      const sid = String(id)
      const found = byId.get(sid)
      if (!found) return null

      return {
        ...found,
        id: found.id || found.uid || sid,
        isUnscheduled: unscheduledIds.value.includes(sid),
        isReplenishment: replenishmentIds.value.includes(sid),
      }
    })
    .filter((student) => student !== null)
})

function openAddStudentDialog() {
  fetchAvailableStudents()
  isAddDialogOpen.value = true
  selectedStudentId.value = null
}

function openAddReplenishmentStudentDialog() {
  fetchAvailableStudents()
  isAddReplenishmentDialogOpen.value = true
  selectedStudentId.value = null
}

function openStudentDialog(studentId) {
  detailStudentId.value = studentId
  isDetailsOpen.value = true
}

function syncClassDateList(fieldName, studentId, dateKey, isAddRecord) {
  if (!classData.value || !dateKey) return

  const source = classData.value[fieldName] || {}
  const nextByDate = { ...source }
  const currentList = Array.isArray(nextByDate[dateKey]) ? [...nextByDate[dateKey]] : []
  const sid = String(studentId)

  if (isAddRecord) {
    if (!currentList.includes(sid)) currentList.push(sid)
  } else {
    const idx = currentList.indexOf(sid)
    if (idx !== -1) currentList.splice(idx, 1)
  }

  if (currentList.length) {
    nextByDate[dateKey] = currentList
  } else {
    delete nextByDate[dateKey]
  }

  classStore.updateClassInStore({
    id: classId,
    [fieldName]: nextByDate,
  })
}
/*
async function removeStudentFromClass(classId, studentId) {
  $q.dialog({
    title: 'Remover aluno',
    message: 'Tem certeza que deseja remover este aluno da turma?',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await StudentServices.removeStudentFromClass(classId, studentId)
      isDialogOpen.value = false
      selectedStudent.value = null
      await fetchClassDetails(classData.value.studentIds || [])
      $q.notify({
        type: 'positive',
        message: 'Aluno removido da turma com sucesso!',
      })
    } catch (err) {
      console.error('Erro ao remover aluno da turma:', err)
      $q.notify({
        type: 'negative',
        message: 'Erro ao remover aluno.',
      })
    }
  })
}*/

const addStudentToClass = async () => {
  if (!selectedStudentId.value) return

  try {
    await ClassServices.addStudentToClassAdmin(classId, selectedStudentId.value)
    classStore.syncStudentClassMembership(selectedStudentId.value, [], [classId])
    isAddDialogOpen.value = false
    selectedStudentId.value = null
    fetchAvailableStudents()
  } catch (err) {
    console.error('Erro ao adicionar aluno à turma:', err)
  }
}

const addUnscheduledStudentToClass = async (classId, studentId) => {
  const result = await unscheduleStudent(classId, studentId)

  if (!result.success) {
    return $q.notify({ type: 'negative', message: 'Erro ao desmarcar aluno' })
  }

  syncClassDateList('unscheduledStudents', studentId, result.date, result.isAddRecord)

  const date = dayjs(result.date).format('DD/MM/YYYY')

  $q.notify({
    type: 'positive',
    message: result.isAddRecord
      ? `Aluno desmarcado para data ${date}`
      : `Desmarcação removida para data ${date}`,
  })
}

const addReplenishmentStudentToClass = async (classId, studentId) => {
  const result = await addReplenishmentStudent(classId, studentId)

  if (!result.success) {
    return $q.notify({ type: 'negative', message: 'Erro ao atualizar reposição' })
  }

  syncClassDateList('replenishmentStudents', studentId, result.date, result.isAddRecord)

  const date = dayjs(result.date).format('DD/MM/YYYY')

  $q.notify({
    type: 'positive',
    message: result.isAddRecord
      ? `Reposição marcada para data ${date}`
      : `Reposição desmarcada para data ${date}`,
  })
  isAddReplenishmentDialogOpen.value = false
}

function fetchAvailableStudents() {
  try {
    const filtered = studentList.value.filter((student) => {
      const ids = Array.isArray(student.classIds)
        ? student.classIds
        : student.classId
          ? [student.classId]
          : []

      return ids.length === 0
    })

    availableStudents.value = filtered.map((student) => ({
      label: student.name,
      value: student.id || student.uid,
    }))
  } catch (error) {
    console.error('Failed to prepare available students:', error)
  }
}

onMounted(async () => {
  await Promise.all([
    classStore.fetchClasses(),
    teacherStore.fetchTeachers(),
    studentStore.fetchStudents(),
  ])
  fetchAvailableStudents()
})

function filterStudents(val, update) {
  if (val === '') {
    update(() => {
      filteredStudents.value = availableStudents.value
    })
    return
  }

  update(() => {
    const needle = val.toLowerCase()
    filteredStudents.value = availableStudents.value.filter(
      (student) => student.label.toLowerCase().indexOf(needle) > -1,
    )
  })
}
</script>

<style scoped>
.my-table {
  max-height: 300px;
  width: 30vw;
  overflow-y: auto;
  align-self: center;
  margin: 0 auto;
}

.student-details-card {
  display: flex;
  flex-direction: column;
  min-width: 35vw;
}
.grades-cell {
  display: flex;
  flex-direction: row;
}
.grades-cell > div {
  min-width: 32px;
  text-align: center;
  border-right: 1px solid #eee;
  margin-right: 8px;
}
.grades-cell > div:last-child {
  border-right: none;
  margin-right: 0;
}
</style>
