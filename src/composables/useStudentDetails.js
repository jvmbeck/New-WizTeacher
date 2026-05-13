import { ref, watch } from 'vue'
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db } from 'src/key/configKey.js'
import { useQuasar } from 'quasar'
import { useClassStore } from 'src/stores/classStore'
import { storeToRefs } from 'pinia'
import { useStudentStore } from 'src/stores/studentStore'
import { patchStudent } from 'src/services/students'
import bookStructure from 'src/data/bookStructure.json'
import {
  fetchContractsByStudentId,
  fetchLessonsByContract,
  fetchAbsencesByContract,
} from 'src/services/students/students.contracts.js'

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

  // ── Contract state ──────────────────────────────────────────────────────
  const contracts = ref([])
  const selectedContractId = ref(null)
  const currentContract = ref(null)
  const loadingContracts = ref(false)

  const { classMap } = storeToRefs(classStore)

  async function fetchStudentAbsences(id) {
    // reset state so spinner appears and stale data is removed
    loadingAbsences.value = true
    absences.value = []

    try {
      await classStore.fetchClasses()

      // Use contract-scoped query when a contract is selected; fall back to global query
      if (selectedContractId.value) {
        absences.value = await fetchAbsencesByContract(id, selectedContractId.value)
      } else {
        const absencesQuery = query(collection(db, 'absences'), where('studentId', '==', id))
        const querySnapshot = await getDocs(absencesQuery)

        absences.value = querySnapshot.docs
          .map((doc) => {
            const data = doc.data()
            const [year, month, day] = data.date.split('-')
            const formattedDate = `${day}/${month}/${year.slice(-2)}`
            return { id: doc.id, ...data, formattedDate }
          })
          .sort((a, b) => b.date.localeCompare(a.date))
      }

      // Reconcile global counter on student doc (only for unscoped view)
      if (
        !selectedContractId.value &&
        student.value &&
        typeof student.value.totalAbsences !== 'undefined'
      ) {
        if (absences.value.length !== student.value.totalAbsences) {
          console.warn(
            `mismatch for ${id}: counter=${student.value.totalAbsences}, docs=${absences.value.length}`,
          )
          try {
            await patchStudent(id, { totalAbsences: absences.value.length })
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

      // Fetch lessons: scoped to selected contract or load all if no contract selected
      await fetchLessonsForSelectedContract(id)
    } catch (error) {
      console.error('Error fetching student data:', error)
    }
  }

  async function fetchLessonsForSelectedContract(id) {
    const buildLessonsGrid = (book, lessonDocs) => {
      const docs = Array.isArray(lessonDocs) ? lessonDocs : []
      const structure = book ? bookStructure[book] : null

      // If book structure is unknown, keep current behavior and return fetched docs only.
      if (!Array.isArray(structure) || structure.length === 0) {
        return docs
      }

      const docsByLesson = new Map(
        docs
          .filter((d) => d && d.lessonNumber !== undefined && d.lessonNumber !== null)
          .map((d) => [String(d.lessonNumber), d]),
      )

      const merged = structure.map((lessonNumber) => {
        const key = String(lessonNumber)
        const existing = docsByLesson.get(key)

        if (existing) {
          return {
            ...existing,
            lessonNumber: existing.lessonNumber ?? key,
          }
        }

        // UI-only placeholder row: keeps full lesson list visible even before a lesson is saved.
        return {
          id: `placeholder_${book}_${key}`,
          lessonNumber: key,
          completedAt: null,
          homeworkPages: [],
          noHomework: false,
          notes: '',
          gradeF: '',
          gradeA: '',
          gradeL: '',
          gradeE: '',
          teacherName: '',
          status: '',
          pendingCheck: false,
        }
      })

      // Preserve any legacy/extra lesson docs that are not part of this book's structure.
      const extras = docs.filter((d) => !structure.includes(String(d.lessonNumber)))
      return [...merged, ...extras]
    }

    const sid = id || studentId.value
    if (!sid) return
    if (selectedContractId.value) {
      // Try to fetch lessons scoped to the selected contract
      let contractLessons = await fetchLessonsByContract(sid, selectedContractId.value)

      // Fallback: if no lessons found for this contract (backwards compat with untagged lessons),
      // fetch all lessons for the student. They will be shown in the lessons table.
      if (contractLessons.length === 0) {
        const lessonsRef = collection(db, 'students', sid, 'lessons')
        const lessonSnaps = await getDocs(lessonsRef)
        contractLessons = lessonSnaps.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        console.warn(
          `No lessons with contractId found for contract ${selectedContractId.value}; showing all lessons for backwards compatibility`,
        )
      }

      const selectedBook = currentContract.value?.book || student.value?.book || ''
      lessons.value = buildLessonsGrid(selectedBook, contractLessons)
    } else {
      const lessonsRef = collection(db, 'students', sid, 'lessons')
      const lessonSnaps = await getDocs(lessonsRef)
      const allLessons = lessonSnaps.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      const selectedBook = student.value?.book || ''
      lessons.value = buildLessonsGrid(selectedBook, allLessons)
    }
  }

  // ── Contract loading ────────────────────────────────────────────────────
  async function loadContracts(id) {
    if (!id) return
    loadingContracts.value = true
    try {
      contracts.value = await fetchContractsByStudentId(id)

      // Determine selected contract: prefer currentContractId from student doc
      const studentCurrentContractId = student.value?.currentContractId ?? null
      if (studentCurrentContractId) {
        selectedContractId.value = studentCurrentContractId
      } else if (contracts.value.length) {
        // Fall back to the most recent active contract, then just the first one
        const active = contracts.value.find((c) => c.status === 'active')
        selectedContractId.value = (active ?? contracts.value[0]).id
      }

      currentContract.value = contracts.value.find((c) => c.id === selectedContractId.value) ?? null

      // Option A soft-fix: if active contract has no currentLesson, write student.currentLesson into it
      if (
        currentContract.value &&
        currentContract.value.status === 'active' &&
        !currentContract.value.currentLesson &&
        student.value?.currentLesson
      ) {
        try {
          const contractRef = doc(db, 'contracts', currentContract.value.id)
          await updateDoc(contractRef, { currentLesson: student.value.currentLesson })
          currentContract.value = {
            ...currentContract.value,
            currentLesson: student.value.currentLesson,
          }
          const idx = contracts.value.findIndex((c) => c.id === currentContract.value.id)
          if (idx !== -1)
            contracts.value[idx] = {
              ...contracts.value[idx],
              currentLesson: student.value.currentLesson,
            }
        } catch (e) {
          console.warn('Could not soft-fill currentLesson on contract:', e)
        }
      }

      // Auto-heal: if student.currentContractId is null but an active contract exists, set it
      if (!studentCurrentContractId && currentContract.value?.status === 'active') {
        try {
          const studentRef = doc(db, 'students', id)
          await updateDoc(studentRef, { currentContractId: currentContract.value.id })
          if (student.value) student.value.currentContractId = currentContract.value.id
        } catch (e) {
          console.warn('Could not auto-heal currentContractId:', e)
        }
      }
    } catch (err) {
      console.error('Error loading contracts:', err)
    } finally {
      loadingContracts.value = false
    }
  }

  async function selectContract(contractId) {
    selectedContractId.value = contractId
    currentContract.value = contracts.value.find((c) => c.id === contractId) ?? null
    // Reload lessons and clear absences so they are refetched on next toggle
    await fetchLessonsForSelectedContract()
    absences.value = []
    showAbsences.value = false
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
    // load all contracts for this student
    await loadContracts(id)
    // ensure the table is aligned with the selected/current contract book
    await fetchLessonsForSelectedContract(id)
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
    // contract state
    contracts,
    selectedContractId,
    currentContract,
    loadingContracts,
    selectContract,
    loadContracts,
    saveChanges,
    discardChanges,
    load,
    // caller may invoke this when the user wants to see the full list
    loadAbsences: fetchStudentAbsences,
  }
}
