import { useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import ErrorBoundary from '@/components/ErrorBoundary'
import ChatPage from '@/features/chat/ChatPage'
import { registerPageCloseFlushers } from '@/lib/indexeddb-storage-adapter'

export default function App() {
  useEffect(() => {
    registerPageCloseFlushers()
  }, [])

  return (
    <ErrorBoundary>
      <div className="h-full">
        <ChatPage />
        <Toaster />
      </div>
    </ErrorBoundary>
  )
}
