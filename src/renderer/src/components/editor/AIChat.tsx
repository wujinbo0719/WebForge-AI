import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  MessageSquare,
  Send,
  Loader2,
  Sparkles,
  Monitor,
  Zap,
  Palette,
  Layout,
  Wand2,
  CheckCircle,
  AlertCircle,
  Undo2,
  Save
} from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'status'
  content: string
  status?: 'loading' | 'success' | 'error'
}

interface AIChatProps {
  projectId: string
  projectName: string
  industry: string
  configJson: string
  onApplyChanges: (instruction: string) => Promise<void>
  hasPendingChanges?: boolean
  onUndo?: () => Promise<void>
  onConfirmChanges?: () => void
}

const QUICK_ACTIONS = [
  {
    label: '动态交互版面',
    icon: Zap,
    prompt: '请将网站版面改为动态交互形式，添加滚动动画、悬停效果、渐入渐出过渡效果，让页面更具现代感。'
  },
  {
    label: '静态精美版面',
    icon: Monitor,
    prompt: '请将网站版面改为静态精美形式，注重排版美学、留白设计和清晰的视觉层次结构。'
  },
  {
    label: '页面设计优化',
    icon: Palette,
    prompt: '请全面优化网站的页面设计，包括配色方案、字体搭配、间距节奏、CTA按钮和响应式体验。'
  },
  {
    label: '重新布局',
    icon: Layout,
    prompt: '请重新设计网站的整体布局结构，采用更现代的布局风格，让内容展示更丰富有层次。'
  },
  {
    label: 'AI 智能美化',
    icon: Wand2,
    prompt: '请分析当前网站设计不足之处，自动优化色彩对比度、字体层级、间距对齐和视觉一致性。'
  }
]

export default function AIChat({
  projectId: _projectId,
  projectName,
  industry: _industry,
  configJson: _configJson,
  onApplyChanges,
  hasPendingChanges,
  onUndo,
  onConfirmChanges
}: AIChatProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `你好！我是 WebForge AI 助手。我可以直接帮你修改 **${projectName}** 的网站内容。\n\n你可以：\n- 点击下方快捷操作按钮\n- 或直接告诉我具体修改需求\n\n例如：\n- "把首页标题改成简体中文"\n- "将'关于我们'的描述文字缩短"\n- "把主标题字体加大"\n- "添加一个常见问题区块"\n\n修改后可预览效果，满意请点 **保存**，不满意请点 **撤回**。`
    }
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [undoing, setUndoing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  function addMessage(msg: Omit<ChatMessage, 'id'>): string {
    const id = `${msg.role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setMessages((prev) => [...prev, { ...msg, id }])
    return id
  }

  function updateMessage(id: string, updates: Partial<ChatMessage>): void {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, ...updates } : m))
  }

  async function sendMessage(content: string): Promise<void> {
    if (!content.trim() || busy) return
    setBusy(true)
    setInput('')

    addMessage({ role: 'user', content: content.trim() })
    const statusId = addMessage({ role: 'status', content: '正在分析您的需求并修改网站...', status: 'loading' })

    try {
      await onApplyChanges(content.trim())
      updateMessage(statusId, {
        content: '修改已应用到预览！请检查效果 — 满意请点击"保存效果"，不满意请点击"撤回修改"。',
        status: 'success'
      })
    } catch (err) {
      updateMessage(statusId, {
        content: `修改失败: ${(err as Error).message}`,
        status: 'error'
      })
    }
    setBusy(false)
  }

  async function handleUndo(): Promise<void> {
    if (!onUndo || undoing) return
    setUndoing(true)
    try {
      await onUndo()
      addMessage({ role: 'status', content: '已撤回修改，恢复到修改前的状态。', status: 'success' })
    } catch (err) {
      addMessage({ role: 'status', content: `撤回失败: ${(err as Error).message}`, status: 'error' })
    }
    setUndoing(false)
  }

  function handleConfirm(): void {
    if (onConfirmChanges) {
      onConfirmChanges()
      addMessage({ role: 'status', content: '修改已保存！', status: 'success' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <MessageSquare className="h-4 w-4" />
          AI 对话
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0" showCloseButton>
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI 网站设计助手
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1"
              disabled={busy}
              onClick={() => sendMessage(action.prompt)}
            >
              <action.icon className="h-3 w-3" />
              {action.label}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1 min-h-0 px-4" ref={scrollRef}>
          <div className="space-y-3 py-4">
            {messages.map((msg) => {
              if (msg.role === 'status') {
                return (
                  <div key={msg.id} className="flex justify-start">
                    <div className={`flex items-start gap-2 max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.status === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' :
                      msg.status === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
                      'bg-blue-50 border border-blue-200 text-blue-800'
                    }`}>
                      {msg.status === 'loading' && <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5" />}
                      {msg.status === 'success' && <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                      {msg.status === 'error' && <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                      <span>{msg.content}</span>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {formatContent(msg.content)}
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        {hasPendingChanges && (
          <div className="px-4 py-3 border-t bg-amber-50 flex items-center justify-between gap-3">
            <span className="text-sm text-amber-800 font-medium">
              有未保存的AI修改，请确认是否保留
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={handleUndo}
                disabled={undoing || busy}
              >
                {undoing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                撤回修改
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleConfirm}
                disabled={undoing || busy}
              >
                <Save className="h-3.5 w-3.5" />
                保存效果
              </Button>
            </div>
          </div>
        )}

        <div className="p-4 border-t flex gap-2">
          <Input
            placeholder="告诉我你想修改什么，例如：把首页标题改成中文..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            disabled={busy}
            className="flex-1"
          />
          <Button onClick={() => sendMessage(input)} disabled={busy || !input.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function formatContent(content: string): React.JSX.Element {
  const parts = content.split(/(\*\*[\s\S]*?\*\*)/g)
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx}>{part.slice(2, -2)}</strong>
        }
        return <span key={idx}>{part}</span>
      })}
    </>
  )
}
