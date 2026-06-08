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

      <!-- ── Contract section ──────────────────────────────────────────── -->
      <q-card-section class="q-pt-none">
        <q-separator class="q-mb-sm" />
        <div class="row items-center q-mb-xs">
          <span class="text-subtitle1 text-weight-medium">Contrato</span>
          <q-space />
          <q-spinner v-if="loadingContracts" size="xs" class="q-mr-sm" />
          <template v-if="!loadingContracts">
            <q-btn
              dense
              flat
              round
              icon="add_circle_outline"
              color="primary"
              title="Novo contrato"
              @click="openCreateContract"
            />
            <q-btn
              dense
              flat
              round
              icon="edit"
              color="secondary"
              title="Editar contrato atual"
              :disable="!currentContract"
              @click="openEditContract"
            />
            <q-btn
              dense
              flat
              round
              icon="history"
              color="grey-7"
              title="Todos os contratos"
              :disable="!contracts.length"
              @click="historyDialogOpen = true"
            />
          </template>
        </div>

        <!-- Contract selector (shown when student has more than one contract) -->
        <q-select
          v-if="contracts.length > 1"
          :model-value="selectedContractId"
          :options="
            contracts.map((c) => ({
              label: `${c.contractNumber || c.id} — ${c.book} (${c.status})`,
              value: c.id,
            }))
          "
          label="Contrato selecionado"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          dense
          outlined
          class="q-mb-sm"
          @update:model-value="selectContract"
        />

        <!-- Active contract metadata -->
        <div v-if="currentContract" class="contract-meta q-pa-sm rounded-borders q-mb-sm">
          <div class="row q-col-gutter-sm">
            <div class="col-6 col-sm-4">
              <div class="text-caption text-grey-7">Nº Contrato</div>
              <div class="text-body2">{{ currentContract.contractNumber || '—' }}</div>
            </div>
            <div class="col-6 col-sm-4">
              <div class="text-caption text-grey-7">Livro</div>
              <div class="text-body2">{{ currentContract.book || '—' }}</div>
            </div>
            <div class="col-6 col-sm-4">
              <div class="text-caption text-grey-7">Lição Atual</div>
              <div class="text-body2">{{ currentContract.currentLesson || '—' }}</div>
            </div>
            <div class="col-6 col-sm-4">
              <div class="text-caption text-grey-7">Início</div>
              <div class="text-body2">
                {{
                  currentContract.startDate
                    ? dayjs(currentContract.startDate).format('DD/MM/YYYY')
                    : '—'
                }}
              </div>
            </div>
            <div class="col-6 col-sm-4">
              <div class="text-caption text-grey-7">Término Prev.</div>
              <div class="text-body2">
                {{
                  currentContract.endDate
                    ? dayjs(currentContract.endDate).format('DD/MM/YYYY')
                    : '—'
                }}
              </div>
            </div>
            <div v-if="currentContract.isPartB" class="col-6 col-sm-4">
              <div class="text-caption text-grey-7">Troca do Livro</div>
              <div class="text-body2">
                {{
                  currentContract.exchangeDate
                    ? dayjs(currentContract.exchangeDate).format('DD/MM/YYYY')
                    : '—'
                }}
              </div>
            </div>
            <div class="col-6 col-sm-4">
              <div class="text-caption text-grey-7">Faltas (contrato)</div>
              <div class="text-body2">{{ currentContract.totalAbsences ?? 0 }}</div>
            </div>
            <div class="col-6 col-sm-4">
              <div class="text-caption text-grey-7">Reposições (contrato)</div>
              <div class="text-body2">{{ currentContract.pendingReplenishments ?? 0 }}</div>
            </div>
            <div class="col-6 col-sm-4">
              <div class="text-caption text-grey-7">Status</div>
              <q-badge
                :color="currentContract.status === 'active' ? 'positive' : 'grey'"
                :label="currentContract.status"
              />
            </div>
          </div>
        </div>
        <div v-else-if="!loadingContracts" class="text-grey-6 text-caption q-mt-xs">
          Nenhum contrato ativo. Clique em <q-icon name="add_circle_outline" size="xs" /> para
          criar.
        </div>
      </q-card-section>

      <q-separator />
      <q-card-section>
        <div class="text-h5" style="display: inline-block">
          Faltas:
          {{
            selectedContractId
              ? (currentContract?.totalAbsences ?? 0)
              : (student?.totalAbsences ?? 0)
          }}
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

      <!-- replenishments list -->
      <q-card-section>
        <div class="text-h5" style="display: inline-block">
          Reposições:
          {{
            selectedContractId
              ? (currentContract?.pendingReplenishments ?? 0)
              : (student?.pendingReplenishments ?? 0)
          }}
        </div>
        <q-btn
          dense
          flat
          size="sm"
          :label="showReplenishments ? 'Ocultar' : 'Mostrar'"
          :icon="showReplenishments ? 'visibility_off' : 'visibility'"
          @click="showReplenishments = !showReplenishments"
          class="q-ml-sm"
        />

        <q-spinner v-if="loadingReplenishments && showReplenishments" />
        <q-list v-else-if="showReplenishments">
          <q-item v-for="replenishment in replenishments" :key="replenishment.id">
            <q-item-section>
              <q-item-label>{{
                dayjs(replenishment.replenishmentDate).format('DD/MM/YYYY')
              }}</q-item-label>
              <q-item-label caption>
                Turma: {{ classStore.getClassNameById(replenishment.replenishmentClassId) }}
              </q-item-label>
              <q-item-label caption v-if="replenishment.notes">
                Notas: {{ replenishment.notes }}
              </q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-if="!loadingReplenishments && replenishments.length === 0">
            <q-item-section>Nenhuma reposição registrada.</q-item-section>
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
          :table-row-class-fn="lessonRowClass"
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

  <!-- Contract create/edit dialog -->
  <CreateOrEditContractDialog
    v-model="contractDialogOpen"
    :contract="editingContract"
    :student-current-lesson="student?.currentLesson"
    @saved="handleContractSaved"
  />

  <!-- Contracts history dialog -->
  <ContractsHistoryDialog
    v-model="historyDialogOpen"
    :contracts="contracts"
    @set-active="handleSetActive"
  />
</template>

<script setup>
import { computed, watch, ref, onMounted, onUnmounted } from 'vue'
import dayjs from 'dayjs'
import bookStructure from 'src/data/bookStructure.json'
import { useClassStore } from 'src/stores/classStore'
import { useStudentStore } from 'src/stores/studentStore'
import { useStudentDetails } from 'src/composables/useStudentDetails'
import {
  getPendingReplenishments,
  fetchReplenishmentsByContract,
} from 'src/services/students/index.js'
import CreateOrEditContractDialog from './CreateOrEditContractDialog.vue'
import ContractsHistoryDialog from './ContractsHistoryDialog.vue'

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
  contracts,
  selectedContractId,
  currentContract,
  loadingContracts,
  selectContract,
  loadContracts,
} = useStudentDetails(props.studentId)

const classStore = useClassStore()
const studentStore = useStudentStore()

// contract dialog state
const contractDialogOpen = ref(false)
const historyDialogOpen = ref(false)
const editingContract = ref(null)

// book/lesson helpers for edit mode
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
    showReplenishments.value = false
  },
)

watch(opened, (val) => {
  if (val && props.studentId) {
    // composable will already reload when studentId changes
  }
})

// fetch absences only when the user requests them — now contract-scoped
watch(showAbsences, (val) => {
  if (val && props.studentId) {
    loadAbsences(props.studentId)
  }
})

// reload absences when selected contract changes and absences are visible
watch(selectedContractId, () => {
  if (showAbsences.value && props.studentId) {
    loadAbsences(props.studentId)
  }
  // reset replenishments so they are refetched on next toggle
  showReplenishments.value = false
  replenishments.value = []
})

// replenishments state and logic
const showReplenishments = ref(false)
const replenishments = ref([])
const loadingReplenishments = ref(false)

async function loadReplenishments(studentId) {
  if (!studentId) return
  loadingReplenishments.value = true
  try {
    // Use contract-scoped query when a contract is selected
    if (selectedContractId.value) {
      const data = await fetchReplenishmentsByContract(studentId, selectedContractId.value)
      replenishments.value = data || []
    } else {
      const data = await getPendingReplenishments(studentId)
      replenishments.value = data || []
    }
  } catch (error) {
    console.error('Error loading replenishments:', error)
    replenishments.value = []
  } finally {
    loadingReplenishments.value = false
  }
}

// fetch replenishments only when the user requests them
watch(showReplenishments, (val) => {
  if (val && props.studentId) {
    loadReplenishments(props.studentId)
  }
})

// contract dialog helpers
function openCreateContract() {
  editingContract.value = null
  contractDialogOpen.value = true
}
function openEditContract() {
  editingContract.value = currentContract.value
  contractDialogOpen.value = true
}

async function handleContractSaved({ isEdit, payload, contractId }) {
  if (!props.studentId) return
  try {
    if (isEdit && contractId) {
      // If close fields are included, close the contract
      if (payload.closeStatus) {
        await studentStore.closeContract(props.studentId, contractId, {
          status: payload.closeStatus,
          finalLesson: payload.finalLesson || null,
          reasonForEnd: payload.reasonForEnd || null,
        })
        // Update the contract fields as well
        const contractUpdates = { ...payload }
        delete contractUpdates.closeStatus
        delete contractUpdates.finalLesson
        delete contractUpdates.reasonForEnd
        await studentStore.updateContract(contractId, contractUpdates)
      } else {
        await studentStore.updateContract(contractId, payload)
      }
    } else {
      await studentStore.createContract(props.studentId, payload)
    }
    // Reload contracts list and lessons
    await loadContracts(props.studentId)
  } catch (err) {
    console.error('Error saving contract:', err)
  }
}

async function handleSetActive(contract) {
  if (!props.studentId) return
  try {
    await studentStore.setActiveContract(props.studentId, contract.id)
    await loadContracts(props.studentId)
    historyDialogOpen.value = false
  } catch (err) {
    console.error('Error setting active contract:', err)
  }
}

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

.excel-style-table :deep(.placeholder-lesson-row) {
  background-color: var(--placeholder-lesson);
}

.excel-style-table :deep(.placeholder-lesson-row .q-td) {
  color: #7c848d;
}

.excel-style-table :deep(.notes-cell) {
  max-width: 260px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
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
