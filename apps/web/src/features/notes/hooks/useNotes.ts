import { useInfiniteQuery } from '@tanstack/react-query'
import type { DocumentSnapshot } from 'firebase/firestore'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'
import { fetchNotesOperation, PAGE_SIZE } from '@/infrastructure/firestore/notes'

export const notesQueryKey = (uid: string, tag?: string) =>
  tag ? (['notes', uid, { tag }] as const) : (['notes', uid] as const)

export const useNotes = (tag?: string) => {
  const { uid } = useFirebaseAuthContext()

  return useInfiniteQuery({
    queryKey: notesQueryKey(uid!, tag),
    queryFn: async ({ pageParam }: { pageParam: DocumentSnapshot | null }) => {
      return fetchNotesOperation(uid!, PAGE_SIZE, pageParam, tag)
    },
    initialPageParam: null as DocumentSnapshot | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.lastDoc : undefined,
    enabled: !!uid,
  })
}
