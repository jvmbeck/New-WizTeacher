<template>
  <q-page padding>
    <q-btn to="/AdminDashboard/classList" label="Voltar" color="primary" class="q-mb-md" />

    <q-card>
      <StudentDetailsDialog v-model="isDetailsOpen" :student-id="detailStudentId" />

      <q-card-section>
        <div class="text-h4 text-center">{{ classData.className }}</div>
        <div class="q-mb-sm">
          <q-badge label="Visualizando data: " v-if="proxyDate" class="q-mr-sm text-subtitle2">{{
            proxyDate
          }}</q-badge>
          <q-btn icon="event" round color="primary">
            <q-popup-proxy
              @before-show="updateProxy"
              cover
              transition-show="scale"
              transition-hide="scale"
            >
              <q-date v-model="proxyDate" mask="YYYY-MM-DD">
                <div class="row items-center justify-end q-gutter-sm">
                  <q-btn label="Cancel" color="primary" flat v-close-popup />
                  <q-btn label="OK" color="primary" flat @click="save" v-close-popup />
                </div>
              </q-date>
            </q-popup-proxy>
          </q-btn>
        </div>

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
        label="Gerenciar reposições"
        color="primary"
        @click="openAddReplenishmentStudentDialog()"
        class="q-mb-md"
      />

      <q-card-section>
        <div class="text-subtitle1 q-mb-sm text-weight-bold">Alunos</div>

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
                  label="Desmarcar aulas"
                  flat
                  color="negative"
                  icon="event_busy"
                  @click="openUnscheduleDialog(student)"
                >
                  <q-tooltip>Selecionar datas para desmarcar</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="student.isReplenishment"
                  label="Editar reposição"
                  flat
                  color="primary"
                  icon="event"
                  @click="openAddReplenishmentStudentDialog(student.id)"
                >
                  <q-tooltip>Editar datas de reposição</q-tooltip>
                </q-btn>
                <q-btn
                  v-if="student.isMainStudent"
                  class="waiting-list"
                  label="Lista de espera"
                  flat
                  icon="schedule"
                  @click="moveStudentToWaitingList(student)"
                >
                  <q-tooltip>Mover aluno para lista de espera</q-tooltip>
                </q-btn>
              </div>
            </q-item-section>
          </q-item>

          <q-item v-if="students.length === 0">
            <q-item-section>Nenhum aluno encontrado.</q-item-section>
          </q-item>
        </q-list>

        <div class="text-subtitle1 q-mb-sm q-mt-md text-weight-bold">Lista de Espera</div>

        <q-list bordered>
          <q-item v-for="student in waitingListStudents" :key="`waiting-${student.id}`">
            <q-item-section>
              <q-item-label>{{ student.name }}</q-item-label>
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
                  label="Restaurar para turma"
                  flat
                  color="positive"
                  icon="person_add"
                  @click="restoreStudentToClass(student)"
                >
                  <q-tooltip>Remover da lista de espera e voltar para turma</q-tooltip>
                </q-btn>
              </div>
            </q-item-section>
          </q-item>

          <q-item v-if="waitingListStudents.length === 0">
            <q-item-section>Nenhum aluno na lista de espera.</q-item-section>
          </q-item>
        </q-list>
      </q-card-section>
    </q-card>

    <!-- Add Student Dialog -->
    <q-dialog v-model="isAddDialogOpen">
      <q-card style="min-width: 500px">
        <q-card-section class="row items-center">
          <div class="text-h6">Selecione o aluno que deseja adicionar</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-gutter-md">
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
            @update:model-value="onReplenishmentStudentChange"
          >
            <template v-slot:no-option>
              <q-item>
                <q-item-section class="text-grey"> Nenhum aluno encontrado </q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-date v-model="selectedReplenishmentDates" multiple mask="YYYY-MM-DD" minimal />

          <div class="text-caption text-grey-7">
            Selecione uma ou mais datas de reposição para o aluno escolhido.
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            flat
            label="Salvar"
            color="primary"
            :disable="!selectedStudentId"
            @click="saveReplenishmentSelection"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <UnscheduleStudentDialog
      ref="unscheduleDialogRef"
      :class-id="classId"
      @needs-replenishment="handleNeedsReplenishment"
    />

    <ScheduleReplenishmentDialog
      ref="replenishmentDialogRef"
      :available-classes="classStore.classes"
    />

    <UpdateClassDialog v-model="editDialog" :class-id="classId" :class-data="classData" />
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'
import StudentDetailsDialog from 'src/components/admin-students/students/StudentDetailsDialog.vue'
import dayjs from 'dayjs'
import ClassServices from 'src/services/classes/ClassServices.js'
import { addStudentToWaitingList, restoreStudentFromWaitingList } from 'src/services/classes'
import { setReplenishmentDatesForStudent } from 'src/services/students/index.js'
import { getNextClassDayKey } from 'src/utils/dateHelpers.js'
import UpdateClassDialog from 'src/components/UpdateClassDialog.vue'
import UnscheduleStudentDialog from 'src/components/UnscheduleStudentDialog.vue'
import ScheduleReplenishmentDialog from 'src/components/ScheduleReplenishmentDialog.vue'
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
const visualizedDate = ref(null)

watch(
  nextClassDateKey,
  (newDateKey) => {
    if (!visualizedDate.value) {
      visualizedDate.value = newDateKey
    }
  },
  { immediate: true },
)

const proxyDate = ref(visualizedDate.value)
function updateProxy() {
  proxyDate.value = visualizedDate.value
}

function save() {
  visualizedDate.value = String(proxyDate.value || '').replaceAll('/', '-') || null
  editDialog.value = false
}

const editDialog = ref(false)
const isAddDialogOpen = ref(false)
const isAddReplenishmentDialogOpen = ref(false)
const selectedStudentId = ref(null)
const selectedReplenishmentDates = ref([])
// details dialog state
const detailStudentId = ref(null)
const isDetailsOpen = ref(false)
const unscheduleDialogRef = ref(null)
const replenishmentDialogRef = ref(null)
const availableStudents = ref([]) // { label: 'Name', value: 'id' }
const filteredStudents = ref([])

const mainStudentIds = computed(() =>
  Array.isArray(classData.value?.studentIds) ? classData.value.studentIds : [],
)
const waitingListIds = computed(() =>
  Array.isArray(classData.value?.waitingList) ? classData.value.waitingList : [],
)
const unscheduledIds = computed(() =>
  classData.value
    ? ClassServices.getUnscheduledForNextClass(classData.value, visualizedDate.value)
    : [],
)
const replenishmentIds = computed(() =>
  classData.value
    ? ClassServices.getReplenishmentsForNextClass(classData.value, visualizedDate.value)
    : [],
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
        isMainStudent: mainStudentIds.value.map(String).includes(sid),
        isUnscheduled: unscheduledIds.value.includes(sid),
        isReplenishment: replenishmentIds.value.includes(sid),
      }
    })
    .filter((student) => student !== null)
})

const waitingListStudents = computed(() => {
  const byId = new Map(
    studentList.value.map((student) => {
      const sid = String(student.id || student.uid)
      return [sid, student]
    }),
  )

  return waitingListIds.value
    .map((id) => {
      const sid = String(id)
      const found = byId.get(sid)
      if (!found) return null

      return {
        ...found,
        id: found.id || found.uid || sid,
      }
    })
    .filter((student) => student !== null)
})

function updateLocalStudentClassIds(studentId, shouldAddClass) {
  const sid = String(studentId)
  const idx = studentList.value.findIndex((student) => String(student.id || student.uid) === sid)
  if (idx === -1) return

  const student = studentList.value[idx]
  const currentClassIds = Array.isArray(student.classIds) ? student.classIds.map(String) : []

  if (shouldAddClass) {
    if (!currentClassIds.includes(String(classId))) {
      studentList.value[idx] = {
        ...student,
        classIds: [...currentClassIds, String(classId)],
      }
    }
    return
  }

  studentList.value[idx] = {
    ...student,
    classIds: currentClassIds.filter((id) => id !== String(classId)),
  }
}

async function moveStudentToWaitingList(student) {
  const sid = String(student.id || student.uid)

  try {
    await addStudentToWaitingList(classId, sid)

    const nextStudentIds = mainStudentIds.value.map(String).filter((id) => id !== sid)
    const nextWaitingList = Array.from(new Set([...waitingListIds.value.map(String), sid]))

    classStore.updateClassInStore({
      id: classId,
      studentIds: nextStudentIds,
      waitingList: nextWaitingList,
    })

    updateLocalStudentClassIds(sid, false)

    $q.notify({
      type: 'positive',
      message: 'Aluno movido para lista de espera.',
    })
  } catch (error) {
    console.error('Erro ao mover aluno para lista de espera:', error)
    $q.notify({
      type: 'negative',
      message: 'Não foi possível mover o aluno para a lista de espera.',
    })
  }
}

async function restoreStudentToClass(student) {
  const sid = String(student.id || student.uid)

  try {
    await restoreStudentFromWaitingList(classId, sid)

    const nextStudentIds = Array.from(new Set([...mainStudentIds.value.map(String), sid]))
    const nextWaitingList = waitingListIds.value.map(String).filter((id) => id !== sid)

    classStore.updateClassInStore({
      id: classId,
      studentIds: nextStudentIds,
      waitingList: nextWaitingList,
    })

    updateLocalStudentClassIds(sid, true)

    $q.notify({
      type: 'positive',
      message: 'Aluno restaurado para turma.',
    })
  } catch (error) {
    console.error('Erro ao restaurar aluno da lista de espera:', error)
    $q.notify({
      type: 'negative',
      message: 'Não foi possível restaurar o aluno para a turma.',
    })
  }
}

function openAddStudentDialog() {
  fetchAvailableStudents('addClass')
  filteredStudents.value = availableStudents.value
  isAddDialogOpen.value = true
  selectedStudentId.value = null
}

function openAddReplenishmentStudentDialog(studentId = null) {
  fetchAvailableStudents('replenishment')

  if (studentId) {
    const sid = String(studentId)
    const selectedStudent = studentList.value.find(
      (student) => String(student.id || student.uid) === sid,
    )

    if (selectedStudent) {
      const option = {
        label: selectedStudent.name,
        value: selectedStudent.id || selectedStudent.uid,
      }

      const hasOption = availableStudents.value.some((entry) => String(entry.value) === sid)
      if (!hasOption) {
        availableStudents.value = [option, ...availableStudents.value]
      }
    }

    selectedStudentId.value = sid
    selectedReplenishmentDates.value = getReplenishmentDatesForStudent(sid)
  } else {
    selectedStudentId.value = null
    selectedReplenishmentDates.value = []
  }

  filteredStudents.value = availableStudents.value
  isAddReplenishmentDialogOpen.value = true
}

function openUnscheduleDialog(student) {
  unscheduleDialogRef.value?.open(student)
}

function handleNeedsReplenishment(data) {
  $q.dialog({
    title: 'Agendar Reposição',
    message: `${data.studentName} faltará ${data.missedDates.length} aula(s). Deseja agendar reposição agora?`,
    cancel: { label: 'Depois', color: 'grey' },
    ok: { label: 'Sim, agendar', color: 'primary' },
  }).onOk(() => {
    replenishmentDialogRef.value?.open(data)
  })
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

function getReplenishmentDatesForStudent(studentId) {
  if (!classData.value) return []

  const sid = String(studentId)
  const byDate = classData.value.replenishmentStudents || {}

  return Object.entries(byDate)
    .filter(([, studentIds]) => Array.isArray(studentIds) && studentIds.map(String).includes(sid))
    .map(([dateKey]) => dateKey)
    .sort((a, b) => a.localeCompare(b))
}

function onReplenishmentStudentChange(studentId) {
  if (!studentId) {
    selectedReplenishmentDates.value = []
    return
  }

  selectedReplenishmentDates.value = getReplenishmentDatesForStudent(studentId)
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

const saveReplenishmentSelection = async () => {
  if (!selectedStudentId.value) return

  const datesToSave = Array.isArray(selectedReplenishmentDates.value)
    ? selectedReplenishmentDates.value
    : []

  const result = await setReplenishmentDatesForStudent(
    classId,
    selectedStudentId.value,
    datesToSave,
  )

  if (!result.success) {
    return $q.notify({ type: 'negative', message: 'Erro ao salvar reposições' })
  }

  result.addedDates.forEach((dateKey) => {
    syncClassDateList('replenishmentStudents', selectedStudentId.value, dateKey, true)
  })

  result.removedDates.forEach((dateKey) => {
    syncClassDateList('replenishmentStudents', selectedStudentId.value, dateKey, false)
  })

  if (result.addedDates.length === 0 && result.removedDates.length === 0) {
    isAddReplenishmentDialogOpen.value = false
    selectedStudentId.value = null
    selectedReplenishmentDates.value = []
    return $q.notify({
      type: 'info',
      message: 'Nenhuma alteração nas reposições.',
    })
  }

  isAddReplenishmentDialogOpen.value = false
  selectedStudentId.value = null
  selectedReplenishmentDates.value = []

  const addedCount = result.addedDates.length
  const removedCount = result.removedDates.length

  if (addedCount > 0 && removedCount > 0) {
    return $q.notify({
      type: 'positive',
      message: `Reposições atualizadas: ${addedCount} adicionada(s) e ${removedCount} removida(s).`,
    })
  }

  if (addedCount > 0) {
    return $q.notify({
      type: 'positive',
      message:
        addedCount === 1
          ? '1 data de reposição adicionada.'
          : `${addedCount} datas de reposição adicionadas.`,
    })
  }

  return $q.notify({
    type: 'positive',
    message:
      removedCount === 1
        ? '1 data de reposição removida.'
        : `${removedCount} datas de reposição removidas.`,
  })
}

function fetchAvailableStudents(mode = 'addClass') {
  try {
    const currentClassIds = new Set(mainStudentIds.value.map((id) => String(id)))

    const source =
      mode === 'replenishment'
        ? studentList.value
        : studentList.value.filter((student) => {
            const sid = String(student.id || student.uid)
            return !currentClassIds.has(sid)
          })

    availableStudents.value = source
      .map((student) => ({
        label: student.name || student.studentName || 'Aluno sem nome',
        value: student.id || student.uid,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

    filteredStudents.value = availableStudents.value
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
  fetchAvailableStudents('addClass')
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

.waiting-list {
  color: var(--waiting-list-color);
  font-weight: bold;
}
</style>
