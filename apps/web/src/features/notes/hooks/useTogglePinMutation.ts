import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UpdateNoteDto } from '@vectornote/common'
import { toast } from 'sonner'
import { updateNoteOperation } from '@/infrastructure/firestore/notes'
import { serverTimestamp } from '@/lib/firebase'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'

export const useTogglePinMutation = (noteId: string) => {
  const { uid } = useFirebaseAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (isPinned: boolean) => {
      if (!uid) throw new Error('認証エラー')

      const dto: UpdateNoteDto = {
        isPinned: !isPinned,
        updatedAt: serverTimestamp,
        updatedBy: 'user' as const,
      }

      await updateNoteOperation(uid, noteId, dto)
    },
    onSuccess: (_data, isPinned) => {
      toast.success(isPinned ? '固定を解除しました' : 'メモを固定しました')
    },
    onError: () => {
      toast.error('更新に失敗しました')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', uid] })
    },
  })
}
