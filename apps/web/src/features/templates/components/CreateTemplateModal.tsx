import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateTemplateMutation } from '../hooks/useCreateTemplateMutation'
import type { TemplateFormValues } from '../schemas/templateSchema'
import { TemplateForm } from './TemplateForm'

type CreateTemplateModalProps = {
  open: boolean
  onClose: () => void
}

export const CreateTemplateModal = ({
  open,
  onClose,
}: CreateTemplateModalProps) => {
  const { mutateAsync, isPending } = useCreateTemplateMutation()

  const handleSubmit = async (values: TemplateFormValues) => {
    await mutateAsync(values)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-full max-h-[90dvh] w-full max-w-[800px] flex-col overflow-hidden sm:max-h-[700px] sm:max-w-[800px]">
        <DialogHeader className="shrink-0">
          <DialogTitle>テンプレートを作成</DialogTitle>
          <DialogDescription className="sr-only">新しいテンプレートを作成します</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <TemplateForm
            onSubmit={handleSubmit}
            submitLabel="作成"
            isPending={isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
