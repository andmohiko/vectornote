import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Note, UpdateNoteDto } from '@vectornote/common'
import { toast } from 'sonner'
import { updateNoteOperation } from '@/infrastructure/firestore/notes'
import { serverTimestamp } from '@/lib/firebase'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'
import type { NoteFormValues } from '../schemas/noteSchema'
import { noteQueryKey } from './useNote'

export const useUpdateNoteMutation = (noteId: string) => {
  const { uid } = useFirebaseAuthContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: NoteFormValues) => {
      if (!uid) throw new Error('認証エラー')

      const dto: UpdateNoteDto = {
        content: values.content,
        title: values.title || '',
        keywords: values.keywords ?? '',
        tags: values.tags || [],
        updatedAt: serverTimestamp,
      }

      await updateNoteOperation(uid, noteId, dto)
    },
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: noteQueryKey(uid!, noteId) })
      const previous = queryClient.getQueryData<Note>(
        noteQueryKey(uid!, noteId),
      )

      queryClient.setQueryData(
        noteQueryKey(uid!, noteId),
        (old: Note | undefined) => {
          if (!old) return old
          return { ...old, ...values, updatedAt: new Date() }
        },
      )

      return { previous }
    },
    onError: (_err, _values, context) => {
      if (context?.previous) {
        queryClient.setQueryData(noteQueryKey(uid!, noteId), context.previous)
      }
      toast.error('更新に失敗しました')
    },
    onSuccess: () => {
      toast.success('メモを更新しました')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: noteQueryKey(uid!, noteId) })
      queryClient.invalidateQueries({ queryKey: ['notes', uid] })
    },
  })
}
