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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { useMindmapStore } from '@/stores/mindmapStore'

export interface NewConversationResult {
  mindmapId?: string
  newMindmapTitle?: string
  pattern?: string
}

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (result: NewConversationResult) => void
}

type LinkMode = 'none' | 'existing' | 'new'

const PATTERNS: Record<string, string> = {
  auto: '自动（无限制）',
  '5w1h': '5W1H 六维度',
  tech: '技术概念',
  'pros-cons': '优缺点分析',
}

export default function NewConversationDialog({
  open,
  onOpenChange,
  onSubmit,
}: NewConversationDialogProps) {
  const mindmaps = useMindmapStore((s) => s.mindmaps)

  const [mode, setMode] = useState<LinkMode>('none')
  const [selectedMindmapId, setSelectedMindmapId] = useState('')
  const [newMindmapTitle, setNewMindmapTitle] = useState('')
  const [pattern, setPattern] = useState('auto')

  const handleSubmit = () => {
    const result: NewConversationResult = {}

    if (mode === 'existing' && selectedMindmapId) {
      result.mindmapId = selectedMindmapId
    } else if (mode === 'new' && newMindmapTitle.trim()) {
      result.newMindmapTitle = newMindmapTitle.trim()
      result.pattern = pattern
    }

    onSubmit(result)
    resetForm()
    onOpenChange(false)
  }

  const resetForm = () => {
    setMode('none')
    setSelectedMindmapId('')
    setNewMindmapTitle('')
    setPattern('auto')
  }

  const canSubmit =
    mode === 'none' ||
    (mode === 'existing' && selectedMindmapId !== '') ||
    (mode === 'new' && newMindmapTitle.trim().length > 0)

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
            <p className="text-xs text-muted-foreground mb-2">关联后对话内容会自动积累到图谱中</p>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="linkMode"
                  checked={mode === 'none'}
                  onChange={() => setMode('none')}
                  className="w-4 h-4"
                />
                <span className="text-sm">不关联（纯聊天）</span>
              </label>

              {mindmaps.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="linkMode"
                    checked={mode === 'existing'}
                    onChange={() => setMode('existing')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">关联已有图谱</span>
                </label>
              )}
              {mode === 'existing' && (
                <div className="ml-6 mt-1">
                  <Select value={selectedMindmapId} onValueChange={(v) => setSelectedMindmapId(v ?? '')}>
                    <SelectTrigger size="sm">
                      {selectedMindmapId
                        ? (mindmaps.find((m) => m.id === selectedMindmapId)?.title ?? selectedMindmapId)
                        : '选择图谱...'}
                    </SelectTrigger>
                    <SelectContent>
                      {mindmaps.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="linkMode"
                  checked={mode === 'new'}
                  onChange={() => setMode('new')}
                  className="w-4 h-4"
                />
                <span className="text-sm">创建新图谱</span>
              </label>
              {mode === 'new' && (
                <div className="ml-6 mt-1 space-y-2">
                  <Input
                    placeholder="输入图谱名称..."
                    value={newMindmapTitle}
                    onChange={(e) => setNewMindmapTitle(e.target.value)}
                    className="h-8"
                  />
                  <Select value={pattern} onValueChange={(v) => setPattern(v ?? 'auto')}>
                    <SelectTrigger size="sm">
                      {PATTERNS[pattern] ?? '选择模式...'}
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PATTERNS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
