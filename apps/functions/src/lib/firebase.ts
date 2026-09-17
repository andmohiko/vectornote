import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

initializeApp({
  credential: applicationDefault(),
})
export const db = getFirestore()
export const serverTimestamp = FieldValue.serverTimestamp()

export const auth = getAuth()
