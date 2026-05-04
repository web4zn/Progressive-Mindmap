import { Toaster } from '@/components/ui/sonner'
import ErrorBoundary from '@/components/ErrorBoundary'
import ChatPage from '@/features/chat/ChatPage'

export default function App() {
  return (
    <ErrorBoundary>
      <div className="h-full">
        <ChatPage />
        <Toaster />
      </div>
    </ErrorBoundary>
  )
}
