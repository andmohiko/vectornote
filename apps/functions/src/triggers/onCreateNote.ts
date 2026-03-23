import type { UpdateNoteDto } from '@vectornote/common'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import '~/config/firebase'
import { updateNoteOperation } from '~/infrastructure/firestore/notes'
import { serverTimestamp } from '~/lib/firebase'
import { extractFirstUrl, fetchOgp } from '~/utils/ogp'
import { triggerOnce } from '~/utils/triggerOnce'

export const onCreateNote = onDocumentCreated(
  'users/{uid}/notes/{noteId}',
  triggerOnce('onCreateNote', async (event) => {
    if (!event.data) return

    const { uid, noteId } = event.params
    const { content } = event.data.data()
    const url = extractFirstUrl(content)
    if (!url) return

    try {
      const ogp = await fetchOgp(url)
      const dto: UpdateNoteDto = { ogp, updatedAt: serverTimestamp }
      await updateNoteOperation(uid, noteId, dto)
    } catch (error) {
      console.error('OGP fetch failed for note:', noteId, error)
    }
  }),
)
