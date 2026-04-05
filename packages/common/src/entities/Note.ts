import type { FieldValue, VectorValue } from 'firebase/firestore'
import type { FieldValue as AdminFieldValue } from 'firebase-admin/firestore'

/** コレクション名 */
export const noteCollection = 'notes' as const

/** ID型エイリアス */
export type NoteId = string

/** OGP情報 */
export type OgpInfo = {
  url: string
  title: string | null
  description: string | null
  image: string | null
}

/** ドキュメント更新の操作主 */
export type UpdatedBy = 'trigger' | 'user'

/** Entity型（Firestoreから取得したデータ、Date変換済み） */
export type Note = {
  noteId: NoteId
  createdAt: Date
  content: string
  embedding: VectorValue | null
  isPinned: boolean
  ogp: OgpInfo | null
  keywords: string
  tags: string[]
  title: string | null
  updatedAt: Date
  updatedBy: UpdatedBy
}

/** 作成用DTO */
export type CreateNoteDto = Omit<Note, 'noteId' | 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue
  updatedAt: FieldValue
}

/** 更新用DTO */
export type UpdateNoteDto = {
  content?: Note['content']
  isPinned?: Note['isPinned']
  keywords?: Note['keywords']
  ogp?: Note['ogp']
  tags?: Note['tags']
  title?: Note['title']
  updatedAt: FieldValue
  updatedBy?: UpdatedBy
}

/** firebase-admin を使用した更新用DTO */
export type UpdateNoteDtoFromAdmin = {
  content?: Note['content']
  embedding?: AdminFieldValue
  ogp?: Note['ogp']
  updatedAt: AdminFieldValue
  updatedBy?: UpdatedBy
}

/** 検索結果型 */
export type SearchResult = {
  note: Note
  similarity: number // 0.0 ~ 1.0
}
