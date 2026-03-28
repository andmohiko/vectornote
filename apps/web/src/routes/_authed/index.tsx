import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'
import { CreateNoteButton } from '@/components/CreateNoteButton'
import { CreateNoteModal } from '@/features/notes/components/CreateNoteModal'
import { NoteList } from '@/features/notes/components/NoteList'
import { useDisclosure } from '@/hooks/useDisclosure'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'

export const Route = createFileRoute('/_authed/')({
  validateSearch: z.object({ tag: z.string().optional() }),
  component: HomePage,
})

function HomePage() {
  const { tag } = Route.useSearch()
  const { isOpen: isCreateModalOpen, open: openCreateModal, close: closeCreateModal } = useDisclosure()

  useKeyboardShortcut('c', useCallback((e) => {
    e.preventDefault()
    openCreateModal()
  }, [openCreateModal]))

  return (
    <main className="pb-8 pt-4">
      <section>
        {tag && (
          <h2 className="mb-4 text-lg font-semibold">
            #{tag}
          </h2>
        )}
        <NoteList tag={tag} onClickCreate={openCreateModal} />
      </section>

      <CreateNoteButton onClick={openCreateModal} />

      <CreateNoteModal
        open={isCreateModalOpen}
        onClose={closeCreateModal}
      />
    </main>
  )
}
