import type { Note } from '@vectornote/common'
import dayjs from 'dayjs'
import { Pin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const MAX_VISIBLE_TAGS = 3

/** 本文をプレーンテキストの行配列に変換する(空行・コードブロック記法を除去、引用記法を剥がす) */
const toPlainLines = (content: string): string[] =>
  content
    .split('\n')
    .map((line) => (line.startsWith('> ') ? line.slice(2) : line))
    .filter((line) => line.trim() !== '' && !line.startsWith('```'))

type NoteListItemProps = {
  note: Note
  onClick: (note: Note) => void
}

export const NoteListItem = ({ note, onClick }: NoteListItemProps) => {
  const updatedAt = dayjs(note.updatedAt).format('YYYY.MM.DD HH:mm')
  const plainLines = toPlainLines(note.content)
  // タイトルがない場合は本文1行目を1行目に昇格する
  const primary = note.title || (plainLines[0] ?? '')
  const secondary = (note.title ? plainLines : plainLines.slice(1)).join(' ')

  return (
    <button
      type="button"
      className="w-full text-left"
      onClick={() => onClick(note)}
    >
      <div className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/50">
        <div className="flex items-center gap-2">
          <p className="flex-1 truncate text-sm font-medium text-foreground">
            {primary}
          </p>
          {note.isPinned && (
            <Pin className="size-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="shrink-0 text-xs text-muted-foreground">
            {updatedAt}
          </span>
        </div>
        {(secondary || note.tags.length > 0) && (
          <div className="flex items-center gap-2">
            <p className="flex-1 truncate text-xs text-muted-foreground">
              {secondary}
            </p>
            {note.tags.length > 0 && (
              <div className="flex shrink-0 items-center gap-1">
                {note.tags.slice(0, MAX_VISIBLE_TAGS).map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
                {note.tags.length > MAX_VISIBLE_TAGS && (
                  <span className="text-xs text-muted-foreground">
                    +{note.tags.length - MAX_VISIBLE_TAGS}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </button>
  )
}
