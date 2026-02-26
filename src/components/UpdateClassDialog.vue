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
import { getDocs, collection } from 'firebase/firestore'
import { db } from '../key/configKey.js'
import ClassServices from '../services/ClassServices.js'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'

const router = useRouter()
const $q = useQuasar()

const props = defineProps({
  modelValue: Boolean,
  classId: String,
  classData: Object,
})

const emit = defineEmits(['update:modelValue', 'classUpdated'])

const isOpen = ref(props.modelValue)
watch(
  () => props.modelValue,
  (val) => (isOpen.value = val),
)
watch(isOpen, (val) => emit('update:modelValue', val))

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
      form.value.classDays = newData.classDays
      form.value.schedule = newData.schedule
      form.value.teacherId = newData.teacherId
      form.value.classType = newData.classType
      form.value.classDuration = newData.classDuration
    }
  },
  { immediate: true }, // Also runs the first time if data is already available
)

const daysOfWeek = [
  { label: 'Segunda', value: 'Segunda' },
  { label: 'Terça', value: 'Terça' },
  { label: 'Quarta', value: 'Quarta' },
  { label: 'Quinta', value: 'Quinta' },
  { label: 'Sexta', value: 'Sexta' },
  { label: 'Sábado', value: 'Sábado' },
]

const classTypes = [
  { label: 'Mista', value: 'Mista' },
  { label: 'Kids', value: 'Kids' },
  { label: 'Online', value: 'Online' },
]

const teacherOptions = ref([])

const fetchTeachers = async () => {
  const snapshot = await getDocs(collection(db, 'users'))
  teacherOptions.value = snapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
  }))
}

async function updateClass() {
  try {
    await ClassServices.updateClassData(props.classId, form.value)
    emit('classUpdated') // refresh data in parent
    isOpen.value = false
  } catch (err) {
    console.error('Failed to update class:', err.message)
  }
}

async function deleteClass() {
  try {
    // Show confirmation dialog before deleting
    $q.dialog({
      title: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja excluir esta turma?',
      cancel: true,
      persistent: true,
    })
      .onOk(async () => {
        isOpen.value = false
        ClassServices.deleteClass(props.classId)
        $q.notify({
          type: 'positive',
          message: 'Turma excluída com sucesso!',
        })
        router.push({ name: 'classList' }) // Redirect to class list
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
