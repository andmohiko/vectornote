import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateNoteDto } from '@vectornote/common'
import { toast } from 'sonner'

import { createNoteOperation } from '@/infrastructure/firestore/notes'
import { serverTimestamp } from '@/lib/firebase'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'
import { errorMessage } from '@/utils/errorMessage'
import type { NoteFormValues } from '../schemas/noteSchema'

export const useCreateNoteMutation = () => {
  const { uid } = useFirebaseAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: NoteFormValues) => {
      if (!uid) throw new Error('認証エラー：再ログインしてください')

      const dto: CreateNoteDto = {
        content: values.content,
        title: values.title || null,
        keywords: values.keywords ?? '',
        tags: values.tags || [],
        embedding: null,
        createdAt: serverTimestamp,
        updatedAt: serverTimestamp,
      }

      await createNoteOperation(uid, dto)
    },
    onSuccess: () => {
      toast.success('メモを作成しました')
      queryClient.invalidateQueries({ queryKey: ['notes', uid] })
    },
    onError: (error) => {
      console.error(errorMessage(error))
      toast.error('メモの作成に失敗しました')
    },
  })
}
