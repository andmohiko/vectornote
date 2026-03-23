import type { Note } from '@vectornote/common'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useNotes } from '../hooks/useNotes'
import { NoteCard } from './NoteCard'
import { NoteDetailModal } from './NoteDetailModal'

type NoteListProps = {
  tag?: string
  onClickCreate: () => void
}

export const NoteList = ({ tag, onClickCreate }: NoteListProps) => {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
    refetch,
  } = useNotes(tag)

  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const observerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = observerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i.toString()} className="h-36 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">メモの取得に失敗しました。</p>
        <Button variant="outline" onClick={() => refetch()}>
          再試行
        </Button>
      </div>
    )
  }

  const notes = data?.pages.flatMap((page) => page.items) ?? []

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">
          メモがありません。最初のメモを作成しましょう。
        </p>
        <Button onClick={onClickCreate}>新規作成</Button>
      </div>
    )
  }

  return (
    <>
      <div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <NoteCard key={note.noteId} note={note} onClick={setSelectedNote} />
          ))}
        </div>
        <div ref={observerRef} className="mt-8 flex justify-center">
          {isFetchingNextPage && <Spinner className="size-6" />}
        </div>
      </div>
      <NoteDetailModal
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
      />
    </>
  )
}
