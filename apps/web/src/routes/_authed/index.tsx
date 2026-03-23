import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { z } from 'zod'
import { CreateNoteButton } from '@/components/CreateNoteButton'
import { CreateNoteModal } from '@/features/notes/components/CreateNoteModal'
import { NoteList } from '@/features/notes/components/NoteList'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'

export const Route = createFileRoute('/_authed/')({
  validateSearch: z.object({ tag: z.string().optional() }),
  component: HomePage,
})

function HomePage() {
  const { tag } = Route.useSearch()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useKeyboardShortcut('c', useCallback((e) => {
    e.preventDefault()
    setIsCreateModalOpen(true)
  }, []))

  return (
    <main className="pb-8 pt-14">
      <section>
        <h2 className="mb-4 text-lg font-semibold">
          {tag ? `#${tag}` : 'メモ一覧'}
        </h2>
        <NoteList tag={tag} />
      </section>

      <CreateNoteButton onClick={() => setIsCreateModalOpen(true)} />

      <CreateNoteModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </main>
  )
}
