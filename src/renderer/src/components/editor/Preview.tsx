import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Monitor, Tablet, Smartphone, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PreviewProps {
  html: string
  className?: string
  onNavigate?: (href: string) => void
}

const VIEWPORTS = [
  { id: 'desktop', label: '桌面', icon: Monitor, width: '100%' },
  { id: 'tablet', label: '平板', icon: Tablet, width: '768px' },
  { id: 'mobile', label: '手机', icon: Smartphone, width: '375px' }
] as const

export default function Preview({ html, className, onNavigate }: PreviewProps): React.JSX.Element {
  const [viewport, setViewport] = useState<string>('desktop')
  const currentViewport = VIEWPORTS.find((v) => v.id === viewport) ?? VIEWPORTS[0]
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [key, setKey] = useState(0)
  const onNavigateRef = useRef(onNavigate)
  onNavigateRef.current = onNavigate

  useEffect(() => {
    setKey((k) => k + 1)
  }, [html])

  useEffect(() => {
    function handleMessage(e: MessageEvent): void {
      if (e.data?.type === 'webforge-navigate' && e.data.href && onNavigateRef.current) {
        onNavigateRef.current(e.data.href)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleRefresh = useCallback(() => {
    setKey((k) => k + 1)
  }, [])

  const handleLoad = useCallback(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const doc = iframe.contentDocument
      if (!doc) return

      const height = doc.documentElement.scrollHeight
      iframe.style.height = `${Math.max(height, 600)}px`

      doc.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement
        const anchor = target.closest('a[href]') as HTMLAnchorElement | null
        if (!anchor) return

        const href = anchor.getAttribute('href')
        if (!href) return

        if (href.startsWith('#')) {
          e.preventDefault()
          const el = doc.getElementById(href.slice(1))
          if (el) el.scrollIntoView({ behavior: 'smooth' })
          return
        }

        if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) return

        if (href.endsWith('.html') || href.includes('/')) {
          e.preventDefault()
          e.stopPropagation()
          if (onNavigateRef.current) {
            onNavigateRef.current(href)
          }
        }
      }, true)
    } catch {
      // cross-origin access denied — ignore
    }
  }, [])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex items-center justify-center gap-1 py-2 border-b bg-muted/30">
        {VIEWPORTS.map((vp) => (
          <Button
            key={vp.id}
            variant={viewport === vp.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewport(vp.id)}
            className="gap-1.5"
          >
            <vp.icon className="h-4 w-4" />
            <span className="text-xs">{vp.label}</span>
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={handleRefresh} className="ml-2">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto bg-gray-100 flex justify-center p-4">
        <div
          className="bg-white shadow-lg transition-all duration-300 h-fit"
          style={{ width: currentViewport.width, maxWidth: '100%' }}
        >
          <iframe
            key={key}
            ref={iframeRef}
            srcDoc={html}
            className="w-full border-0"
            style={{ minHeight: '600px', height: '100%' }}
            title="Website Preview"
            onLoad={handleLoad}
          />
        </div>
      </div>
    </div>
  )
}
