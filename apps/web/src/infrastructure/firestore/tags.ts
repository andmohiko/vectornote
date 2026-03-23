import type { Unsubscribe } from 'firebase/firestore'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import type { Tag, Uid } from '@vectornote/common'
import { tagCollection, userCollection } from '@vectornote/common'

import { db } from '@/lib/firebase'
import { convertDate } from '@/utils/convertDate'

const dateColumns = ['createdAt', 'updatedAt'] as const satisfies Array<string>

const tagsRef = (uid: Uid) =>
  collection(db, userCollection, uid, tagCollection)

/** タグ一覧をリアルタイム購読する（label 昇順） */
export const subscribeTagsOperation = (
  uid: Uid,
  setter: (tags: Array<Tag>) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const q = query(tagsRef(uid), orderBy('label', 'asc'))
  return onSnapshot(
    q,
    (snapshot) => {
      const tags = snapshot.docs.map(
        (d) => ({ tagId: d.id, ...convertDate(d.data(), dateColumns) }) as Tag,
      )
      setter(tags)
    },
    onError,
  )
}
