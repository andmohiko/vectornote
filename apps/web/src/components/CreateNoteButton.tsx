import { Plus } from 'lucide-react'

type CreateNoteButtonProps = {
  onClick: () => void
}

export const CreateNoteButton = ({ onClick }: CreateNoteButtonProps) => {
  return (
    <button
      type="button"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-md border border-transparent bg-primary text-primary-foreground transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      onClick={onClick}
      aria-label="メモを作成"
    >
      <Plus className="h-6 w-6" />
    </button>
  )
}
