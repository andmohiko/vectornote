import { FieldValue } from 'firebase-admin/firestore'
import { onDocumentDeleted } from 'firebase-functions/v2/firestore'
import '~/config/firebase'
import {
  deleteTagOperation,
  fetchTagOperation,
  updateTagOperation,
} from '~/infrastructure/firestore/tags'
import { serverTimestamp } from '~/lib/firebase'
import { triggerOnce } from '~/utils/triggerOnce'

export const onDeleteNote = onDocumentDeleted(
  'users/{uid}/notes/{noteId}',
  triggerOnce('onDeleteNote', async (event) => {
    if (!event.data) return

    const { uid } = event.params
    const tags: string[] = event.data.data().tags ?? []

    // タグ同期：各タグのカウントをデクリメント（count=0 になれば削除）
    for (const label of tags) {
      try {
        const existing = await fetchTagOperation(uid, label)
        if (!existing) continue
        if (existing.count <= 1) {
          await deleteTagOperation(uid, label)
        } else {
          await updateTagOperation(uid, label, {
            count: FieldValue.increment(-1),
            updatedAt: serverTimestamp,
          })
        }
      } catch (error) {
        console.error('Tag sync failed on delete for label:', label, error)
      }
    }
  }),
)
