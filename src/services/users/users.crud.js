import { deleteApp, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { setDoc, collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore'
import { auth, db, functions } from 'src/key/configKey.js'

export async function fetchUsers(role) {
  const usersCollection = collection(db, 'users')
  const usersQuery = role ? query(usersCollection, where('role', '==', role)) : usersCollection
  const snapshot = await getDocs(usersQuery)

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }))
}

export async function createUserWithRole({ name, email, password, role }) {
  const tempAppName = `user-creator-${Date.now()}`
  const tempApp = initializeApp(auth.app.options, tempAppName)

  try {
    const tempAuth = getAuth(tempApp)
    const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password)
    const { uid } = userCredential.user

    await setDoc(doc(db, 'users', uid), {
      name,
      role,
      uid,
      email,
    })

    return {
      uid,
      name,
      role,
      email,
    }
  } finally {
    await deleteApp(tempApp)
  }
}

export async function updateUser(uid, data) {
  const userRef = doc(db, 'users', uid)

  const allowedData = {}
  if (typeof data?.name === 'string') {
    allowedData.name = data.name
  }
  if (typeof data?.role === 'string') {
    allowedData.role = data.role
  }

  if (Object.keys(allowedData).length === 0) {
    throw new Error('No valid fields to update. Allowed fields: name, role')
  }

  await updateDoc(userRef, allowedData)

  return {
    uid,
    ...allowedData,
  }
}

export async function deleteUserAccount(uid) {
  if (!uid || typeof uid !== 'string') {
    throw new Error('A valid uid is required to delete a user')
  }

  const deleteAuthUserByUid = httpsCallable(functions, 'deleteAuthUserByUid')

  try {
    const result = await deleteAuthUserByUid({ uid })
    return result?.data || { uid }
  } catch (error) {
    if (error?.code === 'functions/not-found') {
      throw new Error(
        'Cloud Function deleteAuthUserByUid was not found. Deploy Firebase Functions first.',
      )
    }
    throw error
  }
}

export async function generatePasswordResetLink(uid) {
  if (!uid || typeof uid !== 'string') {
    throw new Error('A valid uid is required to generate a password reset link')
  }

  const generatePasswordResetLinkForUser = httpsCallable(
    functions,
    'generatePasswordResetLinkForUser',
  )

  try {
    const result = await generatePasswordResetLinkForUser({ uid })
    return result?.data
  } catch (error) {
    if (error?.code === 'functions/not-found') {
      throw new Error(
        'Cloud Function generatePasswordResetLinkForUser was not found. Deploy Firebase Functions first.',
      )
    }

    const normalized = new Error(
      error?.details?.message ||
        error?.details ||
        error?.message ||
        'Failed to generate password reset link.',
    )
    normalized.code = error?.code
    normalized.details = error?.details
    throw normalized
  }
}
