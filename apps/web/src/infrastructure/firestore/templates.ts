import type {
  CreateTemplateDto,
  Template,
  TemplateId,
  Uid,
  UpdateTemplateDto,
} from '@vectornote/common'
import { templateCollection, userCollection } from '@vectornote/common'
import type { Unsubscribe } from 'firebase/firestore'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'
import { convertDate } from '@/utils/convertDate'

const dateColumns = ['createdAt', 'updatedAt'] as const satisfies Array<string>

const templatesRef = (uid: Uid) =>
  collection(db, userCollection, uid, templateCollection)

const templateDocRef = (uid: Uid, templateId: TemplateId) =>
  doc(db, userCollection, uid, templateCollection, templateId)

/** テンプレート一覧をリアルタイム購読する（作成日時昇順） */
export const subscribeTemplatesOperation = (
  uid: Uid,
  setter: (templates: Array<Template>) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const q = query(templatesRef(uid), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    (snapshot) => {
      const templates = snapshot.docs.map(
        (d) =>
          ({
            templateId: d.id,
            ...convertDate(d.data(), dateColumns),
          }) as Template,
      )
      setter(templates)
    },
    onError,
  )
}

/** テンプレートを作成する */
export const createTemplateOperation = async (
  uid: Uid,
  dto: CreateTemplateDto,
): Promise<void> => {
  await addDoc(templatesRef(uid), dto)
}

/** テンプレートを更新する */
export const updateTemplateOperation = async (
  uid: Uid,
  templateId: TemplateId,
  dto: UpdateTemplateDto,
): Promise<void> => {
  await updateDoc(templateDocRef(uid, templateId), dto)
}

/** テンプレートを削除する */
export const deleteTemplateOperation = async (
  uid: Uid,
  templateId: TemplateId,
): Promise<void> => {
  await deleteDoc(templateDocRef(uid, templateId))
}
