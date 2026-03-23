import { noteCollection, userCollection } from '@vectornote/common'
import type { Response } from 'express'
import { validationResult } from 'express-validator'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '~/lib/firebase'
import { getOpenAIClient } from '~/lib/openai'
import type { AuthenticatedRequest } from '~/middleware/auth'
import { convertDate } from '~/utils/convertDate'

const dateColumns = ['createdAt', 'updatedAt'] as const satisfies Array<string>

/**
 * セマンティック検索エンドポイント
 * クエリをベクトル化し、Firestore Vector Search で類似ノートを返す
 */
exports.handle = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() })
    }

    const { query, limit: resultLimit = 10, minSimilarity = 0.3 } = req.body
    const uid = req.uid

    // 1. クエリをベクトル化
    const openai = getOpenAIClient()
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    })
    const queryVector = embeddingResponse.data[0].embedding

    // 2. Firestore Vector Search で類似ノートを検索
    const notesRef = db
      .collection(userCollection)
      .doc(uid)
      .collection(noteCollection)

    const vectorQuery = notesRef.findNearest({
      vectorField: 'embedding',
      queryVector: FieldValue.vector(queryVector),
      limit: resultLimit,
      distanceMeasure: 'COSINE',
      distanceResultField: 'distance',
    })

    const snapshot = await vectorQuery.get()

    // 3. 結果を変換・フィルタ
    // COSINE距離を類似度に変換（similarity = 1 - distance）
    const results = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        const note = {
          noteId: doc.id,
          ...convertDate(data, dateColumns),
        }
        const distance = (data.distance as number) ?? 0
        const similarity = 1 - distance
        return { note, similarity }
      })
      .filter((result) => result.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)

    return res.status(200).json({ results })
  } catch (error) {
    console.error('Search failed:', error)
    return res.status(500).json({ error: '検索に失敗しました' })
  }
}
