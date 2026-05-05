import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useProviderStore } from '@/stores/providerStore'
import type { Provider } from '@/types/provider'
import { createClient, fetchModels } from '@/lib/llm-client'

const PRESETS = [
  {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  },
  {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  { name: 'Ollama', endpoint: 'http://localhost:11434/v1', models: [] },
  {
    name: 'SiliconFlow',
    endpoint: 'https://api.siliconflow.cn/v1',
    models: ['deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-72B-Instruct'],
  },
]

interface FormData {
  name: string
  apiEndpoint: string
  apiKey: string
  models: string
}

const emptyForm: FormData = { name: '', apiEndpoint: '', apiKey: '', models: '' }

export default function ProviderSettingsPage({ onBack }: { onBack?: () => void }) {
  const providers = useProviderStore((s) => s.providers)
  const removeProvider = useProviderStore((s) => s.removeProvider)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleEdit = (p: Provider) => {
    setEditingId(p.id)
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    removeProvider(id)
    setDeleteConfirm(null)
  }

  const handleClose = () => {
    setDialogOpen(false)
    setEditingId(null)
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
              ← 返回聊天
            </Button>
          )}
          <h1 className="text-2xl font-bold">模型提供商</h1>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) handleClose()
            else setDialogOpen(true)
          }}
        >
          <DialogTrigger>
            <Button>添加提供商</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? '编辑提供商' : '添加提供商'}</DialogTitle>
            </DialogHeader>
            <ProviderForm
              key={editingId ?? '__new__'}
              editId={editingId}
              onSave={() => handleClose()}
              onCancel={() => handleClose()}
            />
          </DialogContent>
        </Dialog>
      </div>

      {providers.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          还没有配置模型提供商，点击上方按钮添加
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-3">
            {providers.map((p) => (
              <div key={p.id} className="border rounded-lg p-4 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {p.apiEndpoint.replace(/\/$/, '')}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{p.models.length} 个模型</Badge>
                    {p.apiKey ? (
                      <Badge variant="outline">API Key: ****{p.apiKey.slice(-4)}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        需配置 API Key
                      </Badge>
                    )}
                    {p.preset && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        系统预置
                      </Badge>
                    )}
                  </div>
                  {p.preset && !p.apiKey && (
                    <p className="text-xs text-muted-foreground mt-1">
                      前往{' '}
                      <a
                        href="https://openrouter.ai/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        openrouter.ai
                      </a>
                      {' '}注册获取免费 API Key，粘贴到编辑框中即可使用
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(p)}>
                    编辑
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteConfirm(p.id)}
                    disabled={p.preset === true}
                    title={p.preset ? '系统预置模型不可删除' : undefined}
                  >
                    删除
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirm(null)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定删除此提供商？关联的对话将无法发送新消息，但历史记录会保留。
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProviderForm({
  editId,
  onSave,
  onCancel,
}: {
  editId: string | null
  onSave: () => void
  onCancel: () => void
}) {
  const { providers, addProvider, updateProvider } = useProviderStore()
  const existing = editId ? providers.find((p) => p.id === editId) : null

  const [form, setForm] = useState<FormData>(() =>
    existing
      ? {
          name: existing.name,
          apiEndpoint: existing.apiEndpoint,
          apiKey: existing.apiKey,
          models: existing.models.map((m) => m.id).join('\n'),
        }
      : emptyForm,
  )
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [fetching, setFetching] = useState(false)

  const validate = () => {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = '请输入提供商名称'
    if (!form.apiEndpoint.trim()) e.apiEndpoint = '请输入 API 端点'
    else if (!/^https?:\/\/.+/.test(form.apiEndpoint.trim())) e.apiEndpoint = '请输入有效的 URL'
    if (!form.apiKey.trim()) e.apiKey = '请输入 API 密钥'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handlePreset = (value: string | null) => {
    const preset = PRESETS.find((p) => p.name === value)
    if (!preset) return
    setForm((f) => ({
      ...f,
      name: preset.name,
      apiEndpoint: preset.endpoint,
      models: preset.models.join('\n'),
    }))
  }

  const handleFetchModels = async () => {
    if (!form.apiEndpoint.trim() || !form.apiKey.trim()) return
    setFetching(true)
    try {
      const client = createClient({
        apiEndpoint: form.apiEndpoint.trim(),
        apiKey: form.apiKey.trim(),
      })
      const models = await fetchModels(client)
      setForm((f) => ({ ...f, models: models.map((m) => m.id).join('\n') }))
    } catch {
      setErrors((e) => ({ ...e, models: '无法获取模型列表，请手动输入' }))
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = () => {
    if (!validate()) return
    const modelIds = form.models
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    const models = modelIds.map((id) => ({
      id,
      name: id,
      enabled: !existing || (existing.models.find((m) => m.id === id)?.enabled ?? true),
    }))
    if (editId && existing) {
      updateProvider(editId, {
        name: form.name.trim(),
        apiEndpoint: form.apiEndpoint.trim(),
        apiKey: form.apiKey.trim(),
        models,
      })
    } else {
      addProvider({
        name: form.name.trim(),
        apiEndpoint: form.apiEndpoint.trim(),
        apiKey: form.apiKey.trim(),
        models,
      })
    }
    onSave()
  }

  return (
    <div className="space-y-4">
      <div>
        <Select onValueChange={handlePreset}>
          <SelectTrigger>
            <SelectValue placeholder="选择预设模板 (可选)" />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.name} value={p.name}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium">提供商名称</label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="例如: OpenAI"
        />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">API 端点</label>
        <Input
          value={form.apiEndpoint}
          onChange={(e) => setForm((f) => ({ ...f, apiEndpoint: e.target.value }))}
          placeholder="https://api.openai.com/v1"
        />
        {errors.apiEndpoint && (
          <p className="text-xs text-destructive mt-1">{errors.apiEndpoint}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">API 密钥</label>
        <Input
          type="password"
          value={form.apiKey}
          onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
          placeholder="sk-..."
        />
        {errors.apiKey && <p className="text-xs text-destructive mt-1">{errors.apiKey}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium">模型列表</label>
          <Button variant="outline" size="sm" onClick={handleFetchModels} disabled={fetching}>
            {fetching ? '获取中...' : '获取模型列表'}
          </Button>
        </div>
        <Textarea
          value={form.models}
          onChange={(e) => setForm((f) => ({ ...f, models: e.target.value }))}
          placeholder="每行一个模型 ID&#10;例如: gpt-4o&#10;gpt-4o-mini"
          rows={4}
        />
        {errors.models && <p className="text-xs text-destructive mt-1">{errors.models}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={handleSubmit}>{editId ? '保存' : '添加'}</Button>
      </div>
    </div>
  )
}
