import { useState } from 'react'
import type { SearchResult } from '@vectornote/common'
import type { Note } from '@vectornote/common'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NoteCard } from '@/features/notes/components/NoteCard'
import { NoteDetailModal } from '@/features/notes/components/NoteDetailModal'

type SearchResultListProps = {
  query: string
  results: SearchResult[] | undefined
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

export const SearchResultList = ({
  query,
  results,
  isLoading,
  isError,
  onRetry,
}: SearchResultListProps) => {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">検索中にエラーが発生しました</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          再試行
        </Button>
      </div>
    )
  }

  if (!results || results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm font-medium">検索結果が見つかりませんでした</p>
        <p className="text-xs text-muted-foreground">
          別のキーワードや、より具体的な表現を試してみてください
        </p>
      </div>
    )
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        「{query}」の検索結果: {results.length}件
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map(({ note, similarity }) => (
          <div key={note.noteId} className="relative">
            <Badge
              variant="secondary"
              className="absolute right-2 top-2 z-10 text-xs"
            >
              {Math.round(similarity * 100)}%
            </Badge>
            <NoteCard note={note} onClick={setSelectedNote} />
          </div>
        ))}
      </div>

      <NoteDetailModal
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
      />
    </>
  )
}
