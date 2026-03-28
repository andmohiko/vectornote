import { Link, createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { z } from 'zod'
import { CreateNoteButton } from '@/components/CreateNoteButton'
import { CreateNoteModal } from '@/features/notes/components/CreateNoteModal'
import { NoteList } from '@/features/notes/components/NoteList'
import { useTags } from '@/features/tags/hooks/useTags'
import { useDisclosure } from '@/hooks/useDisclosure'
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut'

const TOP_TAGS_COUNT = 10

export const Route = createFileRoute('/_authed/')({
  validateSearch: z.object({ tag: z.string().optional() }),
  component: HomePage,
})

function HomePage() {
  const { tag } = Route.useSearch()
  const { tags } = useTags()
  const topTags = tags.slice(0, TOP_TAGS_COUNT)
  const { isOpen: isCreateModalOpen, open: openCreateModal, close: closeCreateModal } = useDisclosure()

  useKeyboardShortcut('c', useCallback((e) => {
    e.preventDefault()
    openCreateModal()
  }, [openCreateModal]))

  return (
    <main className="pb-8 pt-4">
      <nav className="mb-4 flex gap-2 overflow-x-auto">
        <Link
          to="/"
          search={{}}
          className={`shrink-0 rounded-full border px-3 py-1 text-sm transition-colors ${
            !tag
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-accent'
          }`}
        >
          すべて
        </Link>
        {topTags.map((t) => (
          <Link
            key={t.tagId}
            to="/"
            search={{ tag: t.label }}
            className={`shrink-0 rounded-full border px-3 py-1 text-sm transition-colors ${
              tag === t.label
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-accent'
            }`}
          >
            #{t.label}
          </Link>
        ))}
      </nav>

      <section>
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
