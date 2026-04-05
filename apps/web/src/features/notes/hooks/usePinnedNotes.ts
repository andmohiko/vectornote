import { useInfiniteQuery } from '@tanstack/react-query'
import type { DocumentSnapshot } from 'firebase/firestore'
import {
  fetchPinnedNotesOperation,
  PAGE_SIZE,
} from '@/infrastructure/firestore/notes'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'

export const pinnedNotesQueryKey = (uid: string) =>
  ['notes', uid, { pinned: true }] as const

export const usePinnedNotes = () => {
  const { uid } = useFirebaseAuthContext()
  if (!uid) {
    throw new Error('User must be authenticated to use pinned notes')
  }

  return useInfiniteQuery({
    queryKey: pinnedNotesQueryKey(uid),
    queryFn: async ({ pageParam }: { pageParam: DocumentSnapshot | null }) => {
      return fetchPinnedNotesOperation(uid, PAGE_SIZE, pageParam)
    },
    initialPageParam: null as DocumentSnapshot | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.lastDoc : undefined,
    enabled: !!uid,
  })
}
