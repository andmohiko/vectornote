import type { DocumentSnapshot, Unsubscribe } from 'firebase/firestore'
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  startAfter,
  where,
} from 'firebase/firestore'
import type { CreateNoteDto, Note, NoteId, UpdateNoteDto } from '@vectornote/common'
import { noteCollection, userCollection } from '@vectornote/common'
import type { Uid } from '@vectornote/common'

import { db } from '@/lib/firebase'
import { convertDate } from '@/utils/convertDate'

const dateColumns = ['createdAt', 'updatedAt'] as const satisfies Array<string>

export const PAGE_SIZE = 20

export type FetchResultWithPagination<T> = {
  items: Array<T>
  lastDoc: DocumentSnapshot | null
  hasMore: boolean
}

const notesRef = (uid: Uid) =>
  collection(db, userCollection, uid, noteCollection)

const noteDocRef = (uid: Uid, noteId: NoteId) =>
  doc(db, userCollection, uid, noteCollection, noteId)

/** メモを取得する */
export const fetchNoteOperation = async (
  uid: Uid,
  noteId: NoteId,
): Promise<Note | null> => {
  const snapshot = await getDoc(noteDocRef(uid, noteId))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return { noteId: snapshot.id, ...convertDate(data, dateColumns) } as Note
}

/** メモをリアルタイム購読する */
export const subscribeNoteOperation = (
  uid: Uid,
  noteId: NoteId,
  setter: (note: Note | null | undefined) => void,
): Unsubscribe => {
  return onSnapshot(noteDocRef(uid, noteId), (snapshot) => {
    const data = snapshot.data()
    if (!data) {
      setter(null)
      return
    }
    setter({ noteId: snapshot.id, ...convertDate(data, dateColumns) } as Note)
  })
}

/** メモ一覧を取得する（ページネーション対応） */
export const fetchNotesOperation = async (
  uid: Uid,
  pageSize: number,
  lastDocument: DocumentSnapshot | null,
  tag?: string,
): Promise<FetchResultWithPagination<Note>> => {
  const baseConstraints = tag
    ? [where('tags', 'array-contains', tag), orderBy('updatedAt', 'desc')]
    : [orderBy('updatedAt', 'desc')]
  const constraints = lastDocument
    ? [...baseConstraints, startAfter(lastDocument), limit(pageSize)]
    : [...baseConstraints, limit(pageSize)]

  const snapshot = await getDocs(query(notesRef(uid), ...constraints))
  const items = snapshot.docs.map(
    (d) => ({ noteId: d.id, ...convertDate(d.data(), dateColumns) }) as Note,
  )
  const lastDoc =
    snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1]
      : null
  const hasMore = snapshot.docs.length === pageSize

  return { items, lastDoc, hasMore }
}

/** メモ一覧をリアルタイム購読する */
export const subscribeNotesOperation = (
  uid: Uid,
  pageSize: number,
  setter: (notes: Array<Note>) => void,
): Unsubscribe => {
  const q = query(notesRef(uid), orderBy('updatedAt', 'desc'), limit(pageSize))
  return onSnapshot(q, (snapshot) => {
    const notes = snapshot.docs.map(
      (d) => ({ noteId: d.id, ...convertDate(d.data(), dateColumns) }) as Note,
    )
    setter(notes)
  })
}

/** 固定メモ一覧を取得する（ページネーション対応） */
export const fetchPinnedNotesOperation = async (
  uid: Uid,
  pageSize: number,
  lastDocument: DocumentSnapshot | null,
): Promise<FetchResultWithPagination<Note>> => {
  const baseConstraints = [
    where('isPinned', '==', true),
    orderBy('updatedAt', 'desc'),
  ]
  const constraints = lastDocument
    ? [...baseConstraints, startAfter(lastDocument), limit(pageSize)]
    : [...baseConstraints, limit(pageSize)]

  const snapshot = await getDocs(query(notesRef(uid), ...constraints))
  const items = snapshot.docs.map(
    (d) => ({ noteId: d.id, ...convertDate(d.data(), dateColumns) }) as Note,
  )
  const lastDoc =
    snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1]
      : null
  const hasMore = snapshot.docs.length === pageSize

  return { items, lastDoc, hasMore }
}

/** メモを作成する */
export const createNoteOperation = async (
  uid: Uid,
  dto: CreateNoteDto,
): Promise<void> => {
  await addDoc(notesRef(uid), dto)
}

/** メモを更新する */
export const updateNoteOperation = async (
  uid: Uid,
  noteId: NoteId,
  dto: UpdateNoteDto,
): Promise<void> => {
  await updateDoc(noteDocRef(uid, noteId), dto)
}

/** メモを削除する */
export const deleteNoteOperation = async (
  uid: Uid,
  noteId: NoteId,
): Promise<void> => {
  await deleteDoc(noteDocRef(uid, noteId))
}
