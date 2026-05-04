import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useMindmapStore } from '@/stores/mindmapStore'

export interface NewConversationResult {
  newMindmapTitle?: string
}

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (result: NewConversationResult) => void
}

export default function NewConversationDialog({
  open,
  onOpenChange,
  onSubmit,
}: NewConversationDialogProps) {
  const { addMindmap } = useMindmapStore()

  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newMindmapTitle, setNewMindmapTitle] = useState('')

  const handleSubmit = () => {
    const result: NewConversationResult = {}

    if (isCreatingNew && newMindmapTitle.trim()) {
      const title = newMindmapTitle.trim()
      addMindmap(title)
      result.newMindmapTitle = title
    }

    onSubmit(result)
    resetForm()
    onOpenChange(false)
  }

  const resetForm = () => {
    setIsCreatingNew(false)
    setNewMindmapTitle('')
  }

  const canSubmit = !isCreatingNew || newMindmapTitle.trim().length > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) resetForm()
        onOpenChange(open)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>新建对话</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">关联思维导图</label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="linkMode"
                  checked={!isCreatingNew}
                  onChange={() => setIsCreatingNew(false)}
                  className="w-4 h-4"
                />
                <span className="text-sm">不关联（纯聊天）</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="linkMode"
                  checked={isCreatingNew}
                  onChange={() => setIsCreatingNew(true)}
                  className="w-4 h-4"
                />
                <span className="text-sm">创建新图谱</span>
              </label>
              {isCreatingNew && (
                <div className="ml-6 mt-1">
                  <Input
                    placeholder="输入图谱名称..."
                    value={newMindmapTitle}
                    onChange={(e) => setNewMindmapTitle(e.target.value)}
                    className="h-8"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            开始对话
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
