import type { UpdateNoteDto } from '@vectornote/common'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import '~/config/firebase'
import { updateNoteOperation } from '~/infrastructure/firestore/notes'
import { serverTimestamp } from '~/lib/firebase'
import { extractFirstUrl, fetchOgp } from '~/utils/ogp'
import { triggerOnce } from '~/utils/triggerOnce'

export const onUpdateNote = onDocumentUpdated(
  'users/{uid}/notes/{noteId}',
  triggerOnce('onUpdateNote', async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()

    if (!before || !after) return

    // content が変更されたのみ実行（ogp書き戻しによる再トリガー防止）
    if (before.content !== after.content) {
      const { uid, noteId } = event.params
      const url = extractFirstUrl(after.content)

      try {
        const ogp = url ? await fetchOgp(url) : null
        const dto: UpdateNoteDto = { ogp, updatedAt: serverTimestamp }
        await updateNoteOperation(uid, noteId, dto)
      } catch (error) {
        console.error('OGP re-fetch failed for note:', noteId, error)
      }
    }
  }),
)
