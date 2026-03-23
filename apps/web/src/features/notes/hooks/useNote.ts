import { useQuery } from '@tanstack/react-query'
import { fetchNoteOperation } from '@/infrastructure/firestore/notes'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'

export const noteQueryKey = (uid: string, noteId: string) =>
  ['notes', uid, noteId] as const

export const useNote = (noteId: string) => {
  const { uid } = useFirebaseAuthContext()

  return useQuery({
    queryKey: noteQueryKey(uid!, noteId),
    queryFn: () => fetchNoteOperation(uid!, noteId),
    enabled: !!uid,
  })
}
