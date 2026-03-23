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
      className="mt-2 block overflow-hidden rounded-md border transition-colors hover:bg-muted/50"
      onClick={(e) => e.stopPropagation()}
    >
      {ogp.image && (
        <img
          src={ogp.image}
          alt={ogp.title ?? ''}
          className="h-40 w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
      <div className="flex flex-col gap-1 p-3">
        {ogp.title && (
          <p className="line-clamp-2 text-sm font-medium">{ogp.title}</p>
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
