import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Globe,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Sparkles,
  Copy,
  Palette,
  Type,
  Layout,
  Image,
  Clock
} from 'lucide-react'
import { INDUSTRIES } from '../../../shared/constants'

interface CloneStep {
  step: string
  status: 'pending' | 'running' | 'done' | 'error'
  detail?: string
}

interface ClonedResult {
  pages?: { id: string; title: string; sections: unknown[] }[]
  seoMeta?: { title: string; description: string }
  brandAnalysis?: { companyName: string; industry: string; tone: string }
  designSuggestion?: { styleId: string; paletteId: string; fontId: string }
  dynamicEffects?: Record<string, boolean>
  sourceUrl?: string
  screenshot?: string
  designTokens?: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    bgColor: string
    textColor: string
    fontHeading: string
    fontBody: string
  }
  downloadedImages?: string[]
  snapshotPages?: { id: string; title: string; html?: string }[]
  hasSnapshots?: boolean
}

export default function CloneSite(): React.JSX.Element {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [projectName, setProjectName] = useState('')
  const [industry, setIndustry] = useState('general')
  const [depth, setDepth] = useState<'level1' | 'level2'>('level1')
  const [cloning, setCloning] = useState(false)
  const [steps, setSteps] = useState<CloneStep[]>([])
  const [result, setResult] = useState<ClonedResult | null>(null)
  const [error, setError] = useState('')
  const [cloneTempId, setCloneTempId] = useState('')

  const handleProgress = useCallback((newSteps: unknown[]) => {
    setSteps(newSteps as CloneStep[])
  }, [])

  useEffect(() => {
    const cleanup = window.api.onCloneProgress(handleProgress)
    return cleanup
  }, [handleProgress])

  async function handleClone(): Promise<void> {
    const trimmed = url.trim()
    if (!trimmed) return

    let fullUrl: string
    try {
      fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
      new URL(fullUrl)
    } catch {
      setError('请输入有效的网址')
      return
    }

    setError('')
    setCloning(true)
    setResult(null)
    setSteps([])

    const tempId = `clone_${Date.now().toString(36)}`
    setCloneTempId(tempId)
    const name = projectName.trim() || new URL(fullUrl).hostname

    try {
      const res = await window.api.cloneSite({
        url: fullUrl,
        projectId: tempId,
        projectName: name,
        industry,
        depth
      })

      if (res.success && res.clonedData) {
        setResult(res.clonedData as ClonedResult)
      } else {
        setError(res.error || '克隆失败')
      }
    } catch (err) {
      setError((err as Error).message)
    }
    setCloning(false)
  }

  async function handleCreateProject(): Promise<void> {
    if (!result) return
    setCloning(true)
    setError('')

    try {
      const name = projectName.trim() || result.seoMeta?.title || result.brandAnalysis?.companyName || '克隆项目'
      const ind = result.brandAnalysis?.industry
        ? INDUSTRIES.find((i) => i.label.includes(result.brandAnalysis!.industry))?.id || industry
        : industry

      const project = await window.api.createProject({
        name,
        industry: ind,
        websiteType: 'multi-page'
      })

      const proj = project as { id: string }

      const styleId = result.designSuggestion?.styleId || 'clean-modern'
      const paletteId = result.designSuggestion?.paletteId || 'ocean-blue'
      const fontId = result.designSuggestion?.fontId || 'inter-system'
      const selectedPages = (result.pages || []).map((p: { id: string }) => p.id)
      const contentObj = {
        pages: result.pages || [],
        seoMeta: result.seoMeta || { title: name, description: '', keywords: [], ogTitle: name, ogDescription: '' },
        brandAnalysis: result.brandAnalysis || { companyName: name, industry: ind, tone: 'professional', keyServices: [], uniqueSellingPoints: [], targetAudience: '', contactInfo: {} }
      }

      // Snapshot mode: copy dist from temp clone project to real project
      const hasSnapshots = result.hasSnapshots && cloneTempId

      if (hasSnapshots) {
        const copyResult = await window.api.copySnapshots({
          fromProjectId: cloneTempId,
          toProjectId: proj.id
        })
        if (!copyResult.success) {
          setError(`快照复制失败: ${copyResult.error}`)
          setCloning(false)
          return
        }
      } else {
        const clonedEffects: Record<string, boolean> = result.dynamicEffects || {}
        const hasAnyEffect = Object.values(clonedEffects).some(Boolean)
        const siteResult = await window.api.generateSite({
          projectId: proj.id,
          projectName: name,
          companyName: result.brandAnalysis?.companyName || name,
          industry: ind,
          websiteType: 'multi-page',
          languages: ['zh-CN'],
          selectedPages,
          styleId,
          paletteId,
          fontId,
          content: contentObj,
          enableProMax: hasAnyEffect,
          proMaxEffects: hasAnyEffect ? clonedEffects : undefined,
          customDesignTokens: result.designTokens ? {
            primaryColor: result.designTokens.primaryColor,
            secondaryColor: result.designTokens.secondaryColor,
            accentColor: result.designTokens.accentColor,
            bgColor: result.designTokens.bgColor,
            textColor: result.designTokens.textColor,
            fontHeading: result.designTokens.fontHeading,
            fontBody: result.designTokens.fontBody
          } : undefined
        })
        if (!siteResult.success) {
          setError(`网站生成失败: ${siteResult.error}`)
          setCloning(false)
          return
        }
      }

      const snapshotPageList = hasSnapshots
        ? (result.snapshotPages || []).map((sp: { id: string; title?: string }) => ({ id: sp.id, title: sp.title || sp.id, sections: [] }))
        : (result.pages || [])

      const configData: Record<string, unknown> = {
        sourceUrl: result.sourceUrl,
        generatedContent: contentObj,
        generatedPages: snapshotPageList,
        styleId,
        paletteId,
        fontId,
        selectedPages: snapshotPageList.map((p: { id: string }) => p.id),
        languages: ['zh-CN'],
        clonedFrom: result.sourceUrl,
        cloneMode: hasSnapshots ? 'snapshot' : 'template',
        customDesignTokens: result.designTokens || null
      }

      await window.api.updateProject(proj.id, {
        config_json: JSON.stringify(configData),
        status: 'generated'
      })

      navigate(`/editor/${proj.id}`)
    } catch (err) {
      setError(`创建项目失败: ${(err as Error).message}`)
      setCloning(false)
    }
  }

  const completedSteps = steps.filter((s) => s.status === 'done').length
  const totalSteps = steps.length || 1
  const progressPercent = Math.round((completedSteps / totalSteps) * 100)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Copy className="h-6 w-6 text-primary" />
            智能拷贝
          </h1>
          <p className="text-muted-foreground mt-1">
            输入目标网站 URL，AI 将自动分析其结构、样式和内容，重建为可编辑的项目
          </p>
        </div>
      </div>

      {/* Input Form */}
      {!result && (
        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block font-medium">目标网站 URL</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !cloning) handleClone() }}
                    disabled={cloning}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                支持任意公开网站，系统将使用浏览器引擎加载并深度分析
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block">项目名称（可选）</Label>
                <Input
                  placeholder="自动从网站标题提取"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  disabled={cloning}
                />
              </div>
              <div>
                <Label className="mb-2 block">所属行业</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  disabled={cloning}
                >
                  {INDUSTRIES.map((ind) => (
                    <option key={ind.id} value={ind.id}>
                      {ind.icon} {ind.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">抓取深度</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDepth('level1')}
                  disabled={cloning}
                  className={`flex-1 rounded-lg border-2 p-3 text-sm transition-colors ${
                    depth === 'level1' ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">一级链接</div>
                  <div className="text-xs text-muted-foreground mt-0.5">仅抓取导航栏直接链接的页面</div>
                </button>
                <button
                  onClick={() => setDepth('level2')}
                  disabled={cloning}
                  className={`flex-1 rounded-lg border-2 p-3 text-sm transition-colors ${
                    depth === 'level2' ? 'border-primary bg-primary/5 text-primary font-medium' : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">一级 + 二级链接</div>
                  <div className="text-xs text-muted-foreground mt-0.5">深度抓取子页面中的链接（更全面，耗时更长）</div>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
                <XCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              className="w-full h-11 text-base"
              onClick={handleClone}
              disabled={cloning || !url.trim()}
            >
              {cloning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  正在智能拷贝...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  开始智能拷贝
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Progress */}
      {cloning && steps.length > 0 && (
        <Card className="p-6 mb-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">拷贝进度</span>
              <span className="text-sm text-muted-foreground">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {s.status === 'done' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {s.status === 'running' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                  {s.status === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
                  {s.status === 'pending' && <Clock className="h-5 w-5 text-muted-foreground/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${s.status === 'pending' ? 'text-muted-foreground/50' : ''}`}>
                    {s.step}
                  </p>
                  {s.detail && (
                    <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-6">
          <Card className="p-6 border-green-200 bg-green-50/30">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h2 className="text-lg font-semibold">分析完成</h2>
                <p className="text-sm text-muted-foreground">
                  已成功分析 {result.sourceUrl}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <InfoCard
                icon={<Layout className="h-5 w-5 text-blue-500" />}
                label="页面数"
                value={`${result.pages?.length ?? 0} 个页面`}
              />
              <InfoCard
                icon={<Sparkles className="h-5 w-5 text-purple-500" />}
                label="区块数"
                value={`${result.pages?.reduce((a, p) => a + (p.sections?.length ?? 0), 0) ?? 0} 个区块`}
              />
              <InfoCard
                icon={<Image className="h-5 w-5 text-orange-500" />}
                label="已下载资源"
                value={`${result.downloadedImages?.length ?? 0} 个文件`}
              />
              <InfoCard
                icon={<Type className="h-5 w-5 text-teal-500" />}
                label="品牌调性"
                value={result.brandAnalysis?.tone ?? '—'}
              />
            </div>

            {/* Design Tokens Preview */}
            {result.designTokens && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  提取到的设计风格
                </h3>
                <div className="flex flex-wrap gap-3">
                  <ColorSwatch label="主色" color={result.designTokens.primaryColor} />
                  <ColorSwatch label="辅色" color={result.designTokens.secondaryColor} />
                  <ColorSwatch label="强调色" color={result.designTokens.accentColor} />
                  <ColorSwatch label="背景色" color={result.designTokens.bgColor} />
                  <ColorSwatch label="文字色" color={result.designTokens.textColor} />
                </div>
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  <span>标题字体: <strong>{result.designTokens.fontHeading}</strong></span>
                  <span>正文字体: <strong>{result.designTokens.fontBody}</strong></span>
                </div>
              </div>
            )}

            {/* Pages Preview */}
            {result.pages && result.pages.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-3">识别到的页面结构</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {result.pages.map((page: { id: string; title: string; sections: unknown[] }, idx: number) => (
                    <div key={idx} className="rounded-lg border bg-background p-3">
                      <p className="font-medium text-sm">{page.title || page.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {page.sections?.length ?? 0} 个区块：
                        {(page.sections as { type: string }[])?.map((s) => s.type).join('、')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button className="flex-1 h-11" onClick={handleCreateProject} disabled={cloning}>
                {cloning ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />正在生成网站...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />创建项目并生成网站</>
                )}
              </Button>
              <Button variant="outline" onClick={() => { setResult(null); setSteps([]) }} disabled={cloning}>
                重新拷贝
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-lg border bg-background p-3 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  )
}

function ColorSwatch({ label, color }: { label: string; color: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 bg-background">
      <div
        className="w-5 h-5 rounded-full border border-border shrink-0"
        style={{ backgroundColor: color }}
      />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xs font-mono font-medium">{color}</p>
      </div>
    </div>
  )
}
