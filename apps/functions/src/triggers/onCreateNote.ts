import type { UpdateNoteDtoFromAdmin } from '@vectornote/common'
import { FieldValue } from 'firebase-admin/firestore'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import '~/config/firebase'
import { updateNoteOperation } from '~/infrastructure/firestore/notes'
import { serverTimestamp } from '~/lib/firebase'
import { getOpenAIClient } from '~/lib/openai'
import { buildEmbeddingText } from '~/utils/embedding'
import { extractFirstUrl, fetchOgp } from '~/utils/ogp'
import { triggerOnce } from '~/utils/triggerOnce'

export const onCreateNote = onDocumentCreated(
  'users/{uid}/notes/{noteId}',
  triggerOnce('onCreateNote', async (event) => {
    if (!event.data) return

    const { uid, noteId } = event.params
    const { title, content, keywords, tags } = event.data.data()

    // OGP取得
    let ogp = null
    const url = extractFirstUrl(content)
    if (url) {
      try {
        ogp = await fetchOgp(url)
        const dto: UpdateNoteDtoFromAdmin = { ogp, updatedAt: serverTimestamp }
        await updateNoteOperation(uid, noteId, dto)
      } catch (error) {
        console.error('OGP fetch failed for note:', noteId, error)
      }
    }

    // embedding生成（OGPのtitle/descriptionも含める）
    const embeddingText = buildEmbeddingText(title, content, keywords, tags, ogp?.title, ogp?.description)
    if (!embeddingText.trim()) return

    try {
      const response = await getOpenAIClient().embeddings.create({
        model: 'text-embedding-3-small',
        input: embeddingText,
      })
      const embedding = response.data[0].embedding
      const dto: UpdateNoteDtoFromAdmin = {
        embedding: FieldValue.vector(embedding),
        updatedAt: serverTimestamp,
      }
      await updateNoteOperation(uid, noteId, dto)
    } catch (error) {
      console.error('Embedding generation failed for note:', noteId, error)
    }
  }),
)
