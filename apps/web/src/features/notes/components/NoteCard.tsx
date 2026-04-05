import type { Note } from '@vectornote/common'
import dayjs from 'dayjs'
import { Pin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { OgpPreview } from './OgpPreview'

const URL_REGEX = /https?:\/\/[^\s]+/g

const INLINE_CODE_REGEX = /`([^`]+)`/g

/** テキスト内のURLをリンクに変換する */
const renderTextWithLinks = (text: string, keyPrefix: string) => {
  const parts = text.split(URL_REGEX)
  const matches = text.match(URL_REGEX) ?? []

  return parts.flatMap((part, i) => {
    if (i < matches.length) {
      return [
        part,
        <a
          key={`${keyPrefix}-${i.toString()}`}
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

/** テキスト内のインラインコードを処理してから、URLリンクに変換する */
const renderInlineContent = (text: string, keyPrefix: string) => {
  const parts = text.split(INLINE_CODE_REGEX)
  // split with capturing group: even indices are plain text, odd indices are code content
  return parts.flatMap((part, i) => {
    if (i % 2 === 1) {
      return [
        <code
          key={`${keyPrefix}-code-${i.toString()}`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
        >
          {part}
        </code>,
      ]
    }
    return renderTextWithLinks(part, `${keyPrefix}-${i.toString()}`)
  })
}

/** content を行単位で処理し、コードブロック・引用ブロック・それ以外を分けて表示する */
const renderContentWithLinks = (text: string) => {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let quoteLines: string[] = []
  let codeBlockLines: string[] = []
  let inCodeBlock = false
  let blockIndex = 0

  const flushQuote = () => {
    if (quoteLines.length === 0) return
    elements.push(
      <blockquote
        key={`quote-${blockIndex++}`}
        className="my-2 border-l-2 border-muted-foreground/40 pl-3 text-muted-foreground"
      >
        {quoteLines.map((line, i) => (
          <span key={i}>
            {i > 0 && '\n'}
            {renderInlineContent(line, `q-${blockIndex}-${i}`)}
          </span>
        ))}
      </blockquote>,
    )
    quoteLines = []
  }

  const flushCodeBlock = () => {
    if (codeBlockLines.length === 0) return
    elements.push(
      <pre
        key={`codeblock-${blockIndex++}`}
        className="my-2 overflow-x-auto rounded-md bg-muted p-3"
      >
        <code className="font-mono text-xs">{codeBlockLines.join('\n')}</code>
      </pre>,
    )
    codeBlockLines = []
  }

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // コードブロック終了
        inCodeBlock = false
        flushCodeBlock()
      } else {
        // コードブロック開始
        flushQuote()
        inCodeBlock = true
      }
    } else if (inCodeBlock) {
      codeBlockLines.push(line)
    } else if (line.startsWith('> ')) {
      quoteLines.push(line.slice(2))
    } else {
      const wasQuote = quoteLines.length > 0
      flushQuote()
      elements.push(
        <span key={`line-${blockIndex++}`}>
          {elements.length > 0 && !wasQuote && '\n'}
          {renderInlineContent(line, `l-${blockIndex}`)}
        </span>,
      )
    }
  }
  // 閉じられていないコードブロックもフラッシュ
  flushCodeBlock()
  flushQuote()

  return elements
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
          <div className="line-clamp-10 whitespace-pre-wrap text-sm text-foreground">
            {renderContentWithLinks(note.content)}
          </div>
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
          <div className="flex w-full items-center">
            <span className="text-xs text-muted-foreground">{updatedAt}</span>
            {note.keywords && (
              <span className="ml-3 truncate text-xs text-muted-foreground">
                {note.keywords}
              </span>
            )}
            {note.isPinned && (
              <Pin className="ml-auto size-3.5 text-muted-foreground" />
            )}
          </div>
        </CardFooter>
      </Card>
    </button>
  )
}
