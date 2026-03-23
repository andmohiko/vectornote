import type { FieldValue, VectorValue } from 'firebase/firestore'

/** コレクション名 */
export const noteCollection = 'notes' as const

/** ID型エイリアス */
export type NoteId = string

/** Entity型（Firestoreから取得したデータ、Date変換済み） */
export type Note = {
  noteId: NoteId
  createdAt: Date
  content: string
  embedding: VectorValue | null
  keywords: string[]
  tags: string[]
  title: string | null
  updatedAt: Date
}

/** 作成用DTO */
export type CreateNoteDto = Omit<
  Note,
  'noteId' | 'createdAt' | 'updatedAt'
> & {
  createdAt: FieldValue
  updatedAt: FieldValue
}

/** 更新用DTO */
export type UpdateNoteDto = {
  content?: Note['content']
  keywords?: Note['keywords']
  tags?: Note['tags']
  title?: Note['title']
  updatedAt: FieldValue
}
