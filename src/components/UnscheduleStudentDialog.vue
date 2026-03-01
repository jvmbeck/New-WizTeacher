<template>
  <q-dialog v-model="dialogOpen">
    <q-card style="min-width: 520px">
      <q-card-section class="row items-center">
        <div class="text-h6">Desmarcar aulas</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">
          Aluno: <strong>{{ studentName || 'Selecionado' }}</strong>
        </div>
        <div class="text-caption text-grey-7 q-mb-sm">
          Selecione uma ou mais datas em que o aluno ficará desmarcado.
        </div>

        <q-date v-model="selectedDates" multiple mask="YYYY-MM-DD" minimal />
      </q-card-section>

      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Cancelar" v-close-popup />
        <q-btn flat label="Salvar" color="primary" :disable="!studentId" @click="handleSave" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import dayjs from 'dayjs'
import { unscheduleStudent } from 'src/services/students/index.js'
import { useClassStore } from 'src/stores/classStore'

const props = defineProps({
  classId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['saved', 'needsReplenishment'])

const $q = useQuasar()
const classStore = useClassStore()

const studentId = ref(null)
const studentName = ref('')
const selectedDates = ref([])
const dialogOpen = ref(false)

const classData = computed(() => classStore.classes.find((c) => c.id === props.classId) || null)

function open(student) {
  const sid = String(student.id || student.uid)
  studentId.value = sid
  studentName.value = student.name || ''
  const existingDates = getUnscheduledDatesForStudent(sid)
  selectedDates.value = Array.isArray(existingDates) ? existingDates : []
  dialogOpen.value = true
}

function getUnscheduledDatesForStudent(sid) {
  if (!classData.value) return []

  const studentIdStr = String(sid)
  const byDate = classData.value.unscheduledStudents || {}

  return Object.entries(byDate)
    .filter(
      ([, studentIds]) =>
        Array.isArray(studentIds) && studentIds.map((id) => String(id)).includes(studentIdStr),
    )
    .map(([dateKey]) => dateKey)
    .sort((a, b) => a.localeCompare(b))
}

function syncClassDateList(fieldName, studentIdValue, dateKey, isAddRecord) {
  if (!classData.value || !dateKey) return

  const source = classData.value[fieldName] || {}
  const nextByDate = { ...source }
  const currentList = Array.isArray(nextByDate[dateKey]) ? [...nextByDate[dateKey]] : []
  const sid = String(studentIdValue)

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
    id: props.classId,
    [fieldName]: nextByDate,
  })
}

async function handleSave() {
  if (!studentId.value) return

  // Ensure selectedDates is always an array (q-date might return null when all dates are unselected)
  const datesToSave = Array.isArray(selectedDates.value) ? selectedDates.value : []

  const result = await unscheduleStudent(props.classId, studentId.value, datesToSave)

  if (!result.success) {
    return $q.notify({ type: 'negative', message: 'Erro ao desmarcar aluno' })
  }

  result.addedDates.forEach((dateKey) => {
    syncClassDateList('unscheduledStudents', studentId.value, dateKey, true)
  })
  result.removedDates.forEach((dateKey) => {
    syncClassDateList('unscheduledStudents', studentId.value, dateKey, false)
  })

  if (result.addedDates.length === 0 && result.removedDates.length === 0) {
    dialogOpen.value = false
    return $q.notify({
      type: 'info',
      message: 'Nenhuma alteração nas datas desmarcadas.',
    })
  }

  dialogOpen.value = false
  selectedDates.value = []

  const addedCount = result.addedDates.length
  const removedCount = result.removedDates.length

  emit('saved', result)

  // Prompt for replenishment scheduling if new absences were added
  if (addedCount > 0) {
    emit('needsReplenishment', {
      studentId: studentId.value,
      studentName: studentName.value,
      missedDates: result.addedDates,
      classId: props.classId,
      className: classData.value?.className || 'Turma',
    })
  }

  if (addedCount > 0 && removedCount > 0) {
    return $q.notify({
      type: 'positive',
      message: `Datas atualizadas: ${addedCount} desmarcação(ões) adicionada(s) e ${removedCount} removida(s).`,
    })
  }

  if (addedCount > 0) {
    const firstDate = dayjs(result.addedDates[0]).format('DD/MM/YYYY')
    const lastDate = dayjs(result.addedDates[result.addedDates.length - 1]).format('DD/MM/YYYY')
    return $q.notify({
      type: 'positive',
      message:
        addedCount === 1
          ? `Aluno desmarcado para 1 aula (${firstDate}).`
          : `Aluno desmarcado para ${addedCount} aulas (${firstDate} até ${lastDate}).`,
    })
  }

  if (removedCount > 0) {
    return $q.notify({
      type: 'positive',
      message:
        removedCount === 1
          ? '1 data foi remarcada para o aluno.'
          : `${removedCount} datas foram remarcadas para o aluno.`,
    })
  }

  $q.notify({
    type: 'info',
    message: 'Nenhuma alteração nas datas desmarcadas.',
  })
}

// Expose the open method so parent can call it
defineExpose({
  open,
})
</script>
