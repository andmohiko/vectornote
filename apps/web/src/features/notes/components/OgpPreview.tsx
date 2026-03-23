import type { OgpInfo } from '@vectornote/common'

type OgpPreviewProps = {
  ogp: OgpInfo
}

export const OgpPreview = ({ ogp }: OgpPreviewProps) => {
  let hostname = ''
  try {
    hostname = new URL(ogp.url).hostname
  } catch {
    hostname = ogp.url
  }

  return (
    <a
      href={ogp.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex gap-2 overflow-hidden rounded-md border transition-colors hover:bg-muted/50"
      onClick={(e) => e.stopPropagation()}
    >
      {ogp.image && (
        <img
          src={ogp.image}
          alt={ogp.title ?? ''}
          className="h-16 w-16 shrink-0 object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
      <div className="flex min-w-0 flex-col justify-center gap-0.5 p-2">
        {ogp.title && (
          <p className="truncate text-xs font-medium">{ogp.title}</p>
        )}
        {ogp.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {ogp.description}
          </p>
        )}
        <p className="truncate text-xs text-muted-foreground">{hostname}</p>
      </div>
    </a>
  )
}
