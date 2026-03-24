import type { Template } from '@vectornote/common'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUpdateTemplateMutation } from '../hooks/useUpdateTemplateMutation'
import type { TemplateFormValues } from '../schemas/templateSchema'
import { TemplateForm } from './TemplateForm'

type EditTemplateModalProps = {
  template: Template
  open: boolean
  onClose: () => void
}

export const EditTemplateModal = ({
  template,
  open,
  onClose,
}: EditTemplateModalProps) => {
  const { mutateAsync, isPending } = useUpdateTemplateMutation()

  const handleSubmit = async (values: TemplateFormValues) => {
    await mutateAsync({ templateId: template.templateId, values })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-full max-h-[700px] w-full max-w-[800px] flex-col overflow-hidden sm:max-w-[800px]">
        <DialogHeader className="shrink-0">
          <DialogTitle>テンプレートを編集</DialogTitle>
          <DialogDescription className="sr-only">テンプレートの内容を編集します</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <TemplateForm
            onSubmit={handleSubmit}
            defaultValues={{
              name: template.name,
              body: template.body,
              defaultTitle: template.defaultTitle,
              defaultKeyword: template.defaultKeyword,
              defaultTags: template.defaultTags,
            }}
            submitLabel="更新"
            isPending={isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
