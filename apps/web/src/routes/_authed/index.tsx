import { createFileRoute } from '@tanstack/react-router'

import { NoteForm } from '@/features/notes/components/NoteForm'
import { useCreateNoteMutation } from '@/features/notes/hooks/useCreateNoteMutation'

export const Route = createFileRoute('/_authed/')({ component: HomePage })

function HomePage() {
  const { mutate, isPending } = useCreateNoteMutation()

  return (
    <main className="mx-auto max-w-2xl px-4 pb-8 pt-14">
      <h1 className="mb-8 text-2xl font-bold">新規メモ</h1>

      <NoteForm
        onSubmit={mutate}
        submitLabel="作成"
        isPending={isPending}
      />
    </main>
  )
}
