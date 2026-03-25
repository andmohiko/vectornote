import type { UpdateNoteDtoFromAdmin } from '@vectornote/common'
import { FieldValue } from 'firebase-admin/firestore'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import '~/config/firebase'
import { updateNoteOperation } from '~/infrastructure/firestore/notes'
import {
  createTagOperation,
  fetchTagByLabelOperation,
  updateTagOperation,
} from '~/infrastructure/firestore/tags'
import { serverTimestamp } from '~/lib/firebase'
import { getOpenAIClient } from '~/lib/openai'
import { buildEmbeddingText } from '~/utils/embedding'
import { extractFirstUrl, fetchOgp } from '~/utils/ogp'
import { insertTweetQuote } from '~/utils/tweetQuote'
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
      } catch (error) {
        console.error('OGP fetch failed for note:', noteId, error)
      }
    }

    // ツイート引用挿入
    let currentContent = content as string
    try {
      const result = await insertTweetQuote(currentContent)
      currentContent = result.content
    } catch (error) {
      console.error('Tweet quote insertion failed for note:', noteId, error)
    }

    // OGP + content + updatedBy をまとめて更新
    const contentChanged = currentContent !== content
    const updateDto: UpdateNoteDtoFromAdmin = {
      ...(ogp !== null && { ogp }),
      ...(contentChanged && { content: currentContent }),
      updatedBy: 'trigger',
      updatedAt: serverTimestamp,
    }
    await updateNoteOperation(uid, noteId, updateDto)

    // embedding生成（挿入後の content を使用）
    const embeddingText = buildEmbeddingText(title, currentContent, keywords, tags, ogp?.title, ogp?.description)
    if (!embeddingText.trim()) return

    try {
      const response = await getOpenAIClient().embeddings.create({
        model: 'text-embedding-3-small',
        input: embeddingText,
      })
      const embedding = response.data[0].embedding
      const dto: UpdateNoteDtoFromAdmin = {
        embedding: FieldValue.vector(embedding),
        updatedBy: 'trigger',
        updatedAt: serverTimestamp,
      }
      await updateNoteOperation(uid, noteId, dto)
    } catch (error) {
      console.error('Embedding generation failed for note:', noteId, error)
    }

    // タグ同期：各タグのカウントをインクリメント（存在しなければ新規作成）
    const tagList: string[] = tags ?? []
    for (const label of tagList) {
      try {
        const existing = await fetchTagByLabelOperation(uid, label)
        if (existing) {
          await updateTagOperation(uid, existing.tagId, {
            count: FieldValue.increment(1),
            updatedAt: serverTimestamp,
          })
        } else {
          await createTagOperation(uid, {
            label,
            count: 1,
            createdAt: serverTimestamp,
            updatedAt: serverTimestamp,
          })
        }
      } catch (error) {
        console.error('Tag sync failed for label:', label, error)
      }
    }
  }),
)
