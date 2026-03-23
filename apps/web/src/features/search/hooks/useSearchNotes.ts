import { useQuery } from '@tanstack/react-query'
import { searchNotesApi } from '@/infrastructure/api/searchApi'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'

export const searchNotesQueryKey = (query: string) =>
  ['searchNotes', query] as const

export const useSearchNotes = (query: string) => {
  const { uid } = useFirebaseAuthContext()

  return useQuery({
    queryKey: searchNotesQueryKey(query),
    queryFn: () => searchNotesApi({ query }),
    enabled: !!uid && query.length > 0,
  })
}
