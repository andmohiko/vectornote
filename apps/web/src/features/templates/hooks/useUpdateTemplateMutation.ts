import { useMutation } from '@tanstack/react-query'
import type { TemplateId, UpdateTemplateDto } from '@vectornote/common'
import { toast } from 'sonner'

import { updateTemplateOperation } from '@/infrastructure/firestore/templates'
import { serverTimestamp } from '@/lib/firebase'
import { useFirebaseAuthContext } from '@/providers/FirebaseAuthProvider'
import { errorMessage } from '@/utils/errorMessage'
import type { TemplateFormValues } from '../schemas/templateSchema'

type UpdateTemplateInput = {
  templateId: TemplateId
  values: TemplateFormValues
}

export const useUpdateTemplateMutation = () => {
  const { uid } = useFirebaseAuthContext()

  return useMutation({
    mutationFn: async ({ templateId, values }: UpdateTemplateInput) => {
      if (!uid) throw new Error('認証エラー：再ログインしてください')

      const dto: UpdateTemplateDto = {
        body: values.body,
        defaultKeyword: values.defaultKeyword,
        defaultTags: values.defaultTags,
        defaultTitle: values.defaultTitle,
        name: values.name,
        updatedAt: serverTimestamp,
      }

      await updateTemplateOperation(uid, templateId, dto)
    },
    onSuccess: () => {
      toast.success('テンプレートを更新しました')
    },
    onError: (error) => {
      console.error(errorMessage(error))
      toast.error('テンプレートの更新に失敗しました')
    },
  })
}
