import type { Template } from '@vectornote/common'
import { Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type TemplateCardProps = {
  template: Template
  onEdit: (template: Template) => void
  onDelete: (templateId: string) => void
}

export const TemplateCard = ({
  template,
  onEdit,
  onDelete,
}: TemplateCardProps) => {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border bg-background p-5 transition-colors hover:border-input">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">{template.name}</p>
        {template.defaultTitle && (
          <p className="text-sm text-muted-foreground">
            タイトル: {template.defaultTitle}
          </p>
        )}
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {template.body}
        </p>
        {template.defaultTags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {template.defaultTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="h-5 px-1.5 text-xs"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          aria-label={`${template.name}を編集`}
          onClick={() => onEdit(template)}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          aria-label={`${template.name}を削除`}
          onClick={() => onDelete(template.templateId)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
