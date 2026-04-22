const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const admin = require('firebase-admin')

admin.initializeApp()
setGlobalOptions({ region: 'us-central1' })

async function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be authenticated to perform this action.')
  }

  const callerUid = request.auth.uid
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get()
  const callerRole = callerDoc.exists ? callerDoc.data().role : null

  if (callerRole !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can perform this action.')
  }
}

exports.deleteAuthUserByUid = onCall(async (request) => {
  await requireAdmin(request)

  const uid = request.data && typeof request.data.uid === 'string' ? request.data.uid : null
  if (!uid) {
    throw new HttpsError('invalid-argument', 'A valid uid is required.')
  }

  await admin.auth().deleteUser(uid)
  await admin.firestore().collection('users').doc(uid).delete()

  return { uid }
})

exports.generatePasswordResetLinkForUser = onCall(async (request) => {
  await requireAdmin(request)

  const uid = request.data && typeof request.data.uid === 'string' ? request.data.uid : null
  if (!uid) {
    throw new HttpsError('invalid-argument', 'A valid uid is required.')
  }

  const userRecord = await admin.auth().getUser(uid)
  if (!userRecord.email) {
    throw new HttpsError('failed-precondition', 'Selected user does not have an email in auth.')
  }

  const link = await admin.auth().generatePasswordResetLink(userRecord.email)
  return {
    uid,
    email: userRecord.email,
    link,
  }
})
