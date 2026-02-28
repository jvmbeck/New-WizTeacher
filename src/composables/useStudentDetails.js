import { ref, watch } from 'vue'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from 'src/key/configKey.js'
import { useQuasar } from 'quasar'
import { useClassStore } from 'src/stores/classStore'
import { storeToRefs } from 'pinia'
import { useStudentStore } from 'src/stores/studentStore'
// helper that lets us write arbitrary fields without pulling in db
import { patchStudent } from 'src/services/students'

/**
 * Encapsulates all of the logic that was previously embedded in
 * `StudentDetailsPage.vue`.  This composable is parameterised by a
 * `studentId` (either a plain value or a ref) and exposes a collection
 * of reactive state and helper functions that can be used by the page
 * or by a modal/dialog.
 *
 * @param {String|Ref<String>} initialId - id for the student to load
 * @returns {{studentId: Ref, student: Ref, lessons: Ref, absences: Ref,
 *   loadingAbsences: Ref, className: Ref, classOptions: Ref, showAbsences: Ref,
 *   isEditing: Ref, saveChanges: Function, discardChanges: Function, load: Function}}
 */
export function useStudentDetails(initialId = null) {
  const studentStore = useStudentStore()
  const classStore = useClassStore()
  const $q = useQuasar()

  // allow either a ref or a raw value to be passed in
  const studentId = ref(initialId)

  const isEditing = ref(false)
  const student = ref(null)
  const lessons = ref([])
  const absences = ref([])
  const loadingAbsences = ref(true)
  const className = ref('')
  const classOptions = ref([])
  const showAbsences = ref(false)

  const { classMap } = storeToRefs(classStore)

  async function fetchStudentAbsences(id) {
    // reset state so spinner appears and stale data is removed
    loadingAbsences.value = true
    absences.value = []

    try {
      // make sure the class store is populated so we can resolve names
      await classStore.fetchClasses()

      const absencesQuery = query(collection(db, 'absences'), where('studentId', '==', id))
      const querySnapshot = await getDocs(absencesQuery)

      console.log(
        'raw absence docs:',
        querySnapshot.docs.map((d) => d.data()),
      )

      absences.value = querySnapshot.docs
        .map((doc) => {
          const data = doc.data()
          const [year, month, day] = data.date.split('-')
          const formattedDate = `${day}/${month}/${year.slice(-2)}`
          return {
            id: doc.id,
            ...data,
            formattedDate,
          }
        })
        .sort((a, b) => b.date.localeCompare(a.date))

      // debug: compare against counter on student document
      if (student.value && typeof student.value.totalAbsences !== 'undefined') {
        if (absences.value.length !== student.value.totalAbsences) {
          console.warn(
            `mismatch for ${id}: counter=${student.value.totalAbsences}, docs=${absences.value.length}`,
          )

          // write the correct value back so future loads are consistent
          try {
            // write using the service helper instead of importing
            // Firestore APIs directly; this keeps our DB references
            // concentrated in the services layer.
            await patchStudent(id, { totalAbsences: absences.value.length })

            // keep in-memory copy in sync as well
            student.value.totalAbsences = absences.value.length
            console.info(`corrected totalAbsences for ${id} to ${absences.value.length}`)
          } catch (err) {
            console.error('failed to correct totalAbsences:', err)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching absences:', error)
    } finally {
      loadingAbsences.value = false
    }
  }

  async function fetchStudentData(id) {
    try {
      const studentData = await studentStore.fetchStudentById(id)
      if (studentData) {
        student.value = studentData

        // normalise classIds to plain strings so the QSelect works nicely
        student.value.classIds = Array.isArray(student.value.classIds)
          ? student.value.classIds.map((c) =>
              c && typeof c === 'object' ? (c.value ?? c.id ?? c) : c,
            )
          : []

        if (classOptions.value.length) {
          student.value.classIds = student.value.classIds.map((cid) => {
            const byValue = classOptions.value.find((o) => o.value === cid)
            if (byValue) return byValue.value
            const byLabel = classOptions.value.find((o) => o.label === cid)
            if (byLabel) return byLabel.value
            return cid
          })
        }

        className.value = student.value.classId
          ? classMap.value[student.value.classId] || student.value.classId
          : ''
      } else {
        console.error('No such student found in Firestore!')
      }

      const lessonsRef = collection(db, 'students', id, 'lessons')
      const lessonSnaps = await getDocs(lessonsRef)
      lessons.value = lessonSnaps.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
    } catch (error) {
      console.error('Error fetching student data:', error)
    }
  }

  async function load(id) {
    if (!id) {
      return
    }

    // prefetch the classes so that the select/options can be built
    await classStore.fetchClasses()
    classOptions.value = classStore.classes.map((cls) => ({
      label: cls.className || 'Turma sem nome',
      value: cls.id,
    }))

    // fetch student document only; the absence list is fetched on demand
    await fetchStudentData(id)
  }

  // automatically reload when the passed-in id changes
  watch(
    studentId,
    async (id) => {
      if (id) {
        await load(id)
      }
    },
    { immediate: true },
  )

  const saveChanges = async () => {
    try {
      await studentStore.updateStudent(studentId.value, student.value)
      isEditing.value = false
      $q.notify({ type: 'positive', message: 'Aluno atualizado com sucesso' })
    } catch (error) {
      console.error('Error updating student:', error)
      $q.notify({ type: 'negative', message: 'Falha ao atualizar aluno' })
    }
  }

  const discardChanges = () => {
    isEditing.value = false
    load(studentId.value)
  }

  return {
    studentId,
    isEditing,
    student,
    lessons,
    absences,
    loadingAbsences,
    className,
    classOptions,
    showAbsences,
    saveChanges,
    discardChanges,
    load,
    // caller may invoke this when the user wants to see the full list
    loadAbsences: fetchStudentAbsences,
  }
}
