import type { Note } from '@vectornote/common'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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

  const handleSubmit = async (values: NoteFormValues) => {
    await mutateAsync(values)
    onClose()
  }

  return (
    <>
      <Dialog open={!!note} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex h-full max-h-[700px] w-full max-w-[800px] flex-col overflow-hidden sm:max-w-[800px]">
          {note && (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle>メモを編集</DialogTitle>
              </DialogHeader>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              <NoteForm
                expandContent
                onSubmit={handleSubmit}
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
