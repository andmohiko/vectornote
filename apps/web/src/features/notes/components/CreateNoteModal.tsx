import { useState } from 'react'
import type { Template } from '@vectornote/common'
import { FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TemplateSelectModal } from '@/features/templates/components/TemplateSelectModal'
import { useDisclosure } from '@/hooks/useDisclosure'
import { useCreateNoteMutation } from '../hooks/useCreateNoteMutation'
import type { NoteFormValues } from '../schemas/noteSchema'
import { NoteForm } from './NoteForm'

type CreateNoteModalProps = {
  open: boolean
  onClose: () => void
}

export const CreateNoteModal = ({ open, onClose }: CreateNoteModalProps) => {
  const { mutateAsync, isPending } = useCreateNoteMutation()
  const [formKey, setFormKey] = useState(0)
  const [templateDefaults, setTemplateDefaults] = useState<Partial<NoteFormValues>>()
  const {
    isOpen: isTemplateSelectOpen,
    open: openTemplateSelect,
    close: closeTemplateSelect,
  } = useDisclosure()

  const handleSubmit = async (values: NoteFormValues) => {
    await mutateAsync(values)
    onClose()
  }

  const handleTemplateSelect = (template: Template) => {
    setTemplateDefaults({
      content: template.body,
      title: template.defaultTitle,
      keywords: template.defaultKeyword,
      tags: template.defaultTags,
    })
    setFormKey((k) => k + 1)
    closeTemplateSelect()
  }

  const handleOpenAutoFocus = (e: Event) => {
    e.preventDefault()
    // ショートカットキーで開いた際に入力された文字をクリアするため、
    // フォームを再マウントしてから本文テキストエリアにフォーカスする
    setFormKey((k) => k + 1)
    setTemplateDefaults(undefined)
    setTimeout(() => {
      document.getElementById('content')?.focus()
    }, 0)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="flex h-full max-h-[700px] w-full max-w-[800px] flex-col overflow-hidden sm:max-w-[800px]"
          onOpenAutoFocus={handleOpenAutoFocus}
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>メモを作成</DialogTitle>
            <DialogDescription className="sr-only">新しいメモを作成します</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <NoteForm
              key={formKey}
              expandContent
              onSubmit={handleSubmit}
              submitLabel="作成"
              isPending={isPending}
              defaultValues={templateDefaults}
              footerLeft={
                <Button
                  type="button"
                  variant="outline"
                  onClick={openTemplateSelect}
                >
                  <FileText className="mr-2 size-4" />
                  テンプレートを選択
                </Button>
              }
            />
          </div>
        </DialogContent>
      </Dialog>

      <TemplateSelectModal
        open={isTemplateSelectOpen}
        onClose={closeTemplateSelect}
        onSelect={handleTemplateSelect}
      />
    </>
  )
}
