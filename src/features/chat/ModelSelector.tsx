import { ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useConversationStore } from '@/stores/conversationStore'
import { useProviderStore } from '@/stores/providerStore'

export default function ModelSelector() {
  const { conversations, activeConversationId, updateConversation } = useConversationStore()
  const { providers } = useProviderStore()
  const active = conversations.find(c => c.id === activeConversationId)

  const activeProvider = active ? providers.find(p => p.id === active.providerId) : null
  const label = activeProvider && active
    ? `${activeProvider.name} / ${active.modelId}`
    : '选择模型'

  const handleSelect = (providerId: string, modelId: string) => {
    if (!active) return
    updateConversation(active.id, { providerId, modelId })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="outline" className="max-w-72 min-w-0 justify-between text-sm gap-2">
          <span className="truncate">{label}</span>
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {providers.length === 0 ? (
          <DropdownMenuItem disabled>未配置提供商</DropdownMenuItem>
        ) : (
          providers.map((p) => (
            <DropdownMenuGroup key={p.id}>
              <DropdownMenuLabel className="text-xs text-muted-foreground">{p.name}</DropdownMenuLabel>
              {p.models.filter(m => m.enabled).map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => handleSelect(p.id, m.id)}
                  className={active?.modelId === m.id && active?.providerId === p.id ? 'bg-accent' : ''}
                >
                  {m.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </DropdownMenuGroup>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
