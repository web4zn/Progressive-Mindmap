import { Bot } from 'lucide-react'

interface AvatarProps {
  type: 'user' | 'ai'
  userInitial?: string
}

export default function Avatar({ type, userInitial }: AvatarProps) {
  if (type === 'user') {
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
        {userInitial ?? 'U'}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted-foreground/20 text-muted-foreground shrink-0">
      <Bot className="w-4 h-4" />
    </div>
  )
}
