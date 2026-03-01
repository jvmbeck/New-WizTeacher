<template>
  <q-dialog v-model="dialogOpen">
    <q-card style="min-width: 620px; max-width: 800px">
      <q-card-section class="row items-center">
        <div class="text-h6">Agendar Reposições</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">
          Aluno: <strong>{{ studentName }}</strong>
        </div>
        <div class="text-caption text-grey-7 q-mb-md">
          O aluno faltará {{ missedDates.length }} aula(s). Selecione as datas de reposição abaixo.
        </div>

        <q-list bordered separator>
          <q-item v-for="(missedDate, index) in missedDates" :key="missedDate">
            <q-item-section>
              <q-item-label class="text-weight-medium">
                Aula perdida: {{ formatDate(missedDate) }}
              </q-item-label>
              <q-item-label caption>
                {{ className }}
              </q-item-label>
            </q-item-section>

            <q-item-section side>
              <div class="column q-gutter-sm" style="min-width: 280px">
                <q-select
                  v-model="replenishments[index].classId"
                  :options="classOptions"
                  label="Turma de reposição"
                  option-label="label"
                  option-value="value"
                  emit-value
                  map-options
                  outlined
                  dense
                  :rules="[(val) => !!val || 'Obrigatório']"
                >
                  <template v-slot:prepend>
                    <q-icon name="school" />
                  </template>
                </q-select>

                <q-input
                  v-model="replenishments[index].date"
                  label="Data de reposição"
                  type="date"
                  outlined
                  dense
                  :rules="[(val) => !!val || 'Obrigatório']"
                >
                  <template v-slot:prepend>
                    <q-icon name="event" />
                  </template>
                </q-input>

                <q-input
                  v-model="replenishments[index].notes"
                  label="Observações (opcional)"
                  outlined
                  dense
                  placeholder="Ex: Horário diferente"
                />
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancelar" v-close-popup />
        <q-btn flat label="Pular agora" color="grey" @click="skipReplenishments" />
        <q-btn
          flat
          label="Agendar Reposições"
          color="primary"
          :disable="!canSave"
          @click="handleSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar, Loading } from 'quasar'
import dayjs from 'dayjs'
import { scheduleReplenishment } from 'src/services/students/index.js'

const props = defineProps({
  availableClasses: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['saved'])

const $q = useQuasar()

const dialogOpen = ref(false)
const studentId = ref(null)
const studentName = ref('')
const missedDates = ref([])
const classId = ref(null)
const className = ref('')
const replenishments = ref([])

const classOptions = computed(() => {
  return props.availableClasses.map((cls) => ({
    label: cls.className || `Turma ${cls.id}`,
    value: cls.id,
  }))
})

const canSave = computed(() => {
  return replenishments.value.every(
    (r) => r.date && r.date.trim() !== '' && r.classId && r.classId.trim() !== '',
  )
})

function open(data) {
  studentId.value = data.studentId
  studentName.value = data.studentName
  missedDates.value = data.missedDates || []
  classId.value = data.classId
  className.value = data.className || 'Turma'

  // Initialize replenishment entries for each missed date
  replenishments.value = missedDates.value.map((missedDate) => ({
    missedDate,
    classId: classId.value, // Default to same class
    date: '',
    notes: '',
  }))

  dialogOpen.value = true
}

function formatDate(dateKey) {
  return dayjs(dateKey).format('DD/MM/YYYY')
}

function skipReplenishments() {
  dialogOpen.value = false
  $q.notify({
    type: 'info',
    message: 'Reposições não agendadas. Você pode agendá-las depois.',
  })
}

async function handleSave() {
  if (!canSave.value) return

  const promises = replenishments.value.map((replenishment) => {
    return scheduleReplenishment({
      studentId: studentId.value,
      studentName: studentName.value,
      missedDate: replenishment.missedDate,
      replenishmentClassId: replenishment.classId,
      replenishmentDate: replenishment.date,
      notes: replenishment.notes,
    })
  })

  Loading.show({ message: 'Agendando reposições...' })

  try {
    const results = await Promise.all(promises)
    const successCount = results.filter((r) => r.success).length
    const failCount = results.length - successCount

    Loading.hide()
    dialogOpen.value = false

    emit('saved', { successCount, failCount })

    if (failCount === 0) {
      $q.notify({
        type: 'positive',
        message: `${successCount} reposição(ões) agendada(s) com sucesso!`,
      })
    } else {
      $q.notify({
        type: 'warning',
        message: `${successCount} agendada(s), ${failCount} falharam.`,
      })
    }
  } catch (error) {
    Loading.hide()
    console.error('Error scheduling replenishments:', error)
    $q.notify({
      type: 'negative',
      message: 'Erro ao agendar reposições.',
    })
  }
}

defineExpose({
  open,
})
</script>
