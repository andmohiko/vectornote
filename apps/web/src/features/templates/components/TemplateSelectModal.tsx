import { useNavigate } from '@tanstack/react-router'
import type { Template } from '@vectornote/common'
import { Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTemplates } from '../hooks/useTemplates'

type TemplateSelectModalProps = {
  open: boolean
  onClose: () => void
  onSelect: (template: Template) => void
}

export const TemplateSelectModal = ({
  open,
  onClose,
  onSelect,
}: TemplateSelectModalProps) => {
  const { templates, isLoading } = useTemplates()
  const navigate = useNavigate()

  const handleSelect = (template: Template) => {
    onSelect(template)
    onClose()
  }

  const handleNavigateToSettings = () => {
    onClose()
    navigate({ to: '/settings' })
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-full max-h-[500px] w-full max-w-[500px] flex-col overflow-hidden sm:max-w-[500px]">
        <DialogHeader className="shrink-0">
          <DialogTitle>テンプレートを選択</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              読み込み中...
            </p>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <p className="text-sm text-muted-foreground">
                テンプレートがまだありません
              </p>
              <Button variant="outline" onClick={handleNavigateToSettings}>
                <Settings className="mr-2 size-4" />
                テンプレートを管理
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.templateId}
                  type="button"
                  className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                  onClick={() => handleSelect(template)}
                >
                  <p className="font-medium">{template.name}</p>
                  {template.defaultTitle && (
                    <p className="text-sm text-muted-foreground">
                      {template.defaultTitle}
                    </p>
                  )}
                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {template.body}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
        {templates.length > 0 && (
          <div className="flex shrink-0 justify-end pt-2">
            <Button variant="outline" onClick={handleNavigateToSettings}>
              <Settings className="mr-2 size-4" />
              テンプレートを管理
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
