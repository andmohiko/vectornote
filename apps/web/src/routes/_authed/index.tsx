import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { Separator } from '@/components/ui/separator'
import { NoteForm } from '@/features/notes/components/NoteForm'
import { NoteList } from '@/features/notes/components/NoteList'
import { useCreateNoteMutation } from '@/features/notes/hooks/useCreateNoteMutation'

export const Route = createFileRoute('/_authed/')({
  validateSearch: z.object({ tag: z.string().optional() }),
  component: HomePage,
})

function HomePage() {
  const { mutateAsync, isPending } = useCreateNoteMutation()
  const { tag } = Route.useSearch()

  return (
    <main className="pb-8 pt-14">
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">新規作成</h2>
        <NoteForm onSubmit={mutateAsync} submitLabel="作成" isPending={isPending} resetOnSuccess />
      </section>

      <Separator className="mb-8" />

      <section>
        <h2 className="mb-4 text-lg font-semibold">
          {tag ? `#${tag}` : 'メモ一覧'}
        </h2>
        <NoteList tag={tag} />
      </section>
    </main>
  )
}
