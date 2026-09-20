import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/demo/tanstack-query')({
  component: TanStackQueryDemo,
})

function TanStackQueryDemo() {
  const { data } = useQuery({
    queryKey: ['todos'],
    queryFn: () =>
      Promise.resolve([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ]),
    initialData: [],
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-2xl rounded-lg border bg-card p-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">
          TanStack Query Simple Promise Handling
        </h1>
        <ul className="mb-4 space-y-2">
          {data.map((todo) => (
            <li key={todo.id} className="rounded-md border bg-muted p-4">
              <span className="text-base text-foreground">{todo.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
