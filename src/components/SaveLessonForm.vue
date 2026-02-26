<template>
  <q-dialog v-model="isOpen" :maximized="$q.screen.lt.sm">
    <q-card class="q-pa-md save-lesson-card">
      <q-card-section>
        <div class="text-h6">Save Lesson Info</div>
      </q-card-section>

      <q-form v-if="!endOfBook" @submit.prevent="submitLesson" class="q-gutter-md">
        <!-- make the form section scrollable on small screens -->
        <q-card-section class="card-body">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input v-model="lesson.book" label="Book" stack-label :disable="pendingCheck" />
            </div>
            <div class="col-12 col-md-6">
              <q-input
                v-model="lesson.lessonNumber"
                label="Lesson #"
                stack-label
                :disable="pendingCheck"
              />
            </div>
          </div>

          <div class="row q-col-gutter-md q-mt-md">
            <q-select
              v-for="field in gradeFields"
              :key="field.key"
              v-model="lesson[field.key]"
              :options="gradeOptions"
              :label="field.label"
              emit-value
              map-options
              class="col-6 col-md-3"
              placeholder="Selecionar nota"
              stack-label
              :disable="pendingCheck"
            />
          </div>

          <q-input
            v-model="lesson.notes"
            label="Notes"
            type="textarea"
            class="q-mt-md"
            rows="3"
            stack-label
            :disable="pendingCheck"
          />
          <q-toggle
            label="Pending Check"
            v-model="pendingCheck"
            keep-color
            icon="hourglass_top"
            size="xl"
          ></q-toggle>
        </q-card-section>

        <q-card-actions align="right" class="q-mt-md">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn type="submit" label="Save" color="primary" />
        </q-card-actions>
      </q-form>
      <div v-else class="q-pa-md text-red text-bold">
        This book has ended. Please check the student's homework before assigning a new book.
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import books from '../data/bookStructure.json'

const props = defineProps({
  book: String,
  lessonNumber: String,
  modelValue: Boolean,
})

const pendingCheck = ref(false)

const emit = defineEmits(['update:modelValue', 'lessonSaved'])

const endOfBook = ref(false)
const isOpen = ref(props.modelValue)
const lesson = ref({
  book: '',
  lessonNumber: '',
  notes: '',
})

const gradeOptions = [
  { label: 'O', value: 'O' },
  { label: 'MB', value: 'MB' },
  { label: 'B', value: 'B' },
  { label: 'R', value: 'R' },
]

const gradeFields = [
  { key: 'gradeF', label: 'F' },
  { key: 'gradeA', label: 'A' },
  { key: 'gradeL', label: 'L' },
  { key: 'gradeE', label: 'E' },
]

// Watch for dialog open and fetch student data
watch(
  () => props.modelValue,
  async (val) => {
    isOpen.value = val

    if (val) {
      lesson.value.book = props.book || ''
      lesson.value.lessonNumber = props.lessonNumber || ''
      const bookLessons = books[lesson.value.book]

      if (!bookLessons) {
        console.warn(`Book "${lesson.value.book}" not found in books structure`)
        lesson.value = null
        endOfBook.value = true
        return
      }
      const currentIndex = bookLessons.indexOf(String(lesson.value.lessonNumber))

      // If lessonNumber is not in list OR it's beyond the last index => book finished
      const isEndOfBook = currentIndex === -1 || currentIndex >= bookLessons.length

      if (isEndOfBook) {
        lesson.value = null
        endOfBook.value = true
        return
      }

      endOfBook.value = false
      pendingCheck.value = false
      for (const field of gradeFields) {
        lesson.value[field.key] = ''
      }
      lesson.value.notes = ''
    }
  },
)

watch(isOpen, (val) => {
  emit('update:modelValue', val)
})
const submitLesson = async () => {
  emit('lessonSaved', {
    lesson: lesson.value,
    pendingCheck: pendingCheck.value,
  })
  isOpen.value = false
}

// Clear all grade selects when pendingCheck becomes true
watch(pendingCheck, (val) => {
  if (val && lesson.value) {
    gradeFields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(lesson.value, f.key)) {
        lesson.value[f.key] = ''
        lesson.value.notes = 'Checar próxima aula'
      }
    })
  }
})
</script>

<style scoped>
.save-lesson-card {
  /* responsive width: wider on desktop, still fits small screens */
  width: min(80vw, 1100px);
  max-width: 1100px;
  min-width: 300px;
  box-sizing: border-box;
  max-height: 90vh; /* prevent dialog from becoming taller than viewport */
}

/* ensure the form area can scroll when there's limited vertical space */
.save-lesson-card .card-body {
  overflow: auto;
  /* subtract space for title + actions so form content fits within max-height */
  max-height: calc(90vh - 140px);
}

/* Desktop enhancements */
@media (min-width: 600px) {
  .save-lesson-card {
    padding: 1rem;
  }

  .save-lesson-card .q-card-section {
    padding: 1rem;
  }

  .save-lesson-card .text-h6 {
    font-size: 1.5rem;
  }

  .save-lesson-card .q-input,
  .save-lesson-card .q-select {
    font-size: 1.1rem;
  }

  .save-lesson-card .q-field__label {
    font-size: 1rem;
  }
}

/* Ensure label visibility and a bit more control height */
.save-lesson-card .q-field__control {
  min-height: 46px;
}

/* Mobile adjustments */
@media (max-width: 599px) {
  .save-lesson-card .q-card-section {
    padding: 16px;
  }

  /* Increase text size for mobile */
  .save-lesson-card .q-field__label {
    font-size: 1.6rem;
  }

  .save-lesson-card .q-field__native,
  .save-lesson-card .q-field__input {
    font-size: 2rem;
  }

  /* Increase spacing between form elements */
  .save-lesson-card .row {
    row-gap: 20px !important;
  }

  /* Make select boxes taller for better touch targets */
  .save-lesson-card .q-field__control {
    min-height: 64px;
  }

  /* Larger text for dialog title */
  .save-lesson-card .text-h6 {
    font-size: 1.6rem;
  }

  /* Larger buttons */
  .save-lesson-card .q-btn {
    padding: 8px 24px;
    font-size: 1rem;
  }
}

/* Slightly more spacious layout on large screens */
@media (min-width: 1200px) {
  .save-lesson-card {
    width: min(70vw, 1200px);
    padding: 1.25rem;
  }

  .save-lesson-card .q-input,
  .save-lesson-card .q-select {
    font-size: 1.15rem;
  }
}
</style>
