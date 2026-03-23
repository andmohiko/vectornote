import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deleteNoteOperation } from '@/infrastructure/firestore/notes'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'

export const useDeleteNoteMutation = () => {
  const { uid } = useFirebaseAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (noteId: string) => {
      if (!uid) throw new Error('認証エラー')
      await deleteNoteOperation(uid, noteId)
    },
    onSuccess: () => {
      toast.success('メモを削除しました')
      queryClient.invalidateQueries({ queryKey: ['notes', uid] })
    },
    onError: () => {
      toast.error('削除に失敗しました')
    },
  })
}
