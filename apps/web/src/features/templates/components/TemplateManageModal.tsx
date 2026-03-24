import { useState } from 'react'
import type { Template } from '@vectornote/common'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDisclosure } from '@/hooks/useDisclosure'
import { useTemplates } from '../hooks/useTemplates'
import { CreateTemplateModal } from './CreateTemplateModal'
import { DeleteTemplateDialog } from './DeleteTemplateDialog'
import { EditTemplateModal } from './EditTemplateModal'
import { TemplateCard } from './TemplateCard'

type TemplateManageModalProps = {
  open: boolean
  onClose: () => void
}

export const TemplateManageModal = ({
  open,
  onClose,
}: TemplateManageModalProps) => {
  const { templates, isLoading } = useTemplates()
  const {
    isOpen: isCreateOpen,
    open: openCreate,
    close: closeCreate,
  } = useDisclosure()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<Template | null>(null)

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex h-full max-h-[600px] w-full max-w-[600px] flex-col overflow-hidden sm:max-w-[600px]">
          <DialogHeader className="shrink-0">
            <DialogTitle>テンプレートを管理</DialogTitle>
            <DialogDescription className="sr-only">テンプレートの一覧を管理します</DialogDescription>
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
                <Button onClick={openCreate}>
                  <Plus className="mr-2 size-4" />
                  テンプレートを作成
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.templateId}
                    template={template}
                    onEdit={setEditTarget}
                    onDelete={setDeleteTargetId}
                  />
                ))}
              </div>
            )}
          </div>
          {templates.length > 0 && (
            <div className="flex shrink-0 justify-end pt-2">
              <Button onClick={openCreate}>
                <Plus className="mr-2 size-4" />
                テンプレートを作成
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateTemplateModal open={isCreateOpen} onClose={closeCreate} />

      {editTarget && (
        <EditTemplateModal
          template={editTarget}
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deleteTargetId && (
        <DeleteTemplateDialog
          templateId={deleteTargetId}
          open={!!deleteTargetId}
          onOpenChange={(open) => !open && setDeleteTargetId(null)}
          onDeleted={() => setDeleteTargetId(null)}
        />
      )}
    </>
  )
}
