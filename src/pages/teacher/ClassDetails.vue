<template>
  <div class="q-pa-md">
    <q-btn to="/TeacherDashboard">To Teacher Dashboard</q-btn>
    <h5 class="classTile">{{ classInfo?.className }}</h5>
    <div class="class-header q-mb-md">
      <q-btn
        v-if="$q.screen.gt.sm"
        color="primary"
        icon="content_copy"
        label="Copy All"
        @click="copyAllStudentsInfo"
      />
      <q-btn
        color="primary"
        icon="email"
        label="Send Email Report"
        @click="sendEmailReport"
        disabled
      />
      <q-btn
        color="primary"
        icon="rate_review"
        label="Grade Homework"
        class="q-mt-md"
        @click="isSaveHomeworkFormOpen = true"
      ></q-btn>
    </div>

    <q-list bordered separator>
      <q-item v-for="student in students" :key="student.uid">
        <q-item-section side class="d-flex items-center justify-center">
          <q-avatar
            size="80"
            :color="
              student.isAbsentToday ? 'red-5' : student.isReplenishment ? 'amber-9' : 'blue-8'
            "
          >
            <div class="full-center avatar-initials">
              {{
                (student.name || '')
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()
              }}
            </div>
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <q-item-label class="text-weight-bold q-mb-sm">
            {{ student.name }}
          </q-item-label>

          <!-- Add a chip to show pending lessons if any -->
          <div v-if="student.hasPendingLessons" class="row items-center q-gutter-sm">
            <q-chip
              v-for="lesson in student.pendingLessons"
              :key="lesson.lessonNumber"
              dense
              color="blue-grey-8"
              text-color="white"
              icon="hourglass_bottom"
            >
              {{ lesson.lessonNumber }}
            </q-chip>
          </div>

          <div class="row items-center q-gutter-sm">
            <q-chip
              dense
              :color="student.hasCurrentLessonSaved ? 'green-6' : 'grey-10'"
              text-color="white"
              outline
            >
              <q-icon
                :name="student.hasCurrentLessonSaved ? 'check_circle' : 'hourglass_empty'"
                size="14"
              />
              <span class="q-ml-xs">{{ student.currentLesson ?? '—' }}</span>
            </q-chip>

            <q-chip
              dense
              v-if="getNextLessonLabel(student.currentLesson, student.book)"
              :color="student.hasNextLessonSaved ? 'green-6' : 'grey-10'"
              text-color="white"
              outline
            >
              <q-icon
                :name="student.hasNextLessonSaved ? 'check_circle' : 'hourglass_empty'"
                size="14"
              />
              <span class="q-ml-xs">{{
                getNextLessonLabel(student.currentLesson, student.book)
              }}</span>
            </q-chip>

            <q-chip dense outline class="q-ml-sm" color="blue-8">{{ student.book }}</q-chip>

            <q-badge color="negative" v-if="student.isAbsentToday" class="q-ml-sm">Ausente</q-badge>
            <q-badge color="amber-9" v-if="student.isReplenishment" class="q-ml-sm"
              >Reposição</q-badge
            >
          </div>
        </q-item-section>

        <q-item-section side top style="display: flex; gap: 8px; align-items: center">
          <q-btn
            v-if="$q.screen.gt.sm"
            dense
            round
            flat
            icon="content_copy"
            color="primary"
            @click="copyStudentInfo(student)"
          >
            <q-tooltip>Copiar info de {{ student.name }}</q-tooltip>
          </q-btn>

          <!-- Desktop version with label -->
          <q-btn
            v-if="$q.screen.gt.sm"
            flat
            color="primary"
            icon="edit"
            label="Edit Lesson"
            @click="openLessonForm(student.uid)"
          />
          <!-- Mobile version -->
          <q-btn
            v-else
            round
            flat
            icon="edit"
            color="primary"
            size="md"
            @click="openLessonForm(student.uid)"
          />

          <!-- Desktop version with label -->
          <q-btn
            v-if="$q.screen.gt.sm"
            flat
            color="negative"
            icon="event_busy"
            label="Mark Absent"
            @click="markAbsent(student.uid)"
          />
          <!-- Mobile version -->
          <q-btn
            v-else
            round
            flat
            icon="event_busy"
            color="negative"
            size="md"
            @click="markAbsent(student.uid)"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </div>

  <!-- Import the SaveLessonForm component -->
  <SaveLessonForm
    v-model="isSaveLessonFormOpen"
    :book="selectedStudentBook"
    :lesson-number="selectedStudentLesson"
    @lessonSaved="handleLessonSaved"
  />
  <q-dialog v-model="isSaveHomeworkFormOpen" persistent>
    <HwGradingForm @close="isSaveHomeworkFormOpen = false" :students="students" />
  </q-dialog>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../../key/configKey.js'
import {
  saveLessonForStudent,
  markStudentAbsent,
  queryAbsences,
  fetchStudentsByIds,
} from 'src/services/students/index'
import classServices from '../../services/classes/ClassServices.js'
import SaveLessonForm from 'src/components/SaveLessonForm.vue'
import BookStructure from '../../data/bookStructure.json'
import { useQuasar } from 'quasar'
import emailServices from 'src/services/EmailServices.js'
import HwGradingForm from 'src/components/HwGradingForm.vue'
import { getNextClassDayKey, isToday } from 'src/utils/dateHelpers.js'

const $q = useQuasar()

const route = useRoute()
const classId = route.params.id

const classInfo = ref(null)
const students = ref([])
const selectedStudent = ref(null)
const selectedStudentBook = ref(null)
const selectedStudentLesson = ref(null)
const selectedStudentId = ref(null)
const isSaveLessonFormOpen = ref(false)
const isSaveHomeworkFormOpen = ref(false)

const copyStudentInfo = (student) => {
  const text = `${student.name} - ${student.currentLesson}/${getNextLessonLabel(student.currentLesson, student.book)} - ${student.book}`
  navigator.clipboard
    .writeText(text)
    .then(() => {
      $q.notify({ type: 'positive', message: 'Copiado para a área de transferência!' })
    })
    .catch(() => {
      $q.notify({ type: 'negative', message: 'Falha ao copiar.' })
    })
}

const copyAllStudentsInfo = () => {
  const text = students.value
    .map(
      (student) =>
        `${student.name} - ${student.currentLesson}/${getNextLessonLabel(student.currentLesson, student.book)} - ${student.book}`,
    )
    .join('\n')
  navigator.clipboard
    .writeText(text)
    .then(() => {
      $q.notify({ type: 'positive', message: 'Todos os alunos copiados!' })
    })
    .catch(() => {
      $q.notify({ type: 'negative', message: 'Falha ao copiar.' })
    })
}

const openLessonForm = (studentId) => {
  const student = students.value.find((s) => s.uid === studentId)
  if (!student) return

  selectedStudent.value = student
  selectedStudentId.value = studentId
  selectedStudentBook.value = student.book
  //check whether or not student has pending lessons
  //if not, set selectedStudentLesson to currentLesson or next lesson label
  if (!student.pendingLessons || student.pendingLessons.length === 0) {
    if (student.hasCurrentLessonSaved) {
      selectedStudentLesson.value = getNextLessonLabel(student.currentLesson, student.book)
    } else {
      selectedStudentLesson.value = student.currentLesson
    }
  } else {
    //check if first pending lesson was completed today
    //if yes, skip to next lesson
    if (
      isToday(student.pendingLessons[0].completedAt) &&
      student.pendingLessons[0].classId === classId
    ) {
      selectedStudentLesson.value = student.currentLesson
    } else {
      selectedStudentLesson.value = student.pendingLessons[0].lessonNumber
    }
    //if yes, set selectedStudentLesson to the first pending lesson
  }

  isSaveLessonFormOpen.value = true
}

const handleLessonSaved = async (lessonData) => {
  // Find the student in the local array
  const student = students.value.find((s) => s.uid === selectedStudentId.value)
  if (student) {
    if (!lessonData.pendingCheck) {
      //if not pending, send lesson info with pendingCheck false
      //if saved successfully, returns a true and shows success notification
      if (
        await saveLessonForStudent(selectedStudentId.value, {
          ...lessonData.lesson,
          pendingCheck: false,
          classId: classId,
        })
      ) {
        $q.notify({ type: 'positive', message: 'Lição salva com sucesso!' })
      } else {
        $q.notify({ type: 'negative', message: 'Falha ao salvar a lição.' })
      }
    } else {
      //if pending, send lesson info with pendingCheck true
      //if saved successfully, returns a true and shows success notification
      if (
        await saveLessonForStudent(selectedStudentId.value, {
          ...lessonData.lesson,
          pendingCheck: true,
          classId: classId,
        })
      ) {
        $q.notify({ type: 'positive', message: 'Lição salva como pendente!' })
      } else {
        $q.notify({ type: 'negative', message: 'Falha ao salvar a lição pendente.' })
        return
      }
    }
    if (
      student.pendingLessons &&
      student.pendingLessons.length > 0 &&
      student.pendingLessons.some((pl) => pl.lessonNumber === lessonData.lesson.lessonNumber)
    ) {
      // Remove the saved pending lesson from the local pendingLessons array
      student.pendingLessons = student.pendingLessons.filter(
        (pl) => pl.lessonNumber !== lessonData.lesson.lessonNumber,
      )
      student.hasPendingLessons = student.pendingLessons.length > 0
    } else {
      if (!student.hasCurrentLessonSaved) {
        student.hasCurrentLessonSaved = true
      } else {
        student.hasNextLessonSaved = true
      }
    }
  } else {
    console.warn('Student not found in local list after lesson save:', lessonData.studentId)
  }
}
const markAbsent = async (studentId) => {
  if (!studentId) return

  // confirmation dialog — perform toggle inside onOk so we can update UI immediately afterwards
  $q.dialog({
    title: 'Confirm absence',
    message: 'Mark this student as absent for today? (Toggling will unmark if already absent)',
    cancel: true,
    persistent: true,
  })
    .onOk(async () => {
      try {
        await markStudentAbsent({ studentId, classId, type: 'absence' })
        await updateClassAbsences()
      } catch (err) {
        console.error('Error toggling absence:', err)
        $q.notify({ type: 'negative', message: 'Erro ao atualizar ausência.' })
      }
    })
    .onCancel(() => {
      // cancelled
    })
}

const updateClassAbsences = async () => {
  const absenceData = await queryAbsences(classId)

  const absentStudentIds = absenceData.map((d) => d.studentId)
  students.value = students.value.map((s) => ({
    ...s,
    isAbsentToday: absentStudentIds.includes(s.uid),
  }))
}

const fetchPendingLessons = async (studentId) => {
  const pendingQuery = query(
    collection(db, 'lessonsCompleted'),
    where('studentId', '==', studentId),
    where('status', '==', 'pending'),
  )
  const pendingSnap = await getDocs(pendingQuery)
  return pendingSnap.docs.map((doc) => doc.data())
}

const fetchStudentList = async () => {
  // 1️⃣ Fetch class data
  const classSnap = await getDoc(doc(db, 'classes', classId))
  if (!classSnap.exists()) return

  classInfo.value = classSnap.data()

  // 2️⃣ Determine next class day key using your helper
  const nextClassDay = getNextClassDayKey(classInfo.value)
  if (!nextClassDay) {
    console.warn('Could not determine next class day.')
    return
  }

  // 3️⃣ Build effective list of student IDs
  let effectiveStudentIds = [...(classInfo.value.studentIds || [])]

  // 🔸 Remove unscheduled students
  const unscheduledForDay = classServices.getUnscheduledForNextClass(classInfo.value)
  effectiveStudentIds = effectiveStudentIds.filter((id) => !unscheduledForDay.includes(id))

  // 🔸 Add replenishment students
  const replenishmentForDay = classServices.getReplenishmentsForNextClass(classInfo.value)
  for (const id of replenishmentForDay) {
    if (!effectiveStudentIds.includes(id)) {
      effectiveStudentIds.push(id)
    }
  }

  // 4️⃣ Fetch students by final list
  const studentList = await fetchStudentsByIds(effectiveStudentIds)

  // 6️⃣ Annotate students with replenishment status
  let annotatedStudents = await Promise.all(
    studentList.map(async (student) => {
      // Get pending lessons for this student
      const pendingLessons = await fetchPendingLessons(student.uid)

      return {
        ...student,
        isReplenishment: replenishmentForDay.includes(student.uid),
        pendingLessons: pendingLessons,
        hasPendingLessons: pendingLessons.length > 0,
      }
    }),
  )

  // 7️⃣ Sort students
  annotatedStudents = annotatedStudents.sort((a, b) => {
    const getCategory = (student) => {
      if (typeof student.currentLesson === 'string' && student.currentLesson.startsWith('R'))
        return 2
      const lessonNum = parseInt(student.currentLesson, 10)
      if (!isNaN(lessonNum)) return lessonNum % 2 === 0 ? 0 : 1
      return 3
    }

    const catA = getCategory(a)
    const catB = getCategory(b)
    if (catA !== catB) return catA - catB

    const getLessonNum = (student) => {
      if (typeof student.currentLesson === 'string' && student.currentLesson.startsWith('R'))
        return -1
      const n = parseInt(student.currentLesson, 10)
      return isNaN(n) ? -1 : n
    }

    const lessonDiff = getLessonNum(b) - getLessonNum(a)
    if (lessonDiff !== 0) return lessonDiff

    return a.name.localeCompare(b.name)
  })

  students.value = annotatedStudents
  await updateClassAbsences()
}

const getNextLessonLabel = (currentLesson, book) => {
  const bookLessons = BookStructure[book]
  if (!bookLessons) return currentLesson

  const index = bookLessons.indexOf(String(currentLesson))
  const next = bookLessons[index + 1]
  return next
}

const sendEmailReport = async () => {
  try {
    await emailServices.sendAttendanceEmail(classId)
    $q.notify({ type: 'positive', message: 'Email report sent successfully!' })
  } catch (error) {
    console.error('Error sending email report:', error)
    $q.notify({ type: 'negative', message: 'Failed to send email report.' })
  }
}

onMounted(async () => {
  await fetchStudentList()
})
</script>

<style scoped>
.classTile {
  font-size: 1.5rem;
  font-weight: bold;
  width: 100%;
  text-align: center;
}
.class-header {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 10px;
}

.lesson-saved {
  color: #21ba45; /* Quasar green */
  font-weight: bold;
}

/* Improve touch targets on mobile */
@media (max-width: 599px) {
  .q-item-section[side] {
    gap: 20px !important; /* increase spacing between buttons */
    padding: 10px; /* add some padding around the buttons */
  }

  /* Make icons slightly larger on mobile */
  .q-btn ::v-deep(.q-icon) {
    font-size: 1.6rem;
  }
}

.full-center {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.avatar-initials {
  font-weight: 600;
  color: white;
}
</style>
