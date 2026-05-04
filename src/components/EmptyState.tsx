import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
  footer?: ReactNode
}

export default function EmptyState({ icon, title, description, actions, footer }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="mb-6 text-muted-foreground/40">
          {icon}
        </div>
      )}
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      )}
      {actions && (
        <div className="flex items-center gap-3 mb-6">
          {actions}
        </div>
      )}
      {footer && (
        <div className="mt-4">
          {footer}
        </div>
      )}
    </div>
  )
}
