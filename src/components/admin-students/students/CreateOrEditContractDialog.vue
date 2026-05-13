<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card style="min-width: 440px; max-width: 560px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ isEdit ? 'Editar Contrato' : 'Novo Contrato' }}</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <q-form @submit.prevent="handleSubmit">
        <q-card-section class="q-gutter-sm">
          <q-input v-model="form.contractNumber" label="Nº do Contrato" outlined dense required />

          <q-select
            v-model="form.book"
            :options="bookOptions"
            label="Livro"
            outlined
            dense
            required
            emit-value
            @update:model-value="onBookChange"
          />

          <q-select
            v-model="form.startingLesson"
            :options="lessonOptions"
            label="Lição Inicial"
            outlined
            dense
            :disable="!lessonOptions.length"
            emit-value
          />

          <q-select
            v-model="form.currentLesson"
            :options="lessonOptions"
            label="Lição Atual"
            outlined
            dense
            :disable="!lessonOptions.length"
            emit-value
          />

          <q-input
            outlined
            v-model="form.startDate"
            mask="date"
            :rules="['date']"
            label="Data de Início"
            dense
          >
            <template v-slot:append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="form.startDate" mask="YYYY/MM/DD">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Ok" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>

          <q-input
            outlined
            v-model="form.endDate"
            mask="date"
            :rules="['date']"
            label="Data de Término Prevista"
            dense
          >
            <template v-slot:append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="form.endDate" mask="YYYY/MM/DD">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Ok" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>

          <q-toggle v-model="form.isPartB" label="Livro Part B (tem troca)" />

          <q-input
            v-if="form.isPartB"
            outlined
            v-model="form.exchangeDate"
            mask="date"
            :rules="['date']"
            label="Data de Troca do Livro"
            dense
          >
            <template v-slot:append>
              <q-icon name="event" class="cursor-pointer">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                  <q-date v-model="form.exchangeDate" mask="YYYY/MM/DD">
                    <div class="row items-center justify-end">
                      <q-btn v-close-popup label="Ok" color="primary" flat />
                    </div>
                  </q-date>
                </q-popup-proxy>
              </q-icon>
            </template>
          </q-input>

          <q-toggle
            v-if="!isEdit"
            v-model="form.setAsCurrent"
            label="Definir este contrato como atual"
          />

          <!-- Close-contract fields (only in edit mode when contract is active) -->
          <template v-if="isEdit && showCloseFields">
            <q-separator class="q-my-sm" />
            <div class="text-caption text-grey-7">Encerrar contrato</div>
            <q-select
              v-model="form.closeStatus"
              :options="['completed', 'cancelled']"
              label="Status de Encerramento"
              outlined
              dense
              emit-value
            />
            <q-input v-model="form.finalLesson" label="Lição Final" outlined dense />
            <q-input v-model="form.reasonForEnd" label="Motivo do Encerramento" outlined dense />
          </template>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md">
          <q-btn
            v-if="isEdit && props.contract?.status === 'active'"
            flat
            label="Encerrar Contrato"
            color="negative"
            @click="showCloseFields = !showCloseFields"
          />
          <q-btn flat label="Cancelar" @click="$emit('update:modelValue', false)" />
          <q-btn
            type="submit"
            :label="isEdit ? 'Salvar' : 'Criar'"
            color="primary"
            :loading="saving"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import bookStructure from 'src/data/bookStructure.json'

const props = defineProps({
  modelValue: Boolean,
  /** Existing contract object when editing. Null when creating. */
  contract: { type: Object, default: null },
  /** Student's current lesson — used to pre-fill currentLesson on new contracts */
  studentCurrentLesson: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'saved'])

const saving = ref(false)
const showCloseFields = ref(false)

const isEdit = computed(() => !!props.contract)

const bookOptions = Object.keys(bookStructure)
const lessonOptions = ref([])

const blankForm = () => ({
  contractNumber: '',
  book: '',
  startingLesson: '',
  currentLesson: props.studentCurrentLesson || '',
  startDate: '',
  endDate: '',
  exchangeDate: null,
  isPartB: false,
  closeStatus: 'completed',
  finalLesson: '',
  reasonForEnd: '',
  setAsCurrent: false,
})

const form = ref(blankForm())

function onBookChange(book) {
  if (book && bookStructure[book]) {
    lessonOptions.value = bookStructure[book]
    if (!lessonOptions.value.includes(form.value.startingLesson)) {
      form.value.startingLesson = lessonOptions.value[0] || ''
    }
    if (!lessonOptions.value.includes(form.value.currentLesson)) {
      form.value.currentLesson = form.value.startingLesson
    }
  } else {
    lessonOptions.value = []
  }
}

// When dialog opens, populate form from existing contract (edit) or reset (create)
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    showCloseFields.value = false
    if (props.contract) {
      // Edit mode: copy existing contract fields into form
      const c = props.contract
      form.value = {
        contractNumber: c.contractNumber ?? '',
        book: c.book ?? '',
        startingLesson: c.startingLesson ?? '',
        currentLesson: c.currentLesson ?? props.studentCurrentLesson ?? '',
        startDate: c.startDate ?? '',
        endDate: c.endDate ?? '',
        exchangeDate: c.exchangeDate ?? null,
        isPartB: c.isPartB ?? false,
        closeStatus: 'completed',
        finalLesson: c.finalLesson ?? '',
        reasonForEnd: c.reasonForEnd ?? '',
        setAsCurrent: false,
      }
      onBookChange(form.value.book)
    } else {
      form.value = blankForm()
      lessonOptions.value = []
    }
  },
  { immediate: false },
)

async function handleSubmit() {
  saving.value = true
  try {
    const payload = {
      contractNumber: form.value.contractNumber,
      book: form.value.book,
      startingLesson: form.value.startingLesson,
      currentLesson: form.value.currentLesson,
      startDate: form.value.startDate,
      endDate: form.value.endDate,
      exchangeDate: form.value.isPartB ? form.value.exchangeDate : null,
      isPartB: form.value.isPartB,
      setAsCurrent: !!form.value.setAsCurrent,
    }

    if (isEdit.value && showCloseFields.value) {
      payload.closeStatus = form.value.closeStatus
      payload.finalLesson = form.value.finalLesson
      payload.reasonForEnd = form.value.reasonForEnd
    }

    emit('saved', { isEdit: isEdit.value, payload, contractId: props.contract?.id ?? null })
    emit('update:modelValue', false)
  } finally {
    saving.value = false
  }
}
</script>
