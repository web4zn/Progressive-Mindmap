import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-xl font-semibold text-destructive">出现了一些问题</h2>
            <p className="text-sm text-muted-foreground">
              应用遇到了一个意外错误。请尝试刷新页面或重置状态。
            </p>
            {this.state.error && (
              <pre className="text-xs text-left bg-muted p-3 rounded-md overflow-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex justify-center gap-3">
              <Button onClick={() => window.location.reload()}>刷新页面</Button>
              <Button variant="outline" onClick={this.handleReset}>重试</Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
