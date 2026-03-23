import { useInfiniteQuery } from '@tanstack/react-query'
import type { DocumentSnapshot } from 'firebase/firestore'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'
import { fetchNotesOperation, PAGE_SIZE } from '@/infrastructure/firestore/notes'

export const notesQueryKey = (uid: string) => ['notes', uid] as const

export const useNotes = () => {
  const { uid } = useFirebaseAuthContext()

  return useInfiniteQuery({
    queryKey: notesQueryKey(uid!),
    queryFn: async ({ pageParam }: { pageParam: DocumentSnapshot | null }) => {
      return fetchNotesOperation(uid!, PAGE_SIZE, pageParam)
    },
    initialPageParam: null as DocumentSnapshot | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.lastDoc : undefined,
    enabled: !!uid,
  })
}
