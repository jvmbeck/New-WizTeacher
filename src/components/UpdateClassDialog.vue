<template>
  <q-dialog v-model="isOpen">
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">Edit Class</div>
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <q-select
          v-model="form.classDays"
          label="Dia da Semana"
          :options="daysOfWeek"
          multiple
          emit-value
          map-options
          dense
        />
        <q-input v-model="form.schedule" mask="time" label="Horário" lazy-rules>
          <template v-slot:append>
            <q-icon name="access_time" class="cursor-pointer">
              <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                <q-time v-model="form.schedule">
                  <div class="row items-center justify-end">
                    <q-btn v-close-popup label="Close" color="primary" flat />
                  </div>
                </q-time>
              </q-popup-proxy>
            </q-icon>
          </template>
        </q-input>
        <q-input
          v-model.number="form.classDuration"
          type="number"
          label="Duração (minutos)"
          min="30"
        />
        <q-select
          v-model="form.classType"
          label="Tipo de Turma"
          :options="classTypes"
          emit-value
          map-options
          dense
        />
        <q-select
          v-model="form.teacherId"
          label="Professor"
          :placeholder="'Selecione um professor'"
          :options="teacherOptions"
          option-value="id"
          option-label="name"
          emit-value
          map-options
          dense
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Excluir turma" color="negative" @click="deleteClass" />
        <q-btn flat label="Cancelar" v-close-popup />
        <q-btn color="primary" label="Salvar turma" @click="updateClass" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { useClassStore } from '../stores/classStore'
import { useTeacherStore } from '../stores/teacherStore'

const router = useRouter()
const $q = useQuasar()

const props = defineProps({
  modelValue: Boolean,
  classId: String,
  classData: Object,
})

const isOpen = ref(props.modelValue)
watch(
  () => props.modelValue,
  (val) => (isOpen.value = val),
)

const form = ref({
  classDays: [],
  schedule: '',
  teacherId: '',
  classType: '',
  classDuration: 30,
})

// Watch for when classData becomes available
watch(
  () => props.classData,
  (newData) => {
    if (newData) {
      form.value = {
        // classDays might come from older records as strings, convert to numbers for the select
        classDays: (newData.classDays || []).map((d) => Number(d)),
        schedule: newData.schedule || '',
        teacherId: newData.teacherId || '',
        classType: newData.classType || '',
        classDuration: newData.classDuration || 30,
      }
    }
  },
  // Also runs the first time if data is already available
  { immediate: true },
)

// days stored as numbers; 0=Domingo, 1=Segunda, … 6=Sábado
const daysOfWeek = [
  { label: 'Domingo', value: 0 },
  { label: 'Segunda', value: 1 },
  { label: 'Terça', value: 2 },
  { label: 'Quarta', value: 3 },
  { label: 'Quinta', value: 4 },
  { label: 'Sexta', value: 5 },
  { label: 'Sábado', value: 6 },
]

const classTypes = [
  { label: 'Mista', value: 'Mista' },
  { label: 'Kids', value: 'Kids' },
  { label: 'Online', value: 'Online' },
]

const classStore = useClassStore()
const teacherStore = useTeacherStore()
const teacherOptions = ref([])

const fetchTeachers = async () => {
  await teacherStore.fetchTeachers()
  teacherOptions.value = teacherStore.teachers.map((t) => ({ id: t.id, name: t.name }))
}

async function updateClass() {
  try {
    await classStore.updateClass(props.classId, form.value)
    isOpen.value = false
  } catch (err) {
    console.error('Failed to update class:', err.message)
  }
}

async function deleteClass() {
  try {
    $q.dialog({
      title: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja excluir esta turma?',
      cancel: true,
      persistent: true,
    })
      .onOk(async () => {
        isOpen.value = false
        await classStore.deleteClass(props.classId)
        $q.notify({
          type: 'positive',
          message: 'Turma excluída com sucesso!',
        })
        router.push({ name: 'classList' })
      })
      .onCancel(() => {
        console.log('Exclusão cancelada')
      })
  } catch (err) {
    console.error('Failed to delete class:', err.message)
  }
}

onMounted(fetchTeachers)
</script>
