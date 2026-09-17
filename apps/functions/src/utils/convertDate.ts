import type { DocumentData, Timestamp } from 'firebase-admin/firestore'

// TimestampをDateに変換
export function convertDate(
  snapshot: DocumentData,
  targetKey: Array<string>,
): DocumentData {
  for (const key of targetKey) {
    const value: Timestamp = snapshot[key]
    if (value) {
      snapshot[key] = value.toDate()
    }
  }
  return snapshot
}
