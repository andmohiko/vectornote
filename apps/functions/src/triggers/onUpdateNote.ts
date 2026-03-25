import type { UpdateNoteDtoFromAdmin } from '@vectornote/common'
import { FieldValue } from 'firebase-admin/firestore'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import '~/config/firebase'
import { updateNoteOperation } from '~/infrastructure/firestore/notes'
import {
  createTagOperation,
  deleteTagOperation,
  fetchTagByLabelOperation,
  updateTagOperation,
} from '~/infrastructure/firestore/tags'
import { serverTimestamp } from '~/lib/firebase'
import { getOpenAIClient } from '~/lib/openai'
import { buildEmbeddingText } from '~/utils/embedding'
import { extractFirstUrl, fetchOgp } from '~/utils/ogp'
import { insertTweetQuote } from '~/utils/tweetQuote'
import { triggerOnce } from '~/utils/triggerOnce'

export const onUpdateNote = onDocumentUpdated(
  'users/{uid}/notes/{noteId}',
  triggerOnce('onUpdateNote', async (event) => {
    const before = event.data?.before.data()
    const after = event.data?.after.data()

    if (!before || !after) return

    // トリガーによる更新なら再処理をスキップ（再トリガー防止）
    if (after.updatedBy === 'trigger') return

    const { uid, noteId } = event.params

    // content が変更された場合のみ OGP を再取得 + ツイート引用挿入
    let ogp = after.ogp ?? null
    let currentContent = after.content as string
    if (before.content !== after.content) {
      const url = extractFirstUrl(after.content)

      try {
        ogp = url ? await fetchOgp(url) : null
      } catch (error) {
        console.error('OGP re-fetch failed for note:', noteId, error)
      }

      // ツイート引用挿入
      try {
        const result = await insertTweetQuote(currentContent)
        currentContent = result.content
      } catch (error) {
        console.error('Tweet quote insertion failed for note:', noteId, error)
      }

      // OGP + content + updatedBy をまとめて更新
      const contentChanged = currentContent !== after.content
      const updateDto: UpdateNoteDtoFromAdmin = {
        ogp,
        ...(contentChanged && { content: currentContent }),
        updatedBy: 'trigger',
        updatedAt: serverTimestamp,
      }
      await updateNoteOperation(uid, noteId, updateDto)
    }

    // title / content / keywords / tags のいずれかが変更された場合に embedding を再生成
    const fieldsChanged =
      before.title !== after.title ||
      before.content !== after.content ||
      before.keywords !== after.keywords ||
      JSON.stringify(before.tags) !== JSON.stringify(after.tags)

    // タグ同期：before/after の差分のみ同期
    const beforeTags: string[] = before.tags ?? []
    const afterTags: string[] = after.tags ?? []
    const tagsChanged = JSON.stringify([...beforeTags].sort()) !== JSON.stringify([...afterTags].sort())

    if (tagsChanged) {
      const addedTags = afterTags.filter((t) => !beforeTags.includes(t))
      const removedTags = beforeTags.filter((t) => !afterTags.includes(t))

      // 追加されたタグをインクリメント（なければ新規作成）
      for (const label of addedTags) {
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
          console.error('Tag increment failed for label:', label, error)
        }
      }

      // 削除されたタグをデクリメント（count=0 になれば削除）
      for (const label of removedTags) {
        try {
          const existing = await fetchTagByLabelOperation(uid, label)
          if (!existing) continue
          if (existing.count <= 1) {
            await deleteTagOperation(uid, existing.tagId)
          } else {
            await updateTagOperation(uid, existing.tagId, {
              count: FieldValue.increment(-1),
              updatedAt: serverTimestamp,
            })
          }
        } catch (error) {
          console.error('Tag decrement failed for label:', label, error)
        }
      }
    }

    if (!fieldsChanged) return

    // embedding生成（挿入後の content を使用）
    const embeddingText = buildEmbeddingText(
      after.title,
      currentContent,
      after.keywords,
      after.tags,
      ogp?.title,
      ogp?.description,
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
        updatedBy: 'trigger',
        updatedAt: serverTimestamp,
      }
      await updateNoteOperation(uid, noteId, dto)
    } catch (error) {
      console.error('Embedding re-generation failed for note:', noteId, error)
    }
  }),
)
