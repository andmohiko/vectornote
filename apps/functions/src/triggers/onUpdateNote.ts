import type { UpdateNoteDtoFromAdmin } from '@vectornote/common'
import { FieldValue } from 'firebase-admin/firestore'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import '~/config/firebase'
import { updateNoteOperation } from '~/infrastructure/firestore/notes'
import { serverTimestamp } from '~/lib/firebase'
import { getOpenAIClient } from '~/lib/openai'
import { buildEmbeddingText } from '~/utils/embedding'
import { extractFirstUrl, fetchOgp } from '~/utils/ogp'
import { triggerOnce } from '~/utils/triggerOnce'

export const onUpdateNote = onDocumentUpdated(
  'users/{uid}/notes/{noteId}',
  triggerOnce('onUpdateNote', async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()

    if (!before || !after) return

    const { uid, noteId } = event.params

    // content が変更された場合のみ OGP を再取得（ogp書き戻しによる再トリガー防止）
    if (before.content !== after.content) {
      const url = extractFirstUrl(after.content)

      try {
        const ogp = url ? await fetchOgp(url) : null
        const dto: UpdateNoteDtoFromAdmin = { ogp, updatedAt: serverTimestamp }
        await updateNoteOperation(uid, noteId, dto)
      } catch (error) {
        console.error('OGP re-fetch failed for note:', noteId, error)
      }
    }

    // title / content / keywords / tags のいずれかが変更された場合に embedding を再生成
    // embedding フィールド自体の更新では再トリガーしないよう制御
    const contentChanged =
      before.title !== after.title ||
      before.content !== after.content ||
      before.keywords !== after.keywords ||
      JSON.stringify(before.tags) !== JSON.stringify(after.tags)

    if (!contentChanged) return

    const embeddingText = buildEmbeddingText(
      after.title,
      after.content,
      after.keywords,
      after.tags,
    )
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
      console.error('Embedding re-generation failed for note:', noteId, error)
    }
  }),
)
