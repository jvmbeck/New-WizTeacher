<template>
  <q-card style="max-width: 600px">
    <q-card-section>
      <div class="text-h6">Grade Homework</div>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <!-- Student selector -->
      <q-select
        v-model="selectedStudent"
        :options="students"
        label="Select Student"
        outlined
        dense
        class="q-mb-md"
        option-value="id"
        option-label="name"
      />

      <!-- Chips -->
      <div class="q-mb-md flex flex-wrap gap-2">
        <q-chip
          v-for="(hw, index) in homeworkList"
          :key="index"
          color="primary"
          text-color="white"
          removable
          @remove="removeEntry(index)"
          @click="editEntry(index)"
          clickable
        >
          Lesson {{ hw.lesson }} — Grade: {{ hw.grade }}
        </q-chip>
      </div>

      <!-- Add/Edit form -->
      <div class="row q-gutter-sm items-center">
        <q-select
          v-model="formLesson"
          :options="lessonOptions"
          label="Lesson"
          outlined
          dense
          style="width: 120px"
          :disable="!selectedStudent"
          emit-value
          map-options
        />
        <q-select
          v-model="formGrade"
          :options="['O', 'MB', 'B', 'R']"
          label="Grade"
          outlined
          dense
          style="width: 120px"
        />
        <q-btn
          v-if="editIndex === null"
          color="primary"
          icon="add"
          label="Add"
          unelevated
          @click="addEntry"
          :disable="!formLesson || !formGrade"
        />
        <q-btn
          v-else
          color="secondary"
          icon="check"
          label="Update"
          unelevated
          @click="updateEntry"
          :disable="!formLesson || !formGrade"
        />
        <q-btn
          v-if="editIndex !== null"
          flat
          color="grey"
          icon="close"
          label="Cancel"
          @click="cancelEdit"
        />
      </div>
    </q-card-section>

    <q-separator />

    <q-card-actions align="right">
      <q-btn flat label="Cancel" v-close-popup />
      <q-btn
        color="primary"
        label="Save All Grades"
        :disable="!selectedStudent || homeworkList.length === 0"
        @click="saveGrades"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Notify } from 'quasar'
import { saveHomeworkGrades } from 'src/services/students'
import bookStructure from 'src/data/bookStructure.json'

const props = defineProps({
  students: {
    type: Array,
    required: true,
  },
})

const students = ref(props.students)

const emit = defineEmits(['close'])

// reactive state
const selectedStudent = ref(null)
const homeworkList = ref([])
const formLesson = ref('')
const formGrade = ref('')
const editIndex = ref(null)

const lessonOptions = computed(() => {
  const book = selectedStudent.value?.book
  if (!book || !bookStructure[book]) return []

  return bookStructure[book].map((lesson) => ({
    label: lesson,
    value: lesson,
  }))
})

watch(selectedStudent, () => {
  const isCurrentLessonValid = lessonOptions.value.some(
    (option) => option.value === formLesson.value,
  )
  if (!isCurrentLessonValid) {
    formLesson.value = ''
  }
})

// Add new homework
async function addEntry() {
  if (!selectedStudent.value) {
    Notify.create({
      type: 'negative',
      message: 'Please select a student first.',
    })
    return
  }

  const lessonId = formLesson.value

  // Add the entry if validation passed
  homeworkList.value.push({
    lesson: lessonId,
    grade: formGrade.value,
  })

  resetForm()
}

// Edit an existing homework chip
function editEntry(index) {
  const hw = homeworkList.value[index]
  formLesson.value = hw.lesson
  formGrade.value = hw.grade
  editIndex.value = index
}

// Update after editing
function updateEntry() {
  homeworkList.value[editIndex.value] = {
    lesson: formLesson.value,
    grade: formGrade.value,
  }
  resetForm()
}

// Cancel edit mode
function cancelEdit() {
  resetForm()
}

// Remove chip
function removeEntry(index) {
  homeworkList.value.splice(index, 1)
}

// Save grades
async function saveGrades() {
  if (!selectedStudent.value) return

  const student = selectedStudent.value
  const studentId = student.uid || student.id
  const studentBook = student.book
  const contractId = student.currentContractId || null

  try {
    await saveHomeworkGrades({
      studentId,
      studentBook,
      contractId,
      hwPages: homeworkList.value,
    })

    Notify.create({
      type: 'positive',
      message: 'Homework grades saved successfully!',
    })
    emit('close')
    resetAll()
  } catch (error) {
    Notify.create({
      type: 'negative',
      message: `Error saving grades: ${error.message}`,
    })
    return
  }
}

// Helpers
function resetForm() {
  formLesson.value = ''
  formGrade.value = ''
  editIndex.value = null
}

function resetAll() {
  resetForm()
  homeworkList.value = []
  selectedStudent.value = null
}
</script>

<style scoped>
.flex {
  display: flex;
  flex-wrap: wrap;
}
.gap-2 {
  gap: 8px;
}
</style>
