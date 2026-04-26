import { ipcMain, dialog, app } from 'electron'
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'fs'
import { join, extname, basename } from 'path'
import { getProvider, analyzeBrand, generateWebsiteContent, sanitizeContent, extractJSON } from '../services/ai-provider'
import type { ProviderType } from '../services/ai-provider'
import type { WebsiteContext, GeneratedContent } from '../services/ai-types'
import { parseDocuments } from '../services/doc-parser'
import { scrapeUrl } from '../services/url-scraper'
import { generateSite, getProjectOutputDir, readGeneratedPage } from '../services/site-generator'
import { getDatabase } from '../database'

interface AIConfig {
  provider: ProviderType
  apiKey: string
  baseUrl?: string
  model?: string
}

function getAIConfig(): AIConfig {
  const db = getDatabase()
  const raw = (db.prepare('SELECT value FROM settings WHERE key = ?').get('ai-config') as { value: string } | undefined)?.value

  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      const primary: ProviderType = (parsed.provider || 'claude') as ProviderType

      // If multi-provider configs exist, use the primary provider's saved config
      if (parsed.configs && parsed.configs[primary]) {
        const pc = parsed.configs[primary]
        return {
          provider: primary,
          apiKey: pc.apiKey || parsed.apiKey || '',
          baseUrl: pc.baseUrl || parsed.baseUrl || undefined,
          model: pc.model || parsed.model || undefined
        }
      }

      return {
        provider: primary,
        apiKey: parsed.apiKey || '',
        baseUrl: parsed.baseUrl || undefined,
        model: parsed.model || undefined
      }
    } catch {
      // fall through to defaults
    }
  }

  return { provider: 'claude', apiKey: '', baseUrl: undefined, model: undefined }
}

const PROVIDER_PRIORITY: ProviderType[] = ['deepseek', 'zhipu', 'kimi', 'siliconflow', 'openai', 'claude', 'minimax', 'custom']

export function getAvailableProvider(): AIConfig {
  const db = getDatabase()
  const raw = (db.prepare('SELECT value FROM settings WHERE key = ?').get('ai-config') as { value: string } | undefined)?.value
  if (!raw) return getAIConfig()

  try {
    const parsed = JSON.parse(raw)
    const configs: Record<string, { apiKey?: string; model?: string; baseUrl?: string }> = parsed.configs || {}

    // First try the primary provider
    const primary = getAIConfig()
    if (primary.apiKey) return primary

    // Then try others in priority order
    for (const pid of PROVIDER_PRIORITY) {
      const pc = configs[pid]
      if (pc?.apiKey) {
        return {
          provider: pid,
          apiKey: pc.apiKey,
          model: pc.model || undefined,
          baseUrl: pc.baseUrl || undefined
        }
      }
    }
  } catch { /* ignore */ }

  return getAIConfig()
}

export function registerAIHandlers(): void {
  // Test AI connection
  ipcMain.handle('ai:test-connection', async () => {
    try {
      const config = getAIConfig()
      if (!config.apiKey) {
        return { success: false, error: '请先配置 API Key' }
      }
      const provider = getProvider(config)
      await provider.analyze('Hello', '请回复"连接成功"')
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Fetch available models from a provider's API
  ipcMain.handle('ai:fetch-models', async (_event, params: {
    provider: string
    apiKey: string
    baseUrl?: string
  }) => {
    try {
      if (!params.apiKey) return { success: false, error: '请先填入 API Key' }

      const PROVIDER_URLS: Record<string, string> = {
        openai: 'https://api.openai.com/v1',
        deepseek: 'https://api.deepseek.com',
        zhipu: 'https://open.bigmodel.cn/api/paas/v4',
        kimi: 'https://api.moonshot.cn/v1',
        minimax: 'https://api.minimax.chat/v1',
        siliconflow: 'https://api.siliconflow.cn/v1',
        custom: params.baseUrl || ''
      }

      const baseUrl = PROVIDER_URLS[params.provider]
      if (!baseUrl) return { success: false, error: '该提供商不支持获取模型列表' }

      const { net } = await import('electron')
      const url = `${baseUrl}/models`

      const models = await new Promise<{ id: string; owned_by?: string }[]>((resolve, reject) => {
        const request = net.request(url)
        request.setHeader('Authorization', `Bearer ${params.apiKey}`)
        request.setHeader('Accept', 'application/json')
        let data = ''
        request.on('response', (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode}`))
            return
          }
          response.on('data', (chunk) => { data += chunk.toString() })
          response.on('end', () => {
            try {
              const parsed = JSON.parse(data)
              resolve(parsed.data || [])
            } catch (e) {
              reject(e)
            }
          })
          response.on('error', reject)
        })
        request.on('error', reject)
        request.end()
      })

      const chatModels = models
        .filter((m) => {
          const id = m.id.toLowerCase()
          return !id.includes('embed') && !id.includes('tts') && !id.includes('whisper')
            && !id.includes('dall-e') && !id.includes('moderation') && !id.includes('audio')
            && !id.includes('image') && !id.includes('rerank')
        })
        .map((m) => ({ id: m.id, label: m.id }))
        .sort((a, b) => a.id.localeCompare(b.id))

      return { success: true, models: chatModels }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Parse uploaded documents
  ipcMain.handle('ai:parse-documents', async (_event, filePaths: string[]) => {
    try {
      const text = await parseDocuments(filePaths)
      return { success: true, text }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Scrape a URL
  ipcMain.handle('ai:scrape-url', async (_event, url: string) => {
    try {
      const content = await scrapeUrl(url)
      return { success: true, content }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Analyze brand from materials
  ipcMain.handle('ai:analyze-brand', async (_event, materialText: string) => {
    try {
      const config = getAIConfig()
      if (!config.apiKey) {
        return { success: false, error: '请先配置 API Key' }
      }
      const analysis = await analyzeBrand(config, materialText)
      return { success: true, analysis }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Generate full website content
  ipcMain.handle('ai:generate-content', async (_event, context: WebsiteContext) => {
    try {
      const config = getAIConfig()
      if (!config.apiKey) {
        return { success: false, error: '请先配置 API Key' }
      }
      const content = await generateWebsiteContent(config, context)
      return { success: true, content }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Full pipeline: parse docs + scrape URLs + analyze + generate
  ipcMain.handle('ai:full-pipeline', async (_event, params: {
    filePaths: string[]
    referenceUrls: string[]
    materialDocText?: string
    context: Omit<WebsiteContext, 'materials'>
  }) => {
    try {
      const config = getAIConfig()
      if (!config.apiKey) {
        return { success: false, error: '请先配置 API Key', step: 'config' }
      }

      // Step 1: Parse documents from file paths
      let materialText = ''
      if (params.filePaths.length > 0) {
        try {
          materialText = await parseDocuments(params.filePaths)
        } catch (err) {
          console.error('Document parse failed:', err)
        }
      }

      // Step 1b: Include pre-parsed document text from wizard
      if (params.materialDocText) {
        materialText = materialText
          ? `${materialText}\n\n${params.materialDocText}`
          : params.materialDocText
      }

      // Step 2: Scrape reference URLs — extract content AND design info
      const scrapedTexts: string[] = []
      for (const url of params.referenceUrls) {
        try {
          const scraped = await scrapeUrl(url)
          const d = scraped.design
          const designInfo: string[] = []
          if (d.colors.length > 0) designInfo.push(`主色调: ${d.colors.slice(0, 5).join(', ')}`)
          if (d.fonts.length > 0) designInfo.push(`字体: ${d.fonts.join(', ')}`)
          if (d.hasAnimations) designInfo.push('使用了动画效果')
          if (d.hasParallax) designInfo.push('有视差滚动效果')
          if (d.hasSlider) designInfo.push('有轮播/幻灯片组件')
          if (d.hasVideo) designInfo.push('包含视频内容')
          if (d.cssFramework !== 'custom') designInfo.push(`CSS框架: ${d.cssFramework}`)
          designInfo.push(`布局: ${d.layoutStyle}`)

          scrapedTexts.push(
            `--- 参考网站: ${scraped.title} (${url}) ---\n` +
            `设计特征: ${designInfo.join(' | ')}\n` +
            `页面结构: ${scraped.headings.slice(0, 10).join(' > ')}\n` +
            `内容摘要: ${scraped.bodyText.slice(0, 1500)}`
          )
        } catch {
          // Skip failed URLs
        }
      }
      if (scrapedTexts.length > 0) {
        materialText += '\n\n=== 参考网站分析（请参考其设计风格、配色、布局来生成网站）===\n' + scrapedTexts.join('\n\n')
      }

      // Step 3: Generate content
      const fullContext: WebsiteContext = {
        ...params.context,
        materials: materialText
      }
      const content = await generateWebsiteContent(config, fullContext)

      return { success: true, content }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // AI Chat — conversational design assistant
  ipcMain.handle('ai:chat', async (_event, params: {
    systemPrompt: string
    userMessage: string
    projectId: string
  }) => {
    try {
      const config = getAIConfig()
      if (!config.apiKey) {
        return { success: false, error: '请先在设置中配置 AI API Key' }
      }
      const provider = getProvider(config)
      const response = await provider.analyze(params.userMessage, params.systemPrompt)
      return { success: true, response }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('ai:apply-design-changes', async (_event, params: {
    projectId: string
    instruction: string
    currentConfig: string
  }) => {
    try {
      const config = getAIConfig()
      if (!config.apiKey) {
        return { success: false, error: '请先配置 AI API Key' }
      }

      const projectConfig = JSON.parse(params.currentConfig || '{}')
      const currentContent = projectConfig.generatedContent

      if (!currentContent) {
        return { success: false, error: '项目尚未生成内容，请先生成网站' }
      }

      const compactContent = JSON.stringify(currentContent)

      const prompt = `你是一位网站内容编辑。请根据用户指令修改网站内容JSON并返回完整修改后的JSON。

当前内容:
${compactContent}

用户指令: ${params.instruction}

规则:
- 返回完整的JSON（包含pages、seoMeta、brandAnalysis）
- 所有字段值必须是纯字符串，绝对禁止包含任何HTML标签（如<span>、<div>、<style>等）
- 如果用户要求修改某个区块的字体、字号或字重，请在对应section中添加以下字段:
  - fontFamily: CSS字体值，如 "SimSun, serif"(宋体), "SimHei, sans-serif"(黑体), "KaiTi, serif"(楷体), "YouYuan, sans-serif"(幼圆), "STXinwei, serif"(华文新魏), "Arial, sans-serif", "Georgia, serif"
  - fontSize: CSS字号值，如 "14px"(五号), "16px"(小四), "18px"(四号), "24px"(三号), "32px"(二号), "42px"(一号), "48px", "12px"(小六)
  - fontWeight: CSS字重值，如 "300"(细体), "400"(常规), "500"(中等), "600"(半粗), "700"(粗体), "800"(特粗)
  - 注意：绝对不要在heading/content等文本字段中插入HTML标签来改字体！只能通过上述三个字段来控制。
- 精确执行用户指令，不要改动用户没要求修改的部分
- section type只能是: hero,features,testimonials,pricing,cta,contact,team,faq,gallery,blog-list,about,services
- 只返回JSON，不要有任何其他文字`

      const provider = getProvider(config)
      const result = await provider.analyze(compactContent, prompt)

      let jsonStr = result.trim()
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) jsonStr = jsonMatch[1].trim()

      if (!jsonStr.startsWith('{')) {
        const braceIdx = jsonStr.indexOf('{')
        if (braceIdx >= 0) jsonStr = jsonStr.slice(braceIdx)
      }

      if (jsonStr.startsWith('{')) {
        jsonStr = repairTruncatedJSON(jsonStr)
        const updatedContent = sanitizeContent(JSON.parse(jsonStr) as GeneratedContent)
        return { success: true, content: updatedContent }
      }

      return { success: false, error: 'AI 未返回有效的 JSON 内容' }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Generate static site from AI content
  ipcMain.handle('site:generate', async (_event, params: {
    projectId: string
    projectName: string
    companyName: string
    industry: string
    websiteType: string
    languages: string[]
    selectedPages: string[]
    styleId: string
    paletteId: string
    fontId: string
    content: GeneratedContent
    enableProMax?: boolean
    proMaxEffects?: Record<string, boolean>
    customDesignTokens?: {
      primaryColor?: string
      secondaryColor?: string
      accentColor?: string
      bgColor?: string
      textColor?: string
      fontHeading?: string
      fontBody?: string
    }
  }) => {
    try {
      const result = generateSite(params)
      return { success: true, ...result }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Get project output directory
  ipcMain.handle('site:get-output-dir', (_event, projectId: string) => {
    return getProjectOutputDir(projectId)
  })

  ipcMain.handle('site:read-page', (_event, projectId: string, pageFile: string) => {
    try {
      const outputDir = getProjectOutputDir(projectId)
      let filePath = join(outputDir, pageFile)
      if (!existsSync(filePath)) {
        const files = existsSync(outputDir) ? require('fs').readdirSync(outputDir).filter((f: string) => f.endsWith('.html')) : []
        const baseName = pageFile.replace(/\.html$/, '').toLowerCase()
        const match = files.find((f: string) => f.toLowerCase().replace(/\.html$/, '') === baseName)
        if (match) filePath = join(outputDir, match)
      }

      const html = readGeneratedPage(projectId, pageFile)
      return { success: true, html }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('ai:translate-content', async (_event, params: {
    content: string
    targetLang: string
    targetLangName: string
  }) => {
    try {
      const config = getAIConfig()
      if (!config) return { success: false, error: '未配置 AI 服务' }

      const provider = getProvider(config)
      const prompt = `你是一位专业的多语言网站翻译专家。请将以下网站内容JSON翻译为${params.targetLangName}（${params.targetLang}）。

翻译要求：
- 翻译pages中所有的title、heading、subheading、content、description等文本字段
- 翻译seoMeta中的所有文本字段
- 保持JSON结构完全不变，只翻译文本值
- 不要翻译id字段、type字段、href字段等非显示性字段
- 翻译要自然流畅，符合目标语言的表达习惯
- 所有字段值必须是纯字符串，禁止包含HTML标签
- 只返回JSON，不要有任何其他文字

原始内容:
${params.content}`

      const result = await provider.analyze(params.content, prompt)
      let jsonStr = result.trim()
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) jsonStr = jsonMatch[1].trim()
      if (!jsonStr.startsWith('{')) {
        const braceIdx = jsonStr.indexOf('{')
        if (braceIdx >= 0) jsonStr = jsonStr.slice(braceIdx)
      }
      if (jsonStr.startsWith('{')) {
        jsonStr = repairTruncatedJSON(jsonStr)
        const translated = sanitizeContent(JSON.parse(jsonStr))
        return { success: true, content: translated }
      }
      return { success: false, error: '翻译结果格式不正确' }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Upload page materials — open file dialog, copy files to project assets, return info
  ipcMain.handle('page:upload-materials', async (_event, params: {
    projectId: string
    pageId: string
  }) => {
    try {
      const result = await dialog.showOpenDialog({
        title: `为页面 [${params.pageId}] 选择资料文件`,
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: '所有支持的文件', extensions: ['txt', 'doc', 'docx', 'pdf', 'pptx', 'jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp', 'svg'] },
          { name: '文档', extensions: ['txt', 'doc', 'docx', 'pdf', 'pptx'] },
          { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'webp', 'svg'] }
        ]
      })
      if (result.canceled || !result.filePaths.length) {
        return { success: true, files: [] }
      }

      const outputDir = getProjectOutputDir(params.projectId)
      const assetsDir = join(outputDir, 'assets', 'uploads', params.pageId)
      if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true })

      const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp', '.svg'])
      const files: { name: string; path: string; type: 'image' | 'document'; relativePath: string }[] = []

      for (const filePath of result.filePaths) {
        const ext = extname(filePath).toLowerCase()
        const name = basename(filePath)
        const destPath = join(assetsDir, name)

        copyFileSync(filePath, destPath)

        const isImage = IMAGE_EXTS.has(ext)
        const relativePath = `assets/uploads/${params.pageId}/${name}`
        files.push({
          name,
          path: destPath,
          type: isImage ? 'image' : 'document',
          relativePath
        })
      }

      // Parse text from documents
      let docText = ''
      const docFiles = files.filter((f) => f.type === 'document')
      if (docFiles.length > 0) {
        try {
          const { parseDocuments: parseDocs } = await import('../services/doc-parser')
          docText = await parseDocs(docFiles.map((f) => f.path))
        } catch (parseErr) {
          console.error('Document parse error:', parseErr)
          docText = `[文档解析失败: ${(parseErr as Error).message}]`
        }
      }

      return {
        success: true,
        files,
        docText,
        imageFiles: files.filter((f) => f.type === 'image').map((f) => ({
          name: f.name,
          relativePath: f.relativePath
        }))
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Copy snapshot dist from temp clone project to real project
  ipcMain.handle('site:copy-snapshots', async (_event, params: {
    fromProjectId: string
    toProjectId: string
  }) => {
    try {
      const { cpSync } = await import('fs')
      const srcDir = join(app.getPath('userData'), 'projects', params.fromProjectId, 'dist')
      const destDir = join(app.getPath('userData'), 'projects', params.toProjectId, 'dist')
      if (!existsSync(srcDir)) return { success: false, error: '源快照目录不存在' }
      mkdirSync(destDir, { recursive: true })
      cpSync(srcDir, destDir, { recursive: true })
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // ── Smart Clone: deep-scrape a website and build project JSON via AI ──
  ipcMain.handle('site:clone', async (event, params: {
    url: string
    projectId: string
    projectName: string
    industry: string
    depth?: 'level1' | 'level2'
  }) => {
    const { cloneSite } = await import('../services/site-cloner')
    const sender = event.sender

    try {
      const onProgress = (steps: { step: string; status: string; detail?: string }[]): void => {
        sender.send('site:clone-progress', steps)
      }

      const cloned = await cloneSite(params.url, params.projectId, onProgress, params.depth || 'level1')

      // Write snapshot HTML files directly to disk (never send through IPC)
      const snapshots = cloned.snapshotPages || []
      const hasSnapshots = snapshots.length > 0 && snapshots[0].html.length > 200

      if (hasSnapshots) {
        const distDir = join(app.getPath('userData'), 'projects', params.projectId, 'dist')
        mkdirSync(distDir, { recursive: true })
        for (const sp of snapshots) {
          const filename = sp.id === 'home' ? 'index.html' : `${sp.id}.html`
          writeFileSync(join(distDir, filename), sp.html, 'utf-8')
        }

        const aiSteps = [
          { step: '加载目标网页', status: 'done' },
          { step: '滚动页面加载完整内容', status: 'done' },
          { step: '提取页面结构', status: 'done' },
          { step: '捕获页面快照', status: 'done' },
          { step: '分析设计令牌', status: 'done' },
          { step: '抓取子页面', status: 'done', detail: `${snapshots.length} 个页面已保存` },
          { step: '下载页面资源', status: 'done' },
          { step: '写入文件', status: 'done', detail: `${snapshots.length} 个 HTML 文件已写入磁盘` }
        ]
        sender.send('site:clone-progress', aiSteps)

        // Return only metadata — NO html content through IPC
        const pages = snapshots.map(sp => ({ id: sp.id, title: sp.title, sections: [] }))

        return {
          success: true,
          clonedData: {
            pages,
            seoMeta: { title: cloned.title, description: cloned.description, keywords: [], ogTitle: cloned.title, ogDescription: cloned.description },
            brandAnalysis: { companyName: cloned.title, industry: params.industry, tone: 'professional', keyServices: [], uniqueSellingPoints: [], targetAudience: '', contactInfo: {} },
            sourceUrl: cloned.url,
            screenshot: cloned.screenshot,
            designTokens: cloned.designTokens,
            downloadedImages: cloned.imageUrls,
            snapshotPages: snapshots.map(sp => ({ id: sp.id, title: sp.title })),
            hasSnapshots: true,
            snapshotProjectId: params.projectId
          }
        }
      }

      // Non-snapshot fallback: use AI to build structure (for sites where snapshot fails)
      const config = getAIConfig()
      if (!config.apiKey) {
        return { success: false, error: '请先在设置中配置 AI API Key' }
      }

      const aiSteps = [
        { step: '加载目标网页', status: 'done' },
        { step: '滚动页面加载完整内容', status: 'done' },
        { step: '截取页面快照', status: 'done' },
        { step: '深度提取页面结构', status: 'done' },
        { step: '分析设计令牌', status: 'done' },
        { step: '抓取子页面', status: 'done' },
        { step: '下载页面资源', status: 'done' },
        { step: 'AI 智能分析', status: 'running', detail: '正在让 AI 分析...' }
      ]
      sender.send('site:clone-progress', aiSteps)

      const provider = getProvider(config)
      const navSummary = cloned.navLinks.map(n => `${n.label}`).join(', ')
      const sectionSummary = cloned.sections.map((s, i) =>
        `[${i + 1}] ${s.type}: ${s.heading || '无标题'} | ${(s.content || '').slice(0, 150)}`
      ).join('\n')

      const prompt = `你是网站架构师。请将以下网站数据转换为 JSON（不要 markdown 代码块）：
URL: ${cloned.url} | 标题: ${cloned.title} | 导航: ${navSummary}
区块:\n${sectionSummary}
输出: { "pages": [{"id":"home","title":"首页","sections":[{"type":"hero","heading":"...","content":"..."}]}], "seoMeta": {"title":"...","description":"...","keywords":[],"ogTitle":"...","ogDescription":"..."}, "brandAnalysis": {"companyName":"...","industry":"...","tone":"professional","keyServices":[],"uniqueSellingPoints":[],"targetAudience":"","contactInfo":{}} }
section type 必须是: hero/features/testimonials/pricing/cta/contact/team/faq/gallery/blog-list/about/services。保留原文案。`

      const aiResponse = await provider.analyze(prompt, '只返回 JSON')
      let parsed: Record<string, unknown>
      try {
        parsed = extractJSON<Record<string, unknown>>(aiResponse)
      } catch (e2) {
        aiSteps[7] = { ...aiSteps[7], status: 'error', detail: 'AI 解析失败' }
        sender.send('site:clone-progress', aiSteps)
        return { success: false, error: `AI 响应解析失败: ${(e2 as Error).message}` }
      }

      aiSteps[7] = { ...aiSteps[7], status: 'done', detail: '分析完成' }
      sender.send('site:clone-progress', aiSteps)

      return {
        success: true,
        clonedData: {
          ...parsed,
          sourceUrl: cloned.url,
          screenshot: cloned.screenshot,
          designTokens: cloned.designTokens,
          downloadedImages: cloned.imageUrls,
          snapshotPages: [],
          hasSnapshots: false
        }
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}

function repairTruncatedJSON(json: string): string {
  try {
    JSON.parse(json)
    return json
  } catch {
    // ignore — needs repair
  }

  let s = json.trim()

  // Remove trailing comma
  s = s.replace(/,\s*$/, '')

  // Count brackets
  let braces = 0
  let brackets = 0
  let inString = false
  let escape = false

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') braces++
    else if (ch === '}') braces--
    else if (ch === '[') brackets++
    else if (ch === ']') brackets--
  }

  // If we ended inside a string, close it
  if (inString) {
    s += '"'
  }

  // Remove dangling key without value (e.g. ..."key":)
  s = s.replace(/,?\s*"[^"]*"\s*:\s*$/, '')
  // Remove trailing comma after closing string
  s = s.replace(/,\s*$/, '')

  while (brackets > 0) { s += ']'; brackets-- }
  while (braces > 0) { s += '}'; braces-- }

  return s
}
