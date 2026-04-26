import type { AIProvider, WebsiteContext, GeneratedContent, BrandAnalysis } from './ai-types'
import { getStyleDescription, getLayoutProfile } from './design-system'
import { ClaudeProvider } from './ai-providers/claude'
import { OpenAIProvider } from './ai-providers/openai'
import { CustomProvider } from './ai-providers/custom'
import { DeepSeekProvider } from './ai-providers/deepseek'
import { ZhipuProvider } from './ai-providers/zhipu'
import { KimiProvider } from './ai-providers/kimi'
import { MiniMaxProvider } from './ai-providers/minimax'
import { SiliconFlowProvider } from './ai-providers/siliconflow'

export type ProviderType =
  | 'claude'
  | 'openai'
  | 'deepseek'
  | 'zhipu'
  | 'kimi'
  | 'minimax'
  | 'siliconflow'
  | 'custom'

interface ProviderConfig {
  provider: ProviderType
  apiKey: string
  baseUrl?: string
  model?: string
}

let currentProvider: AIProvider | null = null
let currentConfig: ProviderConfig | null = null

export function getProvider(config: ProviderConfig): AIProvider {
  if (
    currentProvider &&
    currentConfig &&
    currentConfig.provider === config.provider &&
    currentConfig.apiKey === config.apiKey &&
    currentConfig.baseUrl === config.baseUrl &&
    currentConfig.model === config.model
  ) {
    return currentProvider
  }

  switch (config.provider) {
    case 'claude':
      currentProvider = new ClaudeProvider(config.apiKey)
      break
    case 'openai':
      currentProvider = new OpenAIProvider(config.apiKey, config.baseUrl)
      break
    case 'deepseek':
      currentProvider = new DeepSeekProvider(config.apiKey, config.model)
      break
    case 'zhipu':
      currentProvider = new ZhipuProvider(config.apiKey, config.model)
      break
    case 'kimi':
      currentProvider = new KimiProvider(config.apiKey, config.model)
      break
    case 'minimax':
      currentProvider = new MiniMaxProvider(config.apiKey, config.model)
      break
    case 'siliconflow':
      currentProvider = new SiliconFlowProvider(config.apiKey, config.model)
      break
    case 'custom':
      if (!config.baseUrl) throw new Error('Custom provider requires a base URL')
      currentProvider = new CustomProvider(config.apiKey, config.baseUrl, config.model)
      break
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`)
  }

  currentConfig = { ...config }
  return currentProvider
}

export async function analyzeContent(
  config: ProviderConfig,
  content: string,
  prompt: string
): Promise<string> {
  const provider = getProvider(config)
  return provider.analyze(content, prompt)
}

export async function generateWebsiteContent(
  config: ProviderConfig,
  context: WebsiteContext
): Promise<GeneratedContent> {
  const provider = getProvider(config)
  const raw = await provider.generateContent(context)
  return sanitizeContent(raw)
}

/**
 * Extract and parse JSON from AI response text, with auto-repair for truncated output.
 */
export function extractJSON<T>(text: string): T {
  // Strategy 1: Extract from markdown code block
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    const inner = jsonMatch[1].trim()
    try { return JSON.parse(inner) } catch { /* continue */ }
    try { return JSON.parse(repairTruncatedJSON(inner)) } catch { /* continue */ }
  }

  // Strategy 2: Direct parse
  const trimmed = text.trim()
  try { return JSON.parse(trimmed) } catch { /* continue */ }

  // Strategy 3: Find the outermost JSON object { ... }
  const braceStart = text.indexOf('{')
  if (braceStart >= 0) {
    // Find matching closing brace by counting
    let depth = 0, inStr = false, esc = false, end = -1
    for (let i = braceStart; i < text.length; i++) {
      const ch = text[i]
      if (esc) { esc = false; continue }
      if (ch === '\\') { esc = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === '{') depth++
      else if (ch === '}') { depth--; if (depth === 0) { end = i; break } }
    }

    const raw = end >= 0 ? text.slice(braceStart, end + 1) : text.slice(braceStart)
    try { return JSON.parse(raw) } catch { /* continue */ }
    try { return JSON.parse(repairTruncatedJSON(raw)) } catch { /* continue */ }
  }

  // Strategy 4: Strip common AI response wrapping
  const cleaned = text
    .replace(/^[\s\S]*?(?=\{)/m, '')  // Remove everything before first {
    .replace(/\}[\s\S]*$/, '}')        // Remove everything after last }
  try { return JSON.parse(cleaned) } catch { /* continue */ }
  try { return JSON.parse(repairTruncatedJSON(cleaned)) } catch { /* continue */ }

  throw new Error(`AI 返回的内容无法解析为 JSON，请重试`)
}

function repairTruncatedJSON(json: string): string {
  try {
    JSON.parse(json)
    return json
  } catch {
    // needs repair
  }

  let s = json.trim()
  s = s.replace(/,\s*$/, '')

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

  if (inString) s += '"'
  s = s.replace(/,?\s*"[^"]*"\s*:\s*$/, '')
  s = s.replace(/,\s*$/, '')
  while (brackets > 0) { s += ']'; brackets-- }
  while (braces > 0) { s += '}'; braces-- }

  return s
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').trim()
}

function str(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'string') return stripHtml(val)
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (Array.isArray(val)) return val.map(str).filter(Boolean).join(', ')
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    for (const k of ['text', 'value', 'content', 'title', 'heading', 'name', 'label', 'zh', 'en', 'description']) {
      if (typeof obj[k] === 'string' && obj[k]) return stripHtml(obj[k] as string)
    }
    const vals = Object.values(obj).filter((v) => typeof v === 'string' && v)
    if (vals.length > 0) return stripHtml(vals[0] as string)
  }
  return ''
}

export function sanitizeContent(raw: GeneratedContent): GeneratedContent {
  const pages = Array.isArray(raw?.pages) ? raw.pages : []
  const seoMeta = (raw?.seoMeta ?? {}) as unknown as Record<string, unknown>
  const brandAnalysis = raw?.brandAnalysis

  return {
    pages: pages.map((p) => p as unknown as Record<string, unknown>).map((p) => ({
      id: str(p.id) || 'home',
      title: str(p.title) || '页面',
      sections: Array.isArray(p.sections)
        ? p.sections.map((s: Record<string, unknown>) => ({
            type: str(s.type) || 'generic',
            heading: str(s.heading),
            subheading: str(s.subheading) || undefined,
            content: str(s.content),
            items: Array.isArray(s.items)
              ? s.items.map((item: Record<string, unknown>) => ({
                  title: str(item?.title),
                  description: str(item?.description),
                  icon: item?.icon ? str(item.icon) : undefined,
                  image: item?.image ? str(item.image) : undefined,
                  link: item?.link ? str(item.link) : undefined,
                  fontFamily: typeof item?.fontFamily === 'string' ? item.fontFamily : undefined,
                  fontSize: typeof item?.fontSize === 'string' ? item.fontSize : undefined,
                  fontWeight: typeof item?.fontWeight === 'string' ? item.fontWeight : undefined,
                  color: typeof item?.color === 'string' ? item.color : undefined,
                  bgColor: typeof item?.bgColor === 'string' ? item.bgColor : undefined,
                }))
              : undefined,
            fontFamily: typeof s.fontFamily === 'string' ? s.fontFamily : undefined,
            fontSize: typeof s.fontSize === 'string' ? s.fontSize : undefined,
            fontWeight: typeof s.fontWeight === 'string' ? s.fontWeight : undefined,
            color: typeof s.color === 'string' ? s.color : undefined,
            subheadingColor: typeof s.subheadingColor === 'string' ? s.subheadingColor : undefined,
            contentColor: typeof s.contentColor === 'string' ? s.contentColor : undefined,
            image: typeof s.image === 'string' ? s.image : undefined,
            imageSize: typeof s.imageSize === 'string' ? s.imageSize : undefined,
            images: Array.isArray(s.images) ? s.images.map(String) : undefined,
          }))
        : [],
    })),
    seoMeta: {
      title: str(seoMeta.title),
      description: str(seoMeta.description),
      keywords: Array.isArray(seoMeta.keywords)
        ? seoMeta.keywords.map(str)
        : str(seoMeta.keywords).split(',').map((k: string) => k.trim()).filter(Boolean),
      ogTitle: str(seoMeta.ogTitle),
      ogDescription: str(seoMeta.ogDescription),
    },
    brandAnalysis: brandAnalysis as GeneratedContent['brandAnalysis'],
  }
}

export async function analyzeBrand(
  config: ProviderConfig,
  materialText: string
): Promise<BrandAnalysis> {
  const provider = getProvider(config)
  const prompt = `你是一位品牌分析专家。请分析以下公司/品牌资料，提取关键信息。

请以 JSON 格式返回以下结构（不要包含任何其他文字）：

\`\`\`json
{
  "companyName": "公司名称",
  "industry": "所属行业",
  "tone": "品牌调性（如 professional/friendly/luxury/playful/innovative）",
  "keyServices": ["核心服务1", "核心服务2"],
  "uniqueSellingPoints": ["独特卖点1", "独特卖点2"],
  "targetAudience": "目标客户群描述",
  "contactInfo": {
    "phone": "电话（如有）",
    "email": "邮箱（如有）",
    "address": "地址（如有）",
    "website": "网址（如有）"
  }
}
\`\`\``

  const result = await provider.analyze(materialText, prompt)
  return extractJSON<BrandAnalysis>(result)
}

/**
 * Build the prompt for full website content generation.
 */
export function buildContentPrompt(context: WebsiteContext): string {
  const LANG_NAMES: Record<string, string> = {
    'zh-CN': '简体中文', 'zh-TW': '繁體中文', 'en': 'English',
    'de': 'Deutsch', 'ru': 'Русский', 'ko': '한국어', 'ja': '日本語', 'fr': 'Français'
  }
  const primaryLang = context.languages?.[0] || 'zh-CN'
  const langLabel = LANG_NAMES[primaryLang] || primaryLang

  const styleDesc = getStyleDescription(context.styleId)
  const layoutProfile = getLayoutProfile(context.styleId)

  return `你是一位顶尖的网站设计师兼内容策划师。你不仅要生成网站文案，还要作为设计总监为每个区块做出布局、动画、背景、栏数等设计决策。

## 项目信息
- 项目名称: ${context.projectName}
- 公司/品牌名: ${context.companyName}
- 行业: ${context.industry}
- 网站类型: ${context.websiteType}
- 主要语言: ${langLabel}
- 页面: ${context.selectedPages.join(', ')}
- 设计风格: ${context.styleId}
- 布局风格: ${layoutProfile}
- 配色方案: ${context.paletteId}
- 字体搭配: ${context.fontId}

## 设计风格详细说明
${styleDesc}

## 你作为设计总监的职责
你需要为每个 section 做出以下设计决策（通过JSON字段传达）：

1. **layoutHint** — 布局变体，可选值：
   - "centered": 居中布局
   - "split": 左右分栏（图文各半）
   - "fullwidth": 全宽无边距
   - "bento": 便当盒混合网格（大小不一的卡片）
   - "alternating": 左右交替排列
   - "timeline": 时间线/流程线布局
   - "masonry": 瀑布流布局
   - "minimal": 极简留白布局
   - "numbered": 编号列表布局
   请根据内容特点和风格灵活搭配，同一页面内不同 section 应使用不同的 layoutHint 以产生视觉变化！

2. **animation** — 入场动画，可选值：
   - "fade-up": 从下往上淡入
   - "fade-left": 从左侧滑入
   - "fade-right": 从右侧滑入
   - "zoom-in": 缩放出现
   - "flip-up": 翻转出现
   - "slide-up": 快速上滑
   - "none": 无动画
   不同 section 应使用不同动画，避免千篇一律！

3. **bgPattern** — 背景装饰，可选值：
   - "none": 纯色
   - "gradient": 渐变色背景
   - "dots": 点阵纹理
   - "grid": 网格线纹理
   - "waves": 波浪装饰
   - "blob": 浮动色块装饰
   - "dark": 深色背景（白字）
   - "accent": 主题色背景
   一个页面内应交替使用不同背景，创造视觉节奏！

4. **sectionStyle** — 卡片风格，可选值：
   - "card": 标准卡片（有阴影有圆角）
   - "flat": 平面无装饰
   - "bordered": 线框边框
   - "elevated": 浮起高阴影
   - "glass": 毛玻璃效果
   - "outlined": 描边风格

5. **columns** — 网格列数，可选 2/3/4
6. **showDivider** — 是否显示区块间分隔线，true/false
7. **stats** — 数据统计（适用于 stats 类型），如 [{"value":"500+","label":"服务客户"}]

## 内容语气指引
- luxury风格：优雅克制，短句标题，沉稳高端
- bold风格：大胆有力，冲击力强，对比鲜明
- playful风格：活泼友好，轻松比喻，趣味化
- modern风格：简洁专业，科技感，前沿性
- classic风格：稳重专业，结构清晰

${context.materials ? `## 客户提供的资料\n${context.materials}\n` : ''}
${context.referenceUrls.length > 0 ? `## 参考网站\n${context.referenceUrls.join('\n')}\n` : ''}

## 要求

请为每个页面生成丰富且多样的内容。你应该像一位真正的设计师那样，为每个 section 精心搭配不同的布局、动画和背景，让页面充满变化。

返回严格的 JSON 格式（不要包含任何其他文字）：

\`\`\`json
{
  "pages": [
    {
      "id": "home",
      "title": "首页",
      "sections": [
        {
          "type": "hero",
          "heading": "引人注目的主标题",
          "subheading": "副标题",
          "content": "描述文字",
          "layoutHint": "split",
          "animation": "fade-right",
          "bgPattern": "gradient"
        },
        {
          "type": "stats",
          "heading": "数据说话",
          "stats": [
            {"value": "500+", "label": "服务客户"},
            {"value": "99%", "label": "客户满意度"},
            {"value": "10年", "label": "行业经验"},
            {"value": "24/7", "label": "技术支持"}
          ],
          "animation": "zoom-in",
          "bgPattern": "dark"
        },
        {
          "type": "features",
          "heading": "核心优势",
          "subheading": "为什么选择我们",
          "layoutHint": "bento",
          "animation": "fade-up",
          "bgPattern": "none",
          "sectionStyle": "glass",
          "columns": 3,
          "items": [
            {"title": "特性1", "description": "详细描述", "icon": "shield"},
            {"title": "特性2", "description": "详细描述", "icon": "zap"},
            {"title": "特性3", "description": "详细描述", "icon": "rocket"}
          ]
        },
        {
          "type": "services",
          "heading": "我们的服务",
          "layoutHint": "alternating",
          "animation": "fade-left",
          "bgPattern": "dots",
          "items": [...]
        },
        {
          "type": "process",
          "heading": "服务流程",
          "layoutHint": "timeline",
          "animation": "slide-up",
          "items": [
            {"title": "第一步", "description": "...", "value": "01"},
            {"title": "第二步", "description": "...", "value": "02"}
          ]
        },
        {
          "type": "logos",
          "heading": "合作伙伴",
          "animation": "fade-up",
          "bgPattern": "none",
          "items": [
            {"title": "合作伙伴A", "description": ""},
            {"title": "合作伙伴B", "description": ""}
          ]
        },
        {
          "type": "testimonials",
          "heading": "客户评价",
          "layoutHint": "centered",
          "animation": "zoom-in",
          "bgPattern": "accent",
          "items": [...]
        },
        {
          "type": "comparison",
          "heading": "方案对比",
          "subheading": "找到最适合你的方案",
          "items": [
            {"title": "基础版", "description": "适合个人", "value": "¥99/月"},
            {"title": "专业版", "description": "适合团队", "value": "¥299/月"}
          ],
          "animation": "fade-up"
        },
        {
          "type": "cta",
          "heading": "准备好开始了吗？",
          "content": "立即联系我们",
          "animation": "zoom-in",
          "bgPattern": "gradient"
        }
      ]
    }
  ],
  "seoMeta": {
    "title": "SEO标题",
    "description": "SEO描述",
    "keywords": ["关键词1", "关键词2"],
    "ogTitle": "OG标题",
    "ogDescription": "OG描述"
  },
  "brandAnalysis": {
    "companyName": "公司名",
    "industry": "行业",
    "tone": "调性",
    "keyServices": ["服务1"],
    "uniqueSellingPoints": ["卖点1"],
    "targetAudience": "目标受众",
    "contactInfo": {}
  }
}
\`\`\`

## 重要规则
1. section type 可选值: hero, features, testimonials, pricing, cta, contact, team, faq, gallery, blog-list, about, services, stats, process, logos, comparison
2. 文案要专业有说服力，符合${context.industry}行业特点
3. 根据${langLabel}生成内容
4. 首页至少包含 5-8 个 sections，其他页面 3-5 个。section类型必须多样化
5. hero 必须在首页第一个
6. 极其重要：所有字段值必须是纯字符串。items 中的 title、description 也必须是纯字符串
7. icon 可选: shield, zap, star, check, globe, heart, target, award, settings, users, trending, layers, code, rocket
8. 每个 section 都必须包含 layoutHint、animation、bgPattern 字段
9. 同一页面内的 layoutHint 和 animation 应尽量不重复，创造丰富的视觉变化
10. stats 类型必须包含 stats 数组（value+label）
11. process 类型的 items 中用 value 字段存序号如 "01"
12. 只返回 JSON，不要包含 markdown 代码块标记`
}
