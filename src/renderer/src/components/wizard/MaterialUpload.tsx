import { useWizardStore } from '@/stores/wizard-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, FileText, Image, Link, Upload, Loader2, Sparkles, Globe, CheckCircle } from 'lucide-react'
import { useState } from 'react'

interface MaterialFile {
  name: string
  type: 'pdf' | 'doc' | 'txt' | 'image'
  path: string
  size?: number
}

function getFileType(name: string): MaterialFile['type'] {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase()
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) return 'image'
  if (['.pdf'].includes(ext)) return 'pdf'
  if (['.doc', '.docx'].includes(ext)) return 'doc'
  return 'txt'
}

const FILE_ICON: Record<MaterialFile['type'], typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  txt: FileText,
  image: Image
}

export default function MaterialUpload(): React.JSX.Element {
  const { materials, setField } = useWizardStore()
  const [referenceUrl, setReferenceUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [docPreview, setDocPreview] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scrapedSites, setScrapedSites] = useState<{ url: string; title: string; design: string }[]>([])

  const files: MaterialFile[] = (materials as MaterialFile[]) ?? []
  const urls: string[] = useWizardStore.getState().referenceUrls ?? []

  async function handleUpload(): Promise<void> {
    setUploading(true)
    try {
      const result = await window.api.uploadPageMaterials({
        projectId: '_wizard_temp',
        pageId: 'wizard'
      })
      if (result.success && result.files && result.files.length > 0) {
        const newFiles: MaterialFile[] = result.files.map((f: { name: string; relativePath: string; type: string }) => ({
          name: f.name,
          type: getFileType(f.name),
          path: f.relativePath
        }))
        const merged = [...files, ...newFiles]
        setField('materials', merged)

        if (result.docText) {
          const existing = useWizardStore.getState().materialDocText || ''
          const combined = [existing, result.docText].filter(Boolean).join('\n\n')
          setField('materialDocText', combined)
          setDocPreview(combined.slice(0, 2000))
        }
      }
    } catch (err) {
      alert(`上传失败: ${(err as Error).message}`)
    }
    setUploading(false)
  }

  async function handleAIPreview(): Promise<void> {
    if (!docPreview) return
    setAnalyzing(true)
    try {
      const state = useWizardStore.getState()
      const pages = state.selectedPages
      const aiResult = await window.api.aiChat({
        systemPrompt: `你是网站内容规划专家。用户上传了公司文档，请分析内容并建议如何分配到各个页面区块。
用中文简洁回复，列出每个页面应该放什么内容（100字以内每条）。`,
        userMessage: `公司文档摘要:\n${docPreview.slice(0, 1500)}\n\n网站页面: ${pages.join(', ')}`,
        projectId: '_wizard_temp'
      })
      if (aiResult.success && aiResult.response) {
        setDocPreview(aiResult.response)
      }
    } catch { /* ignore */ }
    setAnalyzing(false)
  }

  function removeFile(index: number): void {
    const updated = files.filter((_, i) => i !== index)
    setField('materials', updated)
    if (updated.filter((f) => f.type !== 'image').length === 0) {
      setDocPreview('')
    }
  }

  async function addUrl(): Promise<void> {
    const trimmed = referenceUrl.trim()
    if (!trimmed) return
    let fullUrl: string
    try {
      fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
      new URL(fullUrl)
    } catch {
      alert('请输入有效的网址')
      return
    }

    const current: string[] = useWizardStore.getState().referenceUrls ?? []
    setField('referenceUrls', [...current, fullUrl])
    setReferenceUrl('')

    // Immediately scrape the URL
    setScraping(true)
    try {
      const result = await window.api.scrapeUrl(fullUrl)
      if (result.success && result.content) {
        const c = result.content as { title: string; headings: string[]; design?: { colors: string[]; fonts: string[]; hasAnimations: boolean; hasParallax: boolean; hasSlider: boolean; cssFramework: string } }
        const d = c.design
        const designParts: string[] = []
        if (d?.colors?.length) designParts.push(`主色调: ${d.colors.slice(0, 3).join(', ')}`)
        if (d?.fonts?.length) designParts.push(`字体: ${d.fonts.slice(0, 2).join(', ')}`)
        if (d?.hasAnimations) designParts.push('有动画效果')
        if (d?.hasParallax) designParts.push('有视差滚动')
        if (d?.hasSlider) designParts.push('有轮播组件')
        if (d?.cssFramework && d.cssFramework !== 'custom') designParts.push(`框架: ${d.cssFramework}`)

        const designStr = designParts.length > 0 ? designParts.join(' | ') : '标准布局'
        setScrapedSites((prev) => [...prev, { url: fullUrl, title: c.title || fullUrl, design: designStr }])
        // Store design info for AI generation
        const existing = useWizardStore.getState().referenceDesign || ''
        setField('referenceDesign', [existing, `[${c.title}] ${designStr}`].filter(Boolean).join('\n'))
      }
    } catch { /* ignore */ }
    setScraping(false)
  }

  function removeUrl(index: number): void {
    const current: string[] = useWizardStore.getState().referenceUrls ?? []
    setField('referenceUrls', current.filter((_, i) => i !== index))
    setScrapedSites((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">上传资料</h2>
      <p className="text-muted-foreground mb-6">
        上传公司介绍、产品资料等文档和图片，AI 将智能分析并分配到合适的页面区块
      </p>

      <div className="space-y-4">
        <div>
          <Label className="mb-2 block">文档 / 图片</Label>
          <div
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 cursor-pointer"
            onClick={handleUpload}
          >
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                <p className="text-sm text-muted-foreground">正在上传和解析文件...</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  <span className="text-primary font-medium">点击选择文件</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  支持 PDF、Word、TXT、PPT、图片（jpg/png/bmp）
                </p>
              </>
            )}
          </div>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">已上传 {files.length} 个文件</p>
            {files.map((file, index) => {
              const Icon = FILE_ICON[file.type]
              return (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.type === 'image' ? '图片' : '文档'}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {docPreview && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">文档内容预览</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleAIPreview}
                disabled={analyzing}
              >
                {analyzing ? (
                  <><Loader2 className="h-3 w-3 animate-spin" />AI 分析中...</>
                ) : (
                  <><Sparkles className="h-3 w-3" />AI 智能分析</>
                )}
              </Button>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 max-h-40 overflow-y-auto">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{docPreview.slice(0, 800)}</p>
            </div>
          </div>
        )}

        <div>
          <Label className="mb-2 block">参考网址</Label>
          <p className="text-xs text-muted-foreground mb-2">
            输入参考网站的 URL，AI 将抓取其设计风格（颜色、字体、动效）作为你网站的设计参考
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl() } }}
              disabled={scraping}
            />
            <Button variant="outline" onClick={addUrl} disabled={scraping}>
              {scraping ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Globe className="h-4 w-4 mr-1" />}
              {scraping ? '抓取中...' : '抓取分析'}
            </Button>
          </div>

          {scrapedSites.length > 0 && (
            <div className="mt-3 space-y-2">
              {scrapedSites.map((site, index) => (
                <div key={index} className="rounded-lg border bg-green-50/50 p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{site.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{site.url}</p>
                      <p className="text-xs text-green-700 mt-1">{site.design}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeUrl(index)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-green-600">
                以上设计特征将在 AI 生成网站时作为参考，影响配色、字体和动态效果选择
              </p>
            </div>
          )}

          {urls.length > 0 && scrapedSites.length === 0 && (
            <div className="mt-2 space-y-1">
              {urls.map((url, index) => (
                <div key={`${url}-${index}`} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                  <Link className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{url}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeUrl(index)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
