import type { Note } from '@vectornote/common'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useUpdateNoteMutation } from '../hooks/useUpdateNoteMutation'
import type { NoteFormValues } from '../schemas/noteSchema'
import { NoteForm } from './NoteForm'

type NoteDetailModalProps = {
  note: Note | null
  onClose: () => void
}

export const NoteDetailModal = ({ note, onClose }: NoteDetailModalProps) => {
  const { mutateAsync, isPending } = useUpdateNoteMutation(note?.noteId ?? '')

  const handleSubmit = async (values: NoteFormValues) => {
    await mutateAsync(values)
    onClose()
  }

  return (
    <Dialog open={!!note} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {note && (
          <>
            <DialogHeader>
              <DialogTitle>メモを編集</DialogTitle>
            </DialogHeader>
            <NoteForm
              onSubmit={handleSubmit}
              defaultValues={{
                content: note.content,
                title: note.title ?? '',
                keywords: note.keywords ?? '',
                tags: note.tags,
              }}
              submitLabel="更新"
              isPending={isPending}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
