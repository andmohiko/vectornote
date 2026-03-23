import { Link } from '@tanstack/react-router'
import type { Note } from '@vectornote/common'
import dayjs from 'dayjs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'

type NoteCardProps = {
  note: Note
}

export const NoteCard = ({ note }: NoteCardProps) => {
  const updatedAt = dayjs(note.updatedAt).format('YYYY.MM.DD HH:mm')

  return (
    <Link
      to={'/note/$noteId' as never}
      params={{ noteId: note.noteId } as never}
    >
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardHeader>
          {note.title && (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {note.title}
            </p>
          )}
          <p className="line-clamp-3 text-sm text-foreground">{note.content}</p>
        </CardHeader>
        <CardContent className="flex-1">
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="border-0 bg-transparent">
          <span className="text-xs text-muted-foreground">{updatedAt}</span>
          {note.keywords && (
            <span className="ml-3 truncate text-xs text-muted-foreground">
              {note.keywords}
            </span>
          )}
        </CardFooter>
      </Card>
    </Link>
  )
}
