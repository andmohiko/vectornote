import type {
  CreateTagDtoFromAdmin,
  Tag,
  TagId,
  Uid,
  UpdateTagDtoFromAdmin,
} from '@vectornote/common'
import { tagCollection, userCollection } from '@vectornote/common'

import { db } from '~/lib/firebase'
import { convertDate } from '~/utils/convertDate'

const dateColumns = ['createdAt', 'updatedAt'] as const satisfies Array<string>

const tagsRef = (uid: Uid) =>
  db.collection(userCollection).doc(uid).collection(tagCollection)

const tagDocRef = (uid: Uid, tagId: TagId) => tagsRef(uid).doc(tagId)

/** タグを取得する */
export const fetchTagOperation = async (
  uid: Uid,
  tagId: TagId,
): Promise<Tag | null> => {
  const snapshot = await tagDocRef(uid, tagId).get()
  if (!snapshot.exists) return null
  const data = snapshot.data()
  if (!data) return null
  return { tagId: snapshot.id, ...convertDate(data, dateColumns) } as Tag
}

/** タグを作成する（タグIDにはラベル名を使用） */
export const createTagOperation = async (
  uid: Uid,
  tagId: TagId,
  dto: CreateTagDtoFromAdmin,
): Promise<void> => {
  await tagDocRef(uid, tagId).set(dto)
}

/** タグを更新する */
export const updateTagOperation = async (
  uid: Uid,
  tagId: TagId,
  dto: UpdateTagDtoFromAdmin,
): Promise<void> => {
  await tagDocRef(uid, tagId).update(dto)
}

/** タグを削除する */
export const deleteTagOperation = async (
  uid: Uid,
  tagId: TagId,
): Promise<void> => {
  await tagDocRef(uid, tagId).delete()
}
