import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from 'src/key/configKey.js'

/**
 * Fetch all contracts for a student, ordered by createdAt descending.
 * @param {string} studentId
 * @returns {Promise<Array>}
 */
export async function fetchContractsByStudentId(studentId) {
  const q = query(collection(db, 'contracts'), where('studentId', '==', studentId))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() ?? 0
      const bTime = b.createdAt?.toMillis?.() ?? 0
      return bTime - aTime
    })
}

/**
 * Fetch the single active contract for a student.
 * Returns null if none found.
 * @param {string} studentId
 * @returns {Promise<Object|null>}
 */
export async function fetchActiveContract(studentId) {
  const q = query(
    collection(db, 'contracts'),
    where('studentId', '==', studentId),
    where('status', '==', 'active'),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

/**
 * Create a new contract document.
 * Optionally set it as the student's active/current contract.
 *
 * @param {string} studentId
 * @param {Object} contractData - Fields matching the contracts schema.
 *   Required: contractNumber, book, startingLesson, startDate, endDate, status
 *   Optional: currentLesson, exchangeDate, isPartB, reasonForEnd, finalLesson
 * @returns {Promise<{id: string, ...contractData}>}
 */
export async function createContract(studentId, contractData) {
  const setAsCurrent = contractData.setAsCurrent === true

  // Warn (do not block) if student already has a completed contract for this book
  if (contractData.book) {
    const existing = await fetchContractsByStudentId(studentId)
    const duplicate = existing.find((c) => c.book === contractData.book && c.status === 'completed')
    if (duplicate) {
      console.warn(
        `Student ${studentId} already has a completed contract for book "${contractData.book}". Creating anyway.`,
      )
    }
  }

  const payload = {
    studentId,
    contractNumber: contractData.contractNumber ?? '',
    book: contractData.book ?? '',
    startingLesson: contractData.startingLesson ?? '',
    currentLesson: contractData.currentLesson ?? contractData.startingLesson ?? '',
    startDate: contractData.startDate ?? '',
    endDate: contractData.endDate ?? '',
    exchangeDate: contractData.exchangeDate ?? null,
    isPartB: contractData.isPartB ?? false,
    status: setAsCurrent ? 'active' : 'planned',
    totalAbsences: 0,
    pendingReplenishments: 0,
    finalLesson: null,
    completedAt: null,
    reasonForEnd: null,
    createdAt: serverTimestamp(),
  }

  const contractRef = await addDoc(collection(db, 'contracts'), payload)
  const contractId = contractRef.id

  if (setAsCurrent) {
    // Batch: deactivate any other active contract + set currentContractId on student
    const batch = writeBatch(db)
    const studentRef = doc(db, 'students', studentId)

    const previousActive = await fetchActiveContractExcluding(studentId, contractId)
    if (previousActive) {
      batch.update(doc(db, 'contracts', previousActive.id), { status: 'superseded' })
    }

    batch.update(studentRef, {
      currentContractId: contractId,
      book: payload.book,
      currentLesson: payload.currentLesson,
    })

    await batch.commit()
  }

  return { id: contractId, ...payload }
}

/**
 * Update fields on an existing contract document.
 * Also syncs book/currentLesson onto the student doc if this is the active contract.
 *
 * @param {string} contractId
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export async function updateContract(contractId, updates) {
  const contractRef = doc(db, 'contracts', contractId)
  const contractSnap = await getDoc(contractRef)
  if (!contractSnap.exists()) throw new Error(`Contract ${contractId} not found`)

  const current = contractSnap.data()
  await updateDoc(contractRef, { ...updates })

  // Mirror book/currentLesson on student doc if this is their active contract
  const studentRef = doc(db, 'students', current.studentId)
  const studentSnap = await getDoc(studentRef)
  if (studentSnap.exists() && studentSnap.data().currentContractId === contractId) {
    const mirror = {}
    if (updates.book !== undefined) mirror.book = updates.book
    if (updates.currentLesson !== undefined) mirror.currentLesson = updates.currentLesson
    if (Object.keys(mirror).length) {
      await updateDoc(studentRef, mirror)
    }
  }
}

/**
 * Set a given contract as the student's active contract.
 * Deactivates the previous active contract (if any) and updates student.currentContractId.
 *
 * @param {string} studentId
 * @param {string} contractId
 * @returns {Promise<void>}
 */
export async function setActiveContract(studentId, contractId) {
  const batch = writeBatch(db)
  const studentRef = doc(db, 'students', studentId)

  // Deactivate any existing active contract
  const previousActive = await fetchActiveContractExcluding(studentId, contractId)
  if (previousActive) {
    batch.update(doc(db, 'contracts', previousActive.id), { status: 'superseded' })
  }

  // Activate the target contract
  batch.update(doc(db, 'contracts', contractId), { status: 'active' })

  // Point student to new active contract
  const contractSnap = await getDoc(doc(db, 'contracts', contractId))
  const contractData = contractSnap.exists() ? contractSnap.data() : {}
  batch.update(studentRef, {
    currentContractId: contractId,
    ...(contractData.book ? { book: contractData.book } : {}),
    ...(contractData.currentLesson ? { currentLesson: contractData.currentLesson } : {}),
  })

  await batch.commit()
}

/**
 * Close a contract — marks it completed/cancelled and optionally records
 * finalLesson and reasonForEnd. Clears student.currentContractId if this
 * was the active one.
 *
 * @param {string} studentId
 * @param {string} contractId
 * @param {Object} closeData
 *   @param {'completed'|'cancelled'} closeData.status
 *   @param {string} [closeData.finalLesson]
 *   @param {string} [closeData.reasonForEnd]
 * @returns {Promise<void>}
 */
export async function closeContract(studentId, contractId, closeData) {
  const batch = writeBatch(db)
  const contractRef = doc(db, 'contracts', contractId)
  const studentRef = doc(db, 'students', studentId)

  batch.update(contractRef, {
    status: closeData.status ?? 'completed',
    completedAt: serverTimestamp(),
    finalLesson: closeData.finalLesson ?? null,
    reasonForEnd: closeData.reasonForEnd ?? null,
  })

  const studentSnap = await getDoc(studentRef)
  if (studentSnap.exists() && studentSnap.data().currentContractId === contractId) {
    batch.update(studentRef, { currentContractId: null })
  }

  await batch.commit()
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Find an active contract for a student that is NOT the given contractId.
 * Used to deactivate previous active contracts when setting a new one.
 */
async function fetchActiveContractExcluding(studentId, excludeContractId) {
  const q = query(
    collection(db, 'contracts'),
    where('studentId', '==', studentId),
    where('status', '==', 'active'),
  )
  const snap = await getDocs(q)
  const others = snap.docs.filter((d) => d.id !== excludeContractId)
  if (!others.length) return null
  return { id: others[0].id, ...others[0].data() }
}

// ---------------------------------------------------------------------------
// Contract-scoped read APIs
// ---------------------------------------------------------------------------

/**
 * Fetch all lessons for a student that belong to a specific contract.
 * Lessons without contractId are excluded (legacy records).
 *
 * @param {string} studentId
 * @param {string} contractId
 * @returns {Promise<Array>}
 */
export async function fetchLessonsByContract(studentId, contractId) {
  const lessonsRef = collection(db, 'students', studentId, 'lessons')
  const q = query(lessonsRef, where('contractId', '==', contractId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

/**
 * Fetch all absence records for a student that belong to a specific contract.
 *
 * @param {string} studentId
 * @param {string} contractId
 * @returns {Promise<Array>}
 */
export async function fetchAbsencesByContract(studentId, contractId) {
  const q = query(
    collection(db, 'absences'),
    where('studentId', '==', studentId),
    where('contractId', '==', contractId),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => {
      const data = d.data()
      const [year, month, day] = (data.date ?? '').split('-')
      const formattedDate = year ? `${day}/${month}/${year.slice(-2)}` : ''
      return { id: d.id, ...data, formattedDate }
    })
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}

/**
 * Fetch all replenishment records for a student that belong to a specific contract.
 *
 * @param {string} studentId
 * @param {string} contractId
 * @returns {Promise<Array>}
 */
export async function fetchReplenishmentsByContract(studentId, contractId) {
  const q = query(
    collection(db, 'replenishments'),
    where('studentId', '==', studentId),
    where('contractId', '==', contractId),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}
