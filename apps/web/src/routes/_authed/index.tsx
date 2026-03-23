import { createFileRoute } from '@tanstack/react-router'
import { NoteForm } from '@/features/notes/components/NoteForm'
import { NoteList } from '@/features/notes/components/NoteList'
import { useCreateNoteMutation } from '@/features/notes/hooks/useCreateNoteMutation'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_authed/')({ component: HomePage })

function HomePage() {
  const { mutate, isPending } = useCreateNoteMutation()

  return (
    <main className="mx-auto max-w-5xl px-4 pb-8 pt-14">
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold">新規作成</h2>
        <NoteForm onSubmit={mutate} submitLabel="作成" isPending={isPending} />
      </section>

      <Separator className="mb-8" />

      <section>
        <h2 className="mb-4 text-lg font-semibold">メモ一覧</h2>
        <NoteList />
      </section>
    </main>
  )
}
