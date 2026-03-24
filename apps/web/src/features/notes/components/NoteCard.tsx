import type { Note } from '@vectornote/common'
import dayjs from 'dayjs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { OgpPreview } from './OgpPreview'

const URL_REGEX = /https?:\/\/[^\s]+/g

const renderContentWithLinks = (text: string) => {
  const parts = text.split(URL_REGEX)
  const matches = text.match(URL_REGEX) ?? []

  return parts.flatMap((part, i) => {
    if (i < matches.length) {
      return [
        part,
        <a
          key={i}
          href={matches[i]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
          onClick={(e) => e.stopPropagation()}
        >
          {matches[i]}
        </a>,
      ]
    }
    return [part]
  })
}

type NoteCardProps = {
  note: Note
  onClick: (note: Note) => void
}

export const NoteCard = ({ note, onClick }: NoteCardProps) => {
  const updatedAt = dayjs(note.updatedAt).format('YYYY.MM.DD HH:mm')

  return (
    <button
      type="button"
      className="h-full w-full text-left"
      onClick={() => onClick(note)}
    >
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardHeader>
          {note.title && (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {note.title}
            </p>
          )}
          <p className="line-clamp-10 whitespace-pre-line text-sm text-foreground">{renderContentWithLinks(note.content)}</p>
        </CardHeader>
        <CardContent className="flex-1">
          {note.ogp && <OgpPreview ogp={note.ogp} />}
        </CardContent>
        <CardFooter className="flex-col items-start gap-2 border-0 bg-transparent">
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex items-center">
            <span className="text-xs text-muted-foreground">{updatedAt}</span>
            {note.keywords && (
              <span className="ml-3 truncate text-xs text-muted-foreground">
                {note.keywords}
              </span>
            )}
          </div>
        </CardFooter>
      </Card>
    </button>
  )
}
