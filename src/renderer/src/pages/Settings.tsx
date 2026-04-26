import { useEffect, useState, useRef } from 'react'
import {
  Settings as SettingsIcon, Save, CheckCircle, Sun, Moon, Monitor,
  Loader2, ExternalLink, MessageSquare, Send, Bot, User, Eye, EyeOff,
  RefreshCw, ChevronDown, ChevronUp, Zap
} from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAIStore, type AIProviderType, type ProviderConfig } from '@/stores/ai-store'
import { useUIStore } from '@/stores/ui-store'

interface ProviderInfo {
  id: AIProviderType
  label: string
  description: string
  apiKeyPlaceholder: string
  apiUrl: string
  defaultModels: { id: string; label: string }[]
  needsBaseUrl: boolean
  needsModel: boolean
  supportsModelList: boolean
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'claude',
    label: 'Claude',
    description: 'Anthropic Claude API',
    apiKeyPlaceholder: 'sk-ant-...',
    apiUrl: 'https://console.anthropic.com/',
    defaultModels: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { id: 'claude-4-opus-20260301', label: 'Claude 4 Opus' },
      { id: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' }
    ],
    needsBaseUrl: false,
    needsModel: false,
    supportsModelList: false
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'OpenAI GPT API',
    apiKeyPlaceholder: 'sk-...',
    apiUrl: 'https://platform.openai.com/api-keys',
    defaultModels: [
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'o3-mini', label: 'o3-mini' }
    ],
    needsBaseUrl: false,
    needsModel: false,
    supportsModelList: true
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: '深度求索 · 高性价比大模型',
    apiKeyPlaceholder: 'sk-...',
    apiUrl: 'https://platform.deepseek.com/api_keys',
    defaultModels: [
      { id: 'deepseek-chat', label: 'DeepSeek-V3 (Chat)' },
      { id: 'deepseek-reasoner', label: 'DeepSeek-R1 (推理)' }
    ],
    needsBaseUrl: false,
    needsModel: true,
    supportsModelList: true
  },
  {
    id: 'zhipu',
    label: '智谱 GLM',
    description: '智谱AI · GLM 大模型',
    apiKeyPlaceholder: '在 open.bigmodel.cn 获取',
    apiUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    defaultModels: [
      { id: 'glm-4-plus', label: 'GLM-4-Plus' },
      { id: 'glm-4-0520', label: 'GLM-4' },
      { id: 'glm-4-air', label: 'GLM-4-Air' },
      { id: 'glm-4-airx', label: 'GLM-4-AirX (快速)' },
      { id: 'glm-4-long', label: 'GLM-4-Long (长文本)' },
      { id: 'glm-4-flash', label: 'GLM-4-Flash (免费)' }
    ],
    needsBaseUrl: false,
    needsModel: true,
    supportsModelList: true
  },
  {
    id: 'kimi',
    label: 'KIMI',
    description: 'Moonshot AI · 月之暗面',
    apiKeyPlaceholder: 'sk-...',
    apiUrl: 'https://platform.moonshot.cn/console/api-keys',
    defaultModels: [
      { id: 'moonshot-v1-128k', label: 'Moonshot v1 128K' },
      { id: 'moonshot-v1-32k', label: 'Moonshot v1 32K' },
      { id: 'moonshot-v1-8k', label: 'Moonshot v1 8K' }
    ],
    needsBaseUrl: false,
    needsModel: true,
    supportsModelList: true
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    description: 'MiniMax · 海螺AI',
    apiKeyPlaceholder: '在 platform.minimaxi.com 获取',
    apiUrl: 'https://platform.minimaxi.com/user-center/basic-information/interface-key',
    defaultModels: [
      { id: 'MiniMax-Text-01', label: 'MiniMax-Text-01' },
      { id: 'MiniMax-Text-01-128k', label: 'MiniMax-Text-01-128K' },
      { id: 'abab6.5s-chat', label: 'ABAB 6.5s' },
      { id: 'abab6.5t-chat', label: 'ABAB 6.5t' }
    ],
    needsBaseUrl: false,
    needsModel: true,
    supportsModelList: true
  },
  {
    id: 'siliconflow',
    label: 'SiliconFlow',
    description: '硅基流动 · 多模型聚合平台',
    apiKeyPlaceholder: 'sk-...',
    apiUrl: 'https://cloud.siliconflow.cn/account/ak',
    defaultModels: [
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3' },
      { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek-R1' },
      { id: 'Qwen/Qwen2.5-72B-Instruct', label: 'Qwen2.5-72B' },
      { id: 'Qwen/Qwen2.5-32B-Instruct', label: 'Qwen2.5-32B' },
      { id: 'Qwen/QwQ-32B', label: 'QwQ-32B (推理)' },
      { id: 'THUDM/glm-4-9b-chat', label: 'GLM-4-9B (免费)' },
      { id: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen2.5-7B (免费)' },
      { id: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-7B', label: 'DeepSeek-R1-7B (免费)' }
    ],
    needsBaseUrl: false,
    needsModel: true,
    supportsModelList: true
  },
  {
    id: 'custom',
    label: '自定义',
    description: '兼容 OpenAI 格式的第三方 API',
    apiKeyPlaceholder: 'API Key',
    apiUrl: '',
    defaultModels: [],
    needsBaseUrl: true,
    needsModel: true,
    supportsModelList: true
  }
]

export default function Settings(): React.JSX.Element {
  const {
    provider, apiKey, baseUrl, model,
    configs,
    setProvider, setApiKey, setBaseUrl, setModel,
    setConfigs, setProviderConfig
  } = useAIStore()
  const { theme, setTheme } = useUIStore()
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [remoteModels, setRemoteModels] = useState<{ id: string; label: string }[]>([])
  const [showAllProviders, setShowAllProviders] = useState(false)

  useEffect(() => {
    window.api.getSetting('ai-config').then((value) => {
      if (value) {
        try {
          const config = JSON.parse(value)
          if (config.provider) setProvider(config.provider)
          if (config.configs) {
            setConfigs(config.configs)
            const pc = config.configs[config.provider]
            if (pc) {
              if (pc.apiKey) setApiKey(pc.apiKey)
              if (pc.baseUrl) setBaseUrl(pc.baseUrl)
              if (pc.model) setModel(pc.model)
            } else {
              if (config.apiKey) setApiKey(config.apiKey)
              if (config.baseUrl) setBaseUrl(config.baseUrl)
              if (config.model) setModel(config.model)
            }
          } else {
            if (config.apiKey) setApiKey(config.apiKey)
            if (config.baseUrl) setBaseUrl(config.baseUrl)
            if (config.model) setModel(config.model)
          }
        } catch { /* ignore */ }
      }
    })
    window.api.getSetting('theme').then((value) => {
      if (value && (value === 'light' || value === 'dark' || value === 'system')) {
        setTheme(value)
      }
    })
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else if (theme === 'light') root.classList.remove('dark')
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    }
  }, [theme])

  // When switching providers, load their saved config
  function handleProviderSwitch(pid: AIProviderType): void {
    // Save current provider's config first
    setProviderConfig(provider, { apiKey, model, baseUrl })
    setProvider(pid)
    setTestResult(null)
    setRemoteModels([])
    setShowApiKey(false)
  }

  const currentProviderInfo = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0]

  // Count configured providers
  const configuredCount = PROVIDERS.filter((p) => {
    const c = configs[p.id]
    return c?.apiKey || (p.id === provider && apiKey)
  }).length

  async function handleSaveAI(): Promise<void> {
    // Save current provider's config to the configs map
    const updatedConfigs: Partial<Record<AIProviderType, ProviderConfig>> = {
      ...configs,
      [provider]: { apiKey, model, baseUrl }
    }
    setProviderConfig(provider, { apiKey, model, baseUrl })

    await window.api.setSetting(
      'ai-config',
      JSON.stringify({ provider, apiKey, baseUrl, model, configs: updatedConfigs })
    )
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleTestConnection(): Promise<void> {
    setTesting(true)
    setTestResult(null)
    try {
      await handleSaveAI()
      const result = await window.api.testAIConnection()
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, error: (err as Error).message })
    }
    setTesting(false)
  }

  async function handleFetchModels(): Promise<void> {
    setFetchingModels(true)
    try {
      const result = await window.api.fetchModels({
        provider,
        apiKey,
        baseUrl: baseUrl || undefined
      })
      if (result.success && result.models) {
        setRemoteModels(result.models)
      } else {
        alert(`获取模型列表失败: ${result.error || '未知错误'}`)
      }
    } catch (err) {
      alert(`获取模型列表失败: ${(err as Error).message}`)
    }
    setFetchingModels(false)
  }

  async function handleThemeChange(newTheme: 'light' | 'dark' | 'system'): Promise<void> {
    setTheme(newTheme)
    await window.api.setSetting('theme', newTheme)
  }

  const displayModels = remoteModels.length > 0 ? remoteModels : currentProviderInfo.defaultModels

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          设置
        </h1>
        <p className="text-muted-foreground mt-1">配置 AI 服务和应用偏好</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* AI Config */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>AI 服务配置</CardTitle>
                <CardDescription>支持同时配置多个 AI 提供商，系统会智能选择最优模型</CardDescription>
              </div>
              {configuredCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  已配置 {configuredCount} 个
                </Badge>
              )}
            </div>
          </CardHeader>
          <div className="px-6 pb-6 space-y-4">
            {/* Provider Selection */}
            <div className="space-y-2">
              <Label>提供商（点击切换配置，可分别填入不同 API Key）</Label>
              <div className="grid grid-cols-4 gap-2">
                {PROVIDERS.map((p) => {
                  const isConfigured = !!(configs[p.id]?.apiKey || (p.id === provider && apiKey))
                  return (
                    <Button
                      key={p.id}
                      variant={provider === p.id ? 'default' : 'outline'}
                      size="sm"
                      className="h-auto py-2 flex flex-col gap-0.5 relative"
                      onClick={() => handleProviderSwitch(p.id)}
                    >
                      <span className="text-xs font-semibold">{p.label}</span>
                      {isConfigured && provider !== p.id && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </Button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">{currentProviderInfo.description}</p>
            </div>

            <Separator />

            {/* API Key with visibility toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="apiKey">API Key</Label>
                {currentProviderInfo.apiUrl && (
                  <a
                    href={currentProviderInfo.apiUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={(e) => {
                      e.preventDefault()
                      window.open(currentProviderInfo.apiUrl, '_blank')
                    }}
                  >
                    获取 API Key <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={currentProviderInfo.apiKeyPlaceholder}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title={showApiKey ? '隐藏 API Key' : '显示 API Key'}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Model Selection */}
            {currentProviderInfo.needsModel && displayModels.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>模型 {remoteModels.length > 0 && <span className="text-xs text-green-600 ml-1">(实时列表)</span>}</Label>
                  {currentProviderInfo.supportsModelList && apiKey && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={handleFetchModels}
                      disabled={fetchingModels}
                    >
                      {fetchingModels ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      {fetchingModels ? '获取中...' : '刷新模型列表'}
                    </Button>
                  )}
                </div>

                {/* If remote models are very long, show a collapsible list */}
                {displayModels.length > 12 ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {(showAllProviders ? displayModels : displayModels.slice(0, 12)).map((m) => (
                        <Button
                          key={m.id}
                          variant={model === m.id ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => setModel(m.id)}
                        >
                          {m.label || m.id}
                          {(m.label || m.id).includes('免费') && (
                            <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">Free</Badge>
                          )}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 w-full"
                      onClick={() => setShowAllProviders(!showAllProviders)}
                    >
                      {showAllProviders ? (
                        <><ChevronUp className="h-3 w-3 mr-1" />收起 ({displayModels.length} 个模型)</>
                      ) : (
                        <><ChevronDown className="h-3 w-3 mr-1" />展开全部 ({displayModels.length} 个模型)</>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {displayModels.map((m) => (
                      <Button
                        key={m.id}
                        variant={model === m.id ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setModel(m.id)}
                      >
                        {m.label || m.id}
                        {(m.label || m.id).includes('免费') && (
                          <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">Free</Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Custom model input */}
            {provider === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customModel">模型名称</Label>
                <Input
                  id="customModel"
                  placeholder="gpt-4o / llama-3 / ..."
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
            )}

            {/* Base URL */}
            {currentProviderInfo.needsBaseUrl && (
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL</Label>
                <Input
                  id="baseUrl"
                  placeholder="https://api.example.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>
            )}

            {/* Multi-provider summary */}
            {configuredCount > 1 && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <p className="text-xs font-medium flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  已配置的提供商
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PROVIDERS.filter((p) => {
                    const c = configs[p.id]
                    return c?.apiKey || (p.id === provider && apiKey)
                  }).map((p) => {
                    const c = configs[p.id]
                    const m = p.id === provider ? model : (c?.model || '')
                    return (
                      <Badge key={p.id} variant={p.id === provider ? 'default' : 'outline'} className="text-xs">
                        {p.label}
                        {m && <span className="ml-1 opacity-70">({m.split('/').pop()?.slice(0, 15)})</span>}
                      </Badge>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  系统将优先使用当前选择的提供商，如果不可用会自动切换到其他已配置的提供商
                </p>
              </div>
            )}

            {/* Test result */}
            {testResult && (
              <div className={`text-sm rounded-lg px-3 py-2 ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {testResult.success ? '连接成功！AI 服务配置正确。' : `连接失败: ${testResult.error}`}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveAI}>
                {saved ? (
                  <><CheckCircle className="h-4 w-4 mr-1" />已保存</>
                ) : (
                  <><Save className="h-4 w-4 mr-1" />保存配置</>
                )}
              </Button>
              <Button variant="outline" onClick={handleTestConnection} disabled={testing || !apiKey}>
                {testing ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" />测试中...</>
                ) : (
                  '测试连接'
                )}
              </Button>
              <APIChatDialog providerLabel={currentProviderInfo.label} disabled={!apiKey} />
            </div>
          </div>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle>外观</CardTitle>
            <CardDescription>切换应用主题</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <div className="flex gap-2">
              <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => handleThemeChange('light')}>
                <Sun className="h-4 w-4 mr-1" /> 浅色
              </Button>
              <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => handleThemeChange('dark')}>
                <Moon className="h-4 w-4 mr-1" /> 深色
              </Button>
              <Button variant={theme === 'system' ? 'default' : 'outline'} size="sm" onClick={() => handleThemeChange('system')}>
                <Monitor className="h-4 w-4 mr-1" /> 跟随系统
              </Button>
            </div>
          </div>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>关于</CardTitle>
            <CardDescription>WebForge AI 版本信息</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6 space-y-2 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">版本:</span> 1.0.0</p>
            <p><span className="font-medium text-foreground">技术栈:</span> Electron + React + TypeScript + Tailwind CSS</p>
            <p>
              <span className="font-medium text-foreground">AI 支持:</span>{' '}
              Claude / OpenAI / DeepSeek / 智谱GLM / KIMI / MiniMax / SiliconFlow / 自定义API
            </p>
            <p><span className="font-medium text-foreground">部署:</span> Nginx + Let&apos;s Encrypt SSL</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

interface ChatMsg {
  id: number
  role: 'user' | 'assistant'
  content: string
}

function APIChatDialog({ providerLabel, disabled }: { providerLabel: string; disabled: boolean }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const counter = useRef(0)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    if (open) { setMessages([]); counter.current = 0 }
  }, [open])

  async function handleSend(): Promise<void> {
    const text = input.trim()
    if (!text || loading) return

    const userId = ++counter.current
    setMessages((prev) => [...prev, { id: userId, role: 'user', content: text }])
    setInput('')
    setLoading(true)

    try {
      const result = await window.api.aiChat({
        systemPrompt: '你是一个友好的AI助手。请用简洁的中文回答用户的问题。',
        userMessage: text,
        projectId: ''
      })

      const aiId = ++counter.current
      if (result.success && result.response) {
        setMessages((prev) => [...prev, { id: aiId, role: 'assistant', content: result.response! }])
      } else {
        setMessages((prev) => [...prev, {
          id: aiId, role: 'assistant',
          content: `[错误] ${result.error || '未知错误'}\n\n请检查:\n1. API Key 是否正确\n2. 是否已保存配置\n3. 网络连接是否正常`
        }])
      }
    } catch (err) {
      const aiId = ++counter.current
      setMessages((prev) => [...prev, { id: aiId, role: 'assistant', content: `[异常] ${(err as Error).message}` }])
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <MessageSquare className="h-4 w-4 mr-1" /> 对话测试
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col p-0" showCloseButton>
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5 text-primary" />
            API 对话测试 — {providerLabel}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">与已配置的 AI 模型进行对话，验证 API 接入是否正常</p>
        </DialogHeader>
        <Separator />
        <ScrollArea className="flex-1 min-h-0 px-4" ref={scrollRef}>
          <div className="space-y-3 py-4">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">发送一条消息开始对话测试</p>
                <p className="text-xs mt-1">例如："你好" 或 "请做一下自我介绍"</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs ${msg.role === 'user' ? 'bg-primary' : 'bg-foreground/80'}`}>
                  {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-primary text-primary-foreground'
                  : msg.content.startsWith('[错误]') || msg.content.startsWith('[异常]')
                    ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-muted'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5">
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs bg-foreground/80">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-muted-foreground">回复中...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-3 border-t flex gap-2">
          <Input
            placeholder="输入消息..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            disabled={loading}
            className="flex-1 h-9"
          />
          <Button size="icon" className="h-9 w-9" onClick={handleSend} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
