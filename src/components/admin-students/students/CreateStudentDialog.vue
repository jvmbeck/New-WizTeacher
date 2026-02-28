<template>
  <q-dialog :model-value="modelValue" @update:model-value="emitClose" persistent>
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">Criar novo aluno</div>
      </q-card-section>

      <q-form @submit="submitStudent">
        <q-card-section class="q-gutter-md">
          <q-input v-model="newStudent.name" label="Nome" outlined dense required />
          <q-select
            v-model="newStudent.book"
            :options="bookOptions"
            label="Livro"
            outlined
            dense
            required
            emit-value
          />
          <q-select
            v-model="newStudent.currentLesson"
            :options="lessonsOptions"
            label="Lição Atual"
            outlined
            dense
            required
            :disable="!lessonsOptions.length"
            emit-value
          />
          <q-select
            v-model="selectedClassIds"
            :options="classes"
            option-label="name"
            option-value="id"
            emit-value
            map-options
            label="Selecionar Turmas"
            multiple
            outlined
          />
          <q-input v-model="newStudent.contract" label="Nº do contrato" outlined dense required />

          <q-input
            outlined
            v-model="newStudent.bookStartDate"
            mask="date"
            :rules="['date']"
            label="Começo do livro"
          >
            <template v-slot:append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="newStudent.bookStartDate">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>

          <q-input
            v-if="isPartBBook(newStudent.book)"
            outlined
            v-model="newStudent.bookExchangeDate"
            mask="date"
            :rules="['date']"
            label="Troca do livro"
          >
            <template v-slot:append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="newStudent.bookExchangeDate">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
          <q-input
            outlined
            v-model="newStudent.bookEndDate"
            mask="date"
            :rules="['date']"
            label="Término do Livro"
          >
            <template v-slot:append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="newStudent.bookEndDate">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Close" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn type="submit" color="primary" label="Save" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useClassStore } from 'src/stores/classStore'
import { storeToRefs } from 'pinia'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue', 'create'])

const selectedClassIds = ref([])

const classStore = useClassStore()
const { classes } = storeToRefs(classStore)

const newStudent = ref({
  name: '',
  book: '',
  currentLesson: '1',
  classIds: [],
  contract: '',
  bookStartDate: '',
  bookExchangeDate: '',
  bookEndDate: '',
})

watch(
  () => props.modelValue,
  async (val) => {
    if (val) {
      await classStore.fetchClasses()
      newStudent.value = {
        name: '',
        book: '',
        currentLesson: '',
        classIds: [],
        contract: '',
        bookStartDate: '',
        bookExchangeDate: '',
        bookEndDate: '',
      }
      selectedClassIds.value = []
      lessonsOptions.value = []
    }
  },
)

function emitClose(val) {
  emit('update:modelValue', val)
}
import bookStructure from 'src/data/bookStructure.json'

const bookOptions = Object.keys(bookStructure)
const lessonsOptions = ref([])

watch(
  () => newStudent.value.book,
  (book) => {
    if (book && bookStructure[book]) {
      lessonsOptions.value = bookStructure[book]
      newStudent.value.currentLesson = lessonsOptions.value[0] || ''
    } else {
      lessonsOptions.value = []
      newStudent.value.currentLesson = ''
    }
  },
)

// check if the selected book is a Part B book (W2, T2, K2)
function isPartBBook(book) {
  return ['W2', 'T2', 'NEW K2', 'K2 3RD'].includes(book)
}

async function submitStudent() {
  newStudent.value.classIds = selectedClassIds.value

  if (!newStudent.value.book || !bookStructure[newStudent.value.book]) {
    alert('Selecione um livro válido.')
    return
  }
  if (!bookStructure[newStudent.value.book].includes(newStudent.value.currentLesson)) {
    alert('Selecione uma lição válida para o livro selecionado.')
    return
  }

  emit('create', { ...newStudent.value })
  emit('update:modelValue', false)
}
</script>
