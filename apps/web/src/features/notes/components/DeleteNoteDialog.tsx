import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { useDeleteNoteMutation } from '../hooks/useDeleteNoteMutation'

type DeleteNoteDialogProps = {
  noteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export const DeleteNoteDialog = ({
  noteId,
  open,
  onOpenChange,
  onDeleted,
}: DeleteNoteDialogProps) => {
  const { mutateAsync, isPending } = useDeleteNoteMutation()

  const handleDelete = async () => {
    await mutateAsync(noteId)
    onDeleted()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>メモを削除しますか？</DialogTitle>
          <DialogDescription>この操作は取り消せません。</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            キャンセル
          </Button>
          <Button
            className="border-transparent bg-red-600 text-white hover:bg-red-700 hover:text-white"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending && <Spinner className="mr-2" />}
            削除する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
