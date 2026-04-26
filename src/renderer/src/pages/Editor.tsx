import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Edit3,
  Download,
  CheckCircle,
  Rocket,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  PackageOpen,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Copy
} from 'lucide-react'
import Preview from '@/components/editor/Preview'
import SectionList from '@/components/editor/SectionList'
import PropertyPanel, { type SectionData } from '@/components/editor/PropertyPanel'
import AIChat from '@/components/editor/AIChat'
import PageMaterials from '@/components/editor/PageMaterials'
import { useProjectStore } from '@/stores/project-store'
import { PROMAX_CATEGORIES, PROMAX_EFFECTS, getDefaultProMaxEffects } from '../../../shared/constants'

interface UploadedFile {
  name: string
  type: 'image' | 'document'
  relativePath: string
}
interface PageMaterialData {
  files: UploadedFile[]
  docText?: string
}

interface PageInfo {
  id: string
  title: string
  sections: SectionData[]
}

export default function Editor(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, setCurrentProject } = useProjectStore()

  const [pages, setPages] = useState<PageInfo[]>([])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmed, setConfirmed] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [proMaxEffects, setProMaxEffects] = useState<Record<string, boolean>>(getDefaultProMaxEffects)
  const [aiSnapshot, setAiSnapshot] = useState<string | null>(null)
  const [isSnapshotProject, setIsSnapshotProject] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [pageMaterials, setPageMaterials] = useState<Record<string, PageMaterialData>>({})

  useEffect(() => {
    if (!id) return
    window.api.getProject(id).then((project) => {
      if (project) {
        setCurrentProject(project)
        if (project.status === 'confirmed') setConfirmed(true)
        loadGeneratedPages(id, project)
      } else {
        setLoading(false)
      }
    })
  }, [id])

  async function loadPreview(projectId: string, pageFile = 'index.html'): Promise<void> {
    const result = await window.api.readGeneratedPage(projectId, pageFile)
    if (result.success && result.html) {
      setPreviewHtml(result.html)
    }
  }

  function ensureFooterSection(loadedPages: PageInfo[]): PageInfo[] {
    return loadedPages.map((page) => {
      const hasFooter = (page.sections ?? []).some((s: SectionData) => s.type === 'footer')
      if (hasFooter) return page
      const footerSection: SectionData = {
        type: 'footer',
        heading: '页脚',
        subheading: '专业、可靠、值得信赖',
        content: '欢迎与我们联系',
        items: [
          { title: '电话', description: '400-xxx-xxxx' },
          { title: '邮箱', description: 'contact@example.com' },
          { title: '地址', description: '请填写公司地址' }
        ]
      }
      return { ...page, sections: [...(page.sections ?? []), footerSection] }
    })
  }

  async function loadGeneratedPages(projectId: string, proj?: { config_json?: string }): Promise<void> {
    try {
      const configJson = proj?.config_json || currentProject?.config_json
      const result = await window.api.readGeneratedPage(projectId, 'index.html')
      if (result.success && result.html) {
        setPreviewHtml(result.html)
      }
      if (configJson) {
        try {
          const config = JSON.parse(configJson)
          if (config.cloneMode === 'snapshot') setIsSnapshotProject(true)
          if (config.generatedPages && config.generatedPages.length > 0) {
            setPages(ensureFooterSection(config.generatedPages))
            setShowSidebar(true)
          }
        } catch { /* ignore */ }
      }
    } catch {
      const configJson = proj?.config_json || currentProject?.config_json
      if (configJson) {
        try {
          const config = JSON.parse(configJson)
          if (config.cloneMode === 'snapshot') setIsSnapshotProject(true)
          if (config.generatedPages && config.generatedPages.length > 0) {
            setPages(ensureFooterSection(config.generatedPages))
            setShowSidebar(true)
          }
        } catch { /* ignore */ }
      }
    }
    setLoading(false)
  }

  async function handleGenerate(): Promise<void> {
    if (!currentProject || !id) return
    setGenerating(true)

    try {
      const config = currentProject.config_json ? JSON.parse(currentProject.config_json) : {}

      const languages: string[] = config.languages ?? ['zh-CN']

      // Snapshot clone projects already have HTML files, just reload preview
      if (config.cloneMode === 'snapshot') {
        await loadPreview(id)
        setGenerating(false)
        return
      }

      // If this is a cloned project with existing content, skip AI regeneration
      const isClonedWithContent = config.clonedFrom && config.generatedContent?.pages?.length > 0
      let content: Record<string, unknown>

      if (isClonedWithContent) {
        content = config.generatedContent as Record<string, unknown>
      } else {
        const pipelineResult = await window.api.fullPipeline({
          filePaths: config.materialPaths ?? [],
          referenceUrls: config.referenceUrls ?? [],
          materialDocText: config.materialDocText ?? '',
          context: {
            industry: currentProject.industry,
            companyName: config.companyName ?? currentProject.name,
            projectName: currentProject.name,
            languages,
            websiteType: currentProject.website_type,
            selectedPages: config.selectedPages ?? ['home', 'about', 'services', 'contact'],
            styleId: config.styleId ?? '',
            paletteId: config.paletteId ?? '',
            fontId: config.fontId ?? '',
            referenceUrls: config.referenceUrls ?? []
          }
        })

        if (!pipelineResult.success) {
          alert(`AI 生成失败: ${pipelineResult.error}`)
          setGenerating(false)
          return
        }
        content = pipelineResult.content as Record<string, unknown>
      }

      // Translate content for additional languages
      if (languages.length > 1) {
        const LANG_NAMES: Record<string, string> = {
          'zh-CN': '简体中文', 'zh-TW': '繁體中文', 'en': 'English',
          'de': 'Deutsch', 'ru': 'Русский', 'ko': '한국어', 'ja': '日本語', 'fr': 'Français'
        }
        const translations: Record<string, unknown> = {}
        const primaryContent = JSON.stringify({ pages: content.pages, seoMeta: content.seoMeta, brandAnalysis: content.brandAnalysis })
        for (const lang of languages.slice(1)) {
          try {
            const transResult = await window.api.translateContent({
              content: primaryContent,
              targetLang: lang,
              targetLangName: LANG_NAMES[lang] || lang
            })
            if (transResult.success && transResult.content) {
              translations[lang] = transResult.content
            }
          } catch {
            console.warn(`Translation to ${lang} failed, skipping`)
          }
        }
        content.translations = translations
      }

      const hasAnyEffect = Object.values(proMaxEffects).some(Boolean)
      const siteResult = await window.api.generateSite({
        projectId: id,
        projectName: currentProject.name,
        companyName: config.companyName ?? currentProject.name,
        industry: currentProject.industry,
        websiteType: currentProject.website_type,
        languages,
        selectedPages: config.selectedPages ?? ['home', 'about', 'services', 'contact'],
        styleId: config.styleId ?? '',
        paletteId: config.paletteId ?? '',
        fontId: config.fontId ?? '',
        content,
        enableProMax: hasAnyEffect,
        proMaxEffects,
        customDesignTokens: config.customDesignTokens ?? undefined
      })

      if (!siteResult.success) {
        alert(`网站生成失败: ${siteResult.error}`)
        setGenerating(false)
        return
      }

      const updatedConfig = {
        ...config,
        proMaxEffects,
        generatedContent: content,
        generatedPages: (content as { pages?: PageInfo[] })?.pages ?? []
      }
      await window.api.updateProject(id, {
        config_json: JSON.stringify(updatedConfig),
        status: 'generated'
      })

      await loadPreview(id)

      if (updatedConfig.generatedPages && updatedConfig.generatedPages.length > 0) {
        setPages(updatedConfig.generatedPages)
        setCurrentPageIndex(0)
        setSelectedSectionIndex(null)
      }
      setShowSidebar(true)

      const project = await window.api.getProject(id)
      if (project) setCurrentProject(project)
    } catch (err) {
      alert(`生成出错: ${(err as Error).message}`)
    }
    setGenerating(false)
  }

  async function handleSaveEdits(): Promise<void> {
    if (!id || !currentProject || pages.length === 0) return
    setSaving(true)
    try {
      const config = currentProject.config_json ? JSON.parse(currentProject.config_json) : {}
      const updatedContent = {
        ...(config.generatedContent ?? {}),
        pages: pages.map((p) => ({
          id: p.id,
          title: p.title,
          sections: p.sections
        }))
      }
      const updatedConfig = { ...config, generatedContent: updatedContent, generatedPages: pages }
      await window.api.updateProject(id, { config_json: JSON.stringify(updatedConfig) })

      const siteResult = await window.api.generateSite({
        projectId: id,
        projectName: currentProject.name,
        companyName: config.companyName ?? currentProject.name,
        industry: currentProject.industry,
        websiteType: currentProject.website_type,
        languages: config.languages ?? ['zh-CN'],
        selectedPages: config.selectedPages ?? ['home', 'about', 'services', 'contact'],
        styleId: config.styleId ?? '',
        paletteId: config.paletteId ?? '',
        fontId: config.fontId ?? '',
        content: updatedContent,
        proMaxEffects: config.proMaxEffects ?? proMaxEffects
      })

      if (siteResult.success) {
        const currentFilename = pages[currentPageIndex]?.id === 'home' ? 'index.html' : `${pages[currentPageIndex]?.id}.html`
        await loadPreview(id, currentFilename)
        setDirty(false)
      } else {
        alert(`网站生成失败: ${siteResult.error || '未知错误'}，请检查配置后重试`)
      }

      const project = await window.api.getProject(id)
      if (project) setCurrentProject(project)
    } catch (err) {
      alert(`保存失败: ${(err as Error).message}`)
    }
    setSaving(false)
  }

  async function handlePageSwitch(index: number): Promise<void> {
    setCurrentPageIndex(index)
    setSelectedSectionIndex(null)
    if (!id || !pages[index]) return
    const filename = pages[index].id === 'home' ? 'index.html' : `${pages[index].id}.html`
    await loadPreview(id, filename)
  }

  async function handleConfirm(): Promise<void> {
    if (!id) return
    await window.api.updateProject(id, { status: 'confirmed' })
    setConfirmed(true)
    const project = await window.api.getProject(id)
    if (project) setCurrentProject(project)
  }

  function handleDeploy(): void {
    if (!id) return
    navigate(`/deploy/${id}`)
  }

  async function handleExport(): Promise<void> {
    if (!id) return
    const result = await window.api.exportProject(id)
    if (!result.success && result.error && result.error !== '已取消') {
      alert(result.error)
    }
  }

  async function handleApplyAIChanges(instruction: string): Promise<void> {
    if (!id || !currentProject) return

    const freshProject = await window.api.getProject(id)
    const freshConfigJson = freshProject?.config_json || currentProject.config_json || '{}'

    if (!aiSnapshot) {
      setAiSnapshot(freshConfigJson)
    }

    const result = await window.api.applyDesignChanges({
      projectId: id,
      instruction,
      currentConfig: freshConfigJson
    })

    if (!result.success) {
      throw new Error(result.error || 'AI 修改失败')
    }

    const config = JSON.parse(freshConfigJson)
    const updatedConfig = {
      ...config,
      generatedContent: result.content,
      generatedPages: (result.content as { pages?: PageInfo[] })?.pages ?? []
    }
    await window.api.updateProject(id, {
      config_json: JSON.stringify(updatedConfig),
      status: 'generated'
    })

    const siteResult = await window.api.generateSite({
      projectId: id,
      projectName: currentProject.name,
      companyName: config.companyName ?? currentProject.name,
      industry: currentProject.industry,
      websiteType: currentProject.website_type,
      languages: config.languages ?? ['zh-CN'],
      selectedPages: config.selectedPages ?? ['home', 'about', 'services', 'contact'],
      styleId: config.styleId ?? '',
      paletteId: config.paletteId ?? '',
      fontId: config.fontId ?? '',
      content: result.content,
      proMaxEffects: config.proMaxEffects ?? proMaxEffects
    })

    if (!siteResult.success) {
      throw new Error(siteResult.error || '网站重新生成失败')
    }

    await loadPreview(id)

    if (updatedConfig.generatedPages) {
      setPages(updatedConfig.generatedPages)
    }

    const updatedProject = await window.api.getProject(id)
    if (updatedProject) setCurrentProject(updatedProject)
  }

  async function handleUndoAIChanges(): Promise<void> {
    if (!id || !aiSnapshot) return

    await window.api.updateProject(id, {
      config_json: aiSnapshot,
      status: 'generated'
    })

    const config = JSON.parse(aiSnapshot)
    const content = config.generatedContent

    if (content) {
      const siteResult = await window.api.generateSite({
        projectId: id,
        projectName: currentProject?.name ?? '',
        companyName: config.companyName ?? currentProject?.name ?? '',
        industry: currentProject?.industry ?? '',
        websiteType: currentProject?.website_type ?? 'corporate',
        languages: config.languages ?? ['zh-CN'],
        selectedPages: config.selectedPages ?? ['home', 'about', 'services', 'contact'],
        styleId: config.styleId ?? '',
        paletteId: config.paletteId ?? '',
        fontId: config.fontId ?? '',
        content,
        proMaxEffects: config.proMaxEffects ?? proMaxEffects
      })

      if (!siteResult.success) {
        throw new Error(siteResult.error || '撤回重新生成失败')
      }
    }

    await loadPreview(id)

    if (config.generatedPages) {
      setPages(config.generatedPages)
    }

    const project = await window.api.getProject(id)
    if (project) setCurrentProject(project)
    setAiSnapshot(null)
  }

  function handleConfirmAIChanges(): void {
    setAiSnapshot(null)
  }

  function handleMaterialsChange(pageId: string, files: UploadedFile[], docText?: string): void {
    setPageMaterials((prev) => ({
      ...prev,
      [pageId]: { files, docText }
    }))
  }

  async function handleAutoAssign(_pageId: string): Promise<void> {
    // Collect ALL uploaded materials across all pages
    const allDocTexts: string[] = []
    const allImages: { relativePath: string }[] = []
    for (const pid of Object.keys(pageMaterials)) {
      const mat = pageMaterials[pid]
      if (mat.docText && mat.docText.length > 10 && !mat.docText.startsWith('[文档解析失败')) {
        allDocTexts.push(mat.docText)
      }
      if (mat.docText?.startsWith('[文档解析失败')) {
        alert(mat.docText)
        return
      }
      allImages.push(...mat.files.filter((f) => f.type === 'image').map((f) => ({ relativePath: f.relativePath })))
    }

    if (allDocTexts.length === 0 && allImages.length === 0) {
      alert('请先上传文档或图片')
      return
    }

    const docText = allDocTexts.join('\n\n')
    const changeLog: string[] = []

    // Build full site section map across ALL pages
    type SectionRef = { pageIdx: number; secIdx: number; pageTitle: string }
    const allSections: { section: Record<string, unknown>; ref: SectionRef }[] = []
    for (let pi = 0; pi < pages.length; pi++) {
      for (let si = 0; si < pages[pi].sections.length; si++) {
        allSections.push({
          section: { ...pages[pi].sections[si] },
          ref: { pageIdx: pi, secIdx: si, pageTitle: pages[pi].title }
        })
      }
    }

    // --- Image assignment across all pages ---
    let imgIdx = 0
    for (const entry of allSections) {
      if (imgIdx >= allImages.length) break
      const s = entry.section
      const sType = String(s.type || '')
      if (sType === 'gallery') {
        const batch = allImages.slice(imgIdx, imgIdx + 6).map((f) => f.relativePath)
        s.images = [...(Array.isArray(s.images) ? s.images : []), ...batch]
        changeLog.push(`📷 [${entry.ref.pageTitle}/${s.heading}] ← ${batch.length} 张图片`)
        imgIdx += batch.length
      } else if (['features', 'services', 'team', 'blog-list'].includes(sType)) {
        if (Array.isArray(s.items) && s.items.length > 0) {
          let cnt = 0
          s.items = s.items.map((item: Record<string, unknown>) => {
            if (imgIdx < allImages.length && !item.image) { cnt++; return { ...item, image: allImages[imgIdx++].relativePath } }
            return item
          })
          if (cnt > 0) changeLog.push(`📷 [${entry.ref.pageTitle}/${s.heading}] ← ${cnt} 张卡片图`)
        }
      } else if (['hero', 'about', 'cta'].includes(sType) && !s.image) {
        s.image = allImages[imgIdx++].relativePath
        changeLog.push(`📷 [${entry.ref.pageTitle}/${s.heading}] ← 主图`)
      }
    }

    // --- AI document distribution across ALL pages ---
    if (docText.length > 10) {
      const sectionSummary = allSections.map((e, i) => {
        const s = e.section
        const items = Array.isArray(s.items) ? (s.items as Record<string, unknown>[]).map((it) => String(it.title || '')).filter(Boolean).join('、') : ''
        return `[${i}] 页面:"${e.ref.pageTitle}" 类型:${s.type} 标题:"${s.heading}"${items ? ` 子项:${items}` : ''}`
      }).join('\n')

      let aiOk = false
      try {
        const aiResult = await window.api.aiChat({
          systemPrompt: `你是网站内容编辑专家。用户上传了公司文档，请将文档内容100%分配到网站的各个页面和区块中。

重要要求：
1. 仔细阅读文档的每一段内容，全部分配到合适的区块
2. 不同页面有不同用途：首页hero放核心标语、about页放公司介绍、services页放服务详情、contact页放联系方式等
3. features/services的items要用文档中的实际业务描述替换
4. 返回纯JSON数组: [{"index":0,"field":"content","value":"文字"},...]
5. field: "heading"/"subheading"/"content"/"items"
6. items格式: [{"title":"标题","description":"详细描述"},...]
7. 必须覆盖尽可能多的区块，确保文档内容被充分利用`,
          userMessage: `文档全文:\n${docText.slice(0, 5000)}\n\n所有页面区块:\n${sectionSummary}`,
          projectId: id || ''
        })

        if (aiResult.success && aiResult.response) {
          let jsonStr = aiResult.response.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()
          try {
            const assignments = JSON.parse(jsonStr) as { index: number; field: string; value: unknown }[]
            if (Array.isArray(assignments) && assignments.length > 0) {
              for (const a of assignments) {
                if (typeof a.index !== 'number' || a.index < 0 || a.index >= allSections.length) continue
                const entry = allSections[a.index]
                const sec = entry.section
                const label = `${entry.ref.pageTitle}/${sec.heading}`
                if (a.field === 'heading' && typeof a.value === 'string') {
                  sec.heading = a.value; changeLog.push(`✏️ [${label}] 标题 ← "${a.value.slice(0, 30)}"`)
                } else if (a.field === 'subheading' && typeof a.value === 'string') {
                  sec.subheading = a.value; changeLog.push(`📝 [${label}] 副标题 ← "${a.value.slice(0, 30)}"`)
                } else if (a.field === 'content' && typeof a.value === 'string') {
                  sec.content = a.value; changeLog.push(`📝 [${label}] 正文 ← "${a.value.slice(0, 40)}..."`)
                } else if (a.field === 'items' && Array.isArray(a.value)) {
                  sec.items = a.value.map((it: Record<string, unknown>) => ({
                    ...(Array.isArray(sec.items) ? (sec.items as Record<string, unknown>[]).find((o) => o.title === it.title) || {} : {}),
                    title: String(it.title || ''), description: String(it.description || '')
                  }))
                  changeLog.push(`📋 [${label}] ${a.value.length} 个列表项`)
                }
              }
              aiOk = true
            }
          } catch { changeLog.push('⚠ AI返回格式解析失败') }
        } else if (aiResult.error) {
          changeLog.push(`⚠ AI: ${aiResult.error.slice(0, 80)}`)
        }
      } catch (err) { changeLog.push(`⚠ ${(err as Error).message.slice(0, 80)}`) }

      if (!aiOk) {
        const paras = docText.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 15)
        let pi = 0
        for (const entry of allSections) {
          if (pi >= paras.length) break
          const sType = String(entry.section.type || '')
          if (['about', 'contact', 'generic', 'cta'].includes(sType)) {
            entry.section.content = paras[pi++].slice(0, 800)
            changeLog.push(`📝 [${entry.ref.pageTitle}/${entry.section.heading}] ← 段落${pi}`)
          } else if (sType === 'hero') {
            entry.section.subheading = paras[pi++].slice(0, 150)
            changeLog.push(`📝 [${entry.ref.pageTitle}/${entry.section.heading}] ← 段落${pi}`)
          }
        }
      }
    }

    // Write back to all pages
    const newPages = pages.map((p, pi) => ({
      ...p,
      sections: p.sections.map((_, si) => {
        const found = allSections.find((e) => e.ref.pageIdx === pi && e.ref.secIdx === si)
        return found ? found.section : p.sections[si]
      })
    }))
    setPages(newPages as typeof pages)
    setDirty(true)

    if (changeLog.length > 0) {
      alert(`资料已分配到所有页面！\n\n${changeLog.join('\n')}\n\n请点击「保存编辑」使更改生效。`)
    } else {
      alert('未找到可分配的内容。请确认文档包含文字内容。')
    }
  }

  async function handleExportFullSource(): Promise<void> {
    if (!id) return
    const result = await window.api.exportFullSource(id)
    if (!result.success && result.error && result.error !== '已取消') {
      alert(result.error)
    }
  }

  async function handleSaveAsTemplate(): Promise<void> {
    if (!currentProject) return
    const name = prompt('模板名称:', currentProject.name)
    if (!name) return
    const description = prompt('模板描述 (可选):') || ''
    await window.api.createTemplate({
      name,
      industry: currentProject.industry,
      description,
      config_json: currentProject.config_json || undefined
    })
    alert('模板已保存')
  }

  const currentPage = pages[currentPageIndex]
  const currentSection = currentPage && selectedSectionIndex !== null
    ? currentPage.sections[selectedSectionIndex]
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  function toggleCategory(catId: string): void {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }

  function toggleEffect(effectId: string): void {
    setProMaxEffects((prev) => ({ ...prev, [effectId]: !prev[effectId] }))
  }

  function selectAllEffects(): void {
    const all: Record<string, boolean> = {}
    for (const e of PROMAX_EFFECTS) all[e.id] = true
    setProMaxEffects(all)
  }

  function clearAllEffects(): void {
    const none: Record<string, boolean> = {}
    for (const e of PROMAX_EFFECTS) none[e.id] = false
    setProMaxEffects(none)
  }

  function resetDefaultEffects(): void {
    setProMaxEffects(getDefaultProMaxEffects())
  }

  const enabledCount = Object.values(proMaxEffects).filter(Boolean).length

  if (!previewHtml && !generating) {
    return (
      <div className="p-6 overflow-auto max-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Edit3 className="h-6 w-6" />
            预览与编辑
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentProject?.name ?? '项目'} - 尚未生成网站
          </p>
        </div>

        <div className="rounded-xl border p-6 space-y-5 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">动态效果配置</h2>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                已选 {enabledCount}/{PROMAX_EFFECTS.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAllEffects}>全选</Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={resetDefaultEffects}>默认</Button>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearAllEffects}>清空</Button>
            </div>
          </div>

          <div className="space-y-2">
            {PROMAX_CATEGORIES.map((cat) => {
              const catEffects = PROMAX_EFFECTS.filter((e) => e.category === cat.id)
              const catEnabled = catEffects.filter((e) => proMaxEffects[e.id]).length
              const isExpanded = expandedCategories.has(cat.id)
              return (
                <div key={cat.id} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 transition-colors text-left"
                    onClick={() => toggleCategory(cat.id)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-medium text-sm">{cat.label}</span>
                      <span className="text-xs text-muted-foreground">
                        ({catEnabled}/{catEffects.length})
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {catEffects.map((e) => (
                        <span
                          key={e.id}
                          className={`w-2 h-2 rounded-full ${proMaxEffects[e.id] ? 'bg-primary' : 'bg-muted-foreground/20'}`}
                        />
                      ))}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="border-t px-4 py-2 space-y-1 bg-muted/20">
                      {catEffects.map((effect) => (
                        <label
                          key={effect.id}
                          className="flex items-start gap-3 py-2 px-2 rounded-md cursor-pointer hover:bg-accent/50 transition-colors"
                        >
                          <Checkbox
                            checked={proMaxEffects[effect.id] ?? false}
                            onCheckedChange={() => toggleEffect(effect.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{effect.label}</span>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                              {effect.description}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex justify-center pt-2">
            <Button onClick={handleGenerate} size="lg" className="gap-2">
              <Rocket className="h-4 w-4" />
              开始 AI 生成
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)}>
            {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
          <h1 className="text-sm font-semibold">{currentProject?.name ?? '预览与编辑'}</h1>
          {pages.length > 1 && (
            <div className="flex items-center gap-1 ml-4">
              {pages.map((page, idx) => (
                <Button
                  key={page.id}
                  variant={idx === currentPageIndex ? 'secondary' : 'ghost'}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handlePageSwitch(idx)}
                >
                  {page.title}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {generating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              AI 生成中...
            </div>
          )}

          {dirty && (
            <Button variant="default" size="sm" onClick={handleSaveEdits} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              保存编辑
            </Button>
          )}

          <Button variant="outline" size="sm" disabled={!previewHtml} onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>

          <Button variant="outline" size="sm" disabled={!previewHtml} onClick={handleExportFullSource}>
            <PackageOpen className="h-4 w-4 mr-1" />
            导出源代码包
          </Button>

          <Button variant="outline" size="sm" disabled={!previewHtml} onClick={handleSaveAsTemplate}>
            <Save className="h-4 w-4 mr-1" />
            存为模板
          </Button>

          {previewHtml && currentProject && id && (
            <AIChat
              projectId={id}
              projectName={currentProject.name}
              industry={currentProject.industry}
              configJson={currentProject.config_json || '{}'}
              onApplyChanges={handleApplyAIChanges}
              hasPendingChanges={aiSnapshot !== null}
              onUndo={handleUndoAIChanges}
              onConfirmChanges={handleConfirmAIChanges}
            />
          )}

          {!confirmed ? (
            <Button size="sm" onClick={handleConfirm} disabled={!previewHtml}>
              <CheckCircle className="h-4 w-4 mr-1" />
              确认无误
            </Button>
          ) : (
            <Button size="sm" onClick={handleDeploy}>
              <Rocket className="h-4 w-4 mr-1" />
              部署到云
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {showSidebar && (
          <div className="w-72 border-r flex flex-col shrink-0 overflow-hidden">
            {isSnapshotProject ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <Copy className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium mb-2">快照模式</p>
                <p className="text-xs leading-relaxed">
                  此项目为智能拷贝的页面快照，保留了原网站的完整布局和样式。
                </p>
                <p className="text-xs leading-relaxed mt-2">
                  可直接导出或部署到云端。如需修改内容，请使用 AI 设计助手对话修改。
                </p>
                {pages.length > 1 && (
                  <div className="mt-4 w-full text-left">
                    <p className="text-xs font-medium mb-1">已捕获的页面：</p>
                    {pages.map((p, i) => (
                      <button
                        key={p.id}
                        className={`block w-full text-left text-xs px-2 py-1 rounded ${i === currentPageIndex ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
                        onClick={() => { setCurrentPageIndex(i); if (id) loadPreview(id, p.id === 'home' ? 'index.html' : `${p.id}.html`) }}
                      >
                        {p.title || p.id}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
            <>
            {/* Page-level materials panel */}
            {currentPage && id && (
              <PageMaterials
                pageId={currentPage.id}
                pageTitle={currentPage.title}
                projectId={id}
                materials={pageMaterials}
                onMaterialsChange={handleMaterialsChange}
                onAutoAssign={handleAutoAssign}
              />
            )}

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="h-1/2 border-b overflow-hidden">
                <SectionList
                  sections={currentPage?.sections ?? []}
                  selectedIndex={selectedSectionIndex}
                  onSelect={setSelectedSectionIndex}
                  onReorder={(from, to) => {
                    if (!currentPage) return
                    const newSections = [...currentPage.sections]
                    const [moved] = newSections.splice(from, 1)
                    newSections.splice(to, 0, moved)
                    const newPages = [...pages]
                    newPages[currentPageIndex] = { ...currentPage, sections: newSections }
                    setPages(newPages)
                    setDirty(true)
                    if (selectedSectionIndex === from) setSelectedSectionIndex(to)
                  }}
                />
              </div>
              <div className="h-1/2 overflow-hidden">
                <PropertyPanel
                  section={currentSection ?? null}
                  onUpdate={(updated) => {
                    if (!currentPage || selectedSectionIndex === null) return
                    const newSections = [...currentPage.sections]
                    newSections[selectedSectionIndex] = updated
                    const newPages = [...pages]
                    newPages[currentPageIndex] = { ...currentPage, sections: newSections }
                    setPages(newPages)
                    setDirty(true)
                  }}
                  onDelete={() => {
                    if (!currentPage || selectedSectionIndex === null) return
                    const newSections = currentPage.sections.filter((_, i) => i !== selectedSectionIndex)
                    const newPages = [...pages]
                    newPages[currentPageIndex] = { ...currentPage, sections: newSections }
                    setPages(newPages)
                    setSelectedSectionIndex(null)
                    setDirty(true)
                  }}
                  onUploadImages={currentSection && currentPage && id ? async () => {
                    if (!id || !currentPage || selectedSectionIndex === null) return
                    const result = await window.api.uploadPageMaterials({
                      projectId: id,
                      pageId: currentPage.id
                    })
                    if (!result.success || !result.files?.length) return

                    const newUpFiles: UploadedFile[] = result.files.map((f) => ({
                      name: f.name,
                      type: f.type,
                      relativePath: f.relativePath
                    }))
                    const existing = pageMaterials[currentPage.id]
                    handleMaterialsChange(
                      currentPage.id,
                      [...(existing?.files ?? []), ...newUpFiles],
                      [existing?.docText, result.docText].filter(Boolean).join('\n\n') || undefined
                    )

                    const images = (result.imageFiles ?? []).map((f) => f.relativePath)
                    const section = currentPage.sections[selectedSectionIndex]
                    if (!section) return

                    const updatedSection = { ...section }
                    if (images.length === 1 && !section.image) {
                      updatedSection.image = images[0]
                    } else if (images.length > 0) {
                      updatedSection.images = [...(section.images ?? []), ...images]
                    }

                    if (result.docText) {
                      updatedSection.content = (section.content ? section.content + '\n' : '') + result.docText.slice(0, 500)
                    }

                    const newSections = [...currentPage.sections]
                    newSections[selectedSectionIndex] = updatedSection
                    const newPages = [...pages]
                    newPages[currentPageIndex] = { ...currentPage, sections: newSections }
                    setPages(newPages)
                    setDirty(true)
                  } : undefined}
                />
              </div>
            </div>
            </>
            )}
          </div>
        )}

        <Preview
          html={previewHtml}
          className="flex-1"
          onNavigate={async (href) => {
            if (!id) return
            const pageFile = href.replace(/^\.\//, '')
            const baseName = pageFile.split('/').pop() || 'index.html'
            const matchingIdx = pages.findIndex((p) =>
              (p.id === 'home' && (baseName === 'index.html' || baseName === '')) ||
              baseName === `${p.id}.html`
            )
            if (matchingIdx >= 0) {
              setCurrentPageIndex(matchingIdx)
              setSelectedSectionIndex(null)
            }
            await loadPreview(id, pageFile || 'index.html')
          }}
        />
      </div>
    </div>
  )
}
