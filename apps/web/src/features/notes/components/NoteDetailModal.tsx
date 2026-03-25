import type { Note } from '@vectornote/common'
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDisclosure } from '@/hooks/useDisclosure'
import { useUpdateNoteMutation } from '../hooks/useUpdateNoteMutation'
import type { NoteFormValues } from '../schemas/noteSchema'
import { DeleteNoteDialog } from './DeleteNoteDialog'
import { NoteForm } from './NoteForm'

type NoteDetailModalProps = {
  note: Note | null
  onClose: () => void
}

export const NoteDetailModal = ({ note, onClose }: NoteDetailModalProps) => {
  const { mutateAsync, isPending } = useUpdateNoteMutation(note?.noteId ?? '')
  const { isOpen: deleteDialogOpen, open: openDeleteDialog, close: closeDeleteDialog } = useDisclosure()
  const [isCopied, setIsCopied] = useState(false)

  const handleCopyContent = async () => {
    if (!note) return
    try {
      await navigator.clipboard.writeText(note.content)
      setIsCopied(true)
      toast.success('本文をコピーしました')
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      toast.error('コピーに失敗しました')
    }
  }

  const handleSubmit = async (values: NoteFormValues) => {
    await mutateAsync(values)
    onClose()
  }

  const handleSave = async (values: NoteFormValues) => {
    await mutateAsync(values)
  }

  return (
    <>
      <Dialog open={!!note} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex h-full max-h-[700px] w-full max-w-[800px] flex-col overflow-hidden sm:max-w-[800px]">
          {note && (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle>メモを編集</DialogTitle>
                <DialogDescription className="sr-only">メモの内容を編集します</DialogDescription>
              </DialogHeader>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <NoteForm
                expandContent
                autoFocusContent
                onSubmit={handleSubmit}
                onSaveShortcut={handleSave}
                contentLabelRight={
                  <button
                    type="button"
                    className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={handleCopyContent}
                    aria-label="本文をコピー"
                  >
                    {isCopied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </button>
                }
                defaultValues={{
                  content: note.content,
                  title: note.title ?? '',
                  keywords: note.keywords ?? '',
                  tags: note.tags,
                }}
                submitLabel="更新"
                isPending={isPending}
                footerLeft={
                  <Button
                    type="button"
                    size="sm"
                    className="border-transparent bg-red-600 text-white hover:bg-red-700 hover:text-white"
                    onClick={openDeleteDialog}
                  >
                    削除
                  </Button>
                }
              />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {note && (
        <DeleteNoteDialog
          noteId={note.noteId}
          open={deleteDialogOpen}
          onOpenChange={(open) => open ? openDeleteDialog() : closeDeleteDialog()}
          onDeleted={onClose}
        />
      )}
    </>
  )
}
