import { createFileRoute } from '@tanstack/react-router'
import { SearchResultList } from '@/features/search/components/SearchResultList'
import { useSearchNotes } from '@/features/search/hooks/useSearchNotes'

export const Route = createFileRoute('/_authed/search')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) || '',
  }),
  component: SearchPage,
})

function SearchPage() {
  const { q } = Route.useSearch()
  const { data, isLoading, isError, refetch } = useSearchNotes(q)

  return (
    <main className="mx-auto max-w-5xl px-4 pb-8 pt-14">
      {q && (
        <section>
          <SearchResultList
            query={q}
            results={data?.results}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
          />
        </section>
      )}
    </main>
  )
}
