<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">Criar nova turma</div>
      </q-card-section>

      <q-card-section class="q-gutter-md">
        <q-select
          v-model="form.classDays"
          label="Dia da Semana"
          :options="daysOfWeek"
          emit-value
          map-options
          multiple
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
        />
        <q-select
          v-model="form.teacherId"
          label="Professor"
          :options="teacherOptions"
          option-label="name"
          option-value="id"
          emit-value
          map-options
        />
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Cancelar" v-close-popup />
        <q-btn color="primary" label="Criar" @click="handleCreate" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup>
import { ref, watch, onMounted } from 'vue'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '../key/configKey.js'
import ClassServices from '../services/ClassServices.js' // adjust the path if needed

const props = defineProps({
  modelValue: Boolean,
})
const emit = defineEmits(['update:modelValue', 'classCreated'])

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
  classDuration: 120, // default duration in minutes
})

const daysOfWeek = [
  { label: 'Segunda', value: '1' },
  { label: 'Terça', value: '2' },
  { label: 'Quarta', value: '3' },
  { label: 'Quinta', value: '4' },
  { label: 'Sexta', value: '5' },
  { label: 'Sábado', value: '6' },
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

const handleCreate = async () => {
  try {
    await ClassServices.createClass(form.value)
    emit('classCreated') // notify parent
    isOpen.value = false // close dialog
  } catch (err) {
    console.error('Failed to create class:', err.message)
    // optionally show a toast or error message here
  }
}

onMounted(fetchTeachers)
</script>
