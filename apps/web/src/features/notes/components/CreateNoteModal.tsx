import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

  const handleSubmit = async (values: NoteFormValues) => {
    await mutateAsync(values)
    onClose()
  }

  const handleOpenAutoFocus = (e: Event) => {
    e.preventDefault()
    // ショートカットキーで開いた際に入力された文字をクリアするため、
    // フォームを再マウントしてから本文テキストエリアにフォーカスする
    setFormKey((k) => k + 1)
    setTimeout(() => {
      document.getElementById('content')?.focus()
    }, 0)
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex h-full max-h-[700px] w-full max-w-[800px] flex-col overflow-hidden sm:max-w-[800px]"
        onOpenAutoFocus={handleOpenAutoFocus}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>メモを作成</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <NoteForm
            key={formKey}
            expandContent
            onSubmit={handleSubmit}
            submitLabel="作成"
            isPending={isPending}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
