import { useMutation } from '@tanstack/react-query'
import type { CreateTemplateDto } from '@vectornote/common'
import { toast } from 'sonner'

import { createTemplateOperation } from '@/infrastructure/firestore/templates'
import { serverTimestamp } from '@/lib/firebase'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'
import { errorMessage } from '@/utils/errorMessage'
import type { TemplateFormValues } from '../schemas/templateSchema'

export const useCreateTemplateMutation = () => {
  const { uid } = useFirebaseAuthContext()

  return useMutation({
    mutationFn: async (values: TemplateFormValues) => {
      if (!uid) throw new Error('認証エラー：再ログインしてください')

      const dto: CreateTemplateDto = {
        body: values.body,
        defaultKeyword: values.defaultKeyword,
        defaultTags: values.defaultTags,
        defaultTitle: values.defaultTitle,
        name: values.name,
        createdAt: serverTimestamp,
        updatedAt: serverTimestamp,
      }

      await createTemplateOperation(uid, dto)
    },
    onSuccess: () => {
      toast.success('テンプレートを作成しました')
    },
    onError: (error) => {
      console.error(errorMessage(error))
      toast.error('テンプレートの作成に失敗しました')
    },
  })
}
