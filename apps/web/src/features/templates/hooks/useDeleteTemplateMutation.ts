import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { deleteTemplateOperation } from '@/infrastructure/firestore/templates'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'

export const useDeleteTemplateMutation = () => {
  const { uid } = useFirebaseAuthContext()

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!uid) throw new Error('認証エラー')
      await deleteTemplateOperation(uid, templateId)
    },
    onSuccess: () => {
      toast.success('テンプレートを削除しました')
    },
    onError: () => {
      toast.error('テンプレートの削除に失敗しました')
    },
  })
}
