import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { GeneratedContent, PageContent, SEOMeta } from './ai-types'
import { buildDesignSystem, getLayoutProfile, type DesignSystem } from './design-system'
import { renderSection } from './section-renderer'

interface GenerateSiteOptions {
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
}

export interface GeneratedSite {
  outputDir: string
  pages: { id: string; path: string; title: string }[]
}

/**
 * Generate a complete static website from AI-generated content and design system.
 */
export function generateSite(options: GenerateSiteOptions): GeneratedSite {
  const outputDir = join(app.getPath('userData'), 'projects', options.projectId, 'dist')
  const assetsDir = join(outputDir, 'assets')
  const cssDir = join(assetsDir, 'css')

  // Create directories
  mkdirSync(cssDir, { recursive: true })

  // Build design system
  const designSystem = buildDesignSystem(options.styleId, options.paletteId, options.fontId)

  // Override with custom design tokens (from cloned sites)
  if (options.customDesignTokens) {
    const t = options.customDesignTokens
    if (t.primaryColor) designSystem.palette.primary = t.primaryColor
    if (t.secondaryColor) designSystem.palette.secondary = t.secondaryColor
    if (t.accentColor) designSystem.palette.accent = t.accentColor
    if (t.bgColor) designSystem.palette.background = t.bgColor
    if (t.textColor) designSystem.palette.text = t.textColor
    if (t.fontHeading) designSystem.palette.primary = designSystem.palette.primary // keep palette
    // Regenerate CSS with overridden values
    const overriddenVars = [
      t.primaryColor && `  --color-primary: ${t.primaryColor};`,
      t.secondaryColor && `  --color-secondary: ${t.secondaryColor};`,
      t.accentColor && `  --color-accent: ${t.accentColor};`,
      t.bgColor && `  --color-background: ${t.bgColor};`,
      t.textColor && `  --color-text: ${t.textColor};`,
      t.fontHeading && `  --font-heading: '${t.fontHeading}', sans-serif;`,
      t.fontBody && `  --font-body: '${t.fontBody}', sans-serif;`,
    ].filter(Boolean).join('\n')
    if (overriddenVars) {
      designSystem.css += `\n:root {\n${overriddenVars}\n}\n`
      designSystem.tailwindConfig = designSystem.tailwindConfig
        .replace(new RegExp(`primary: '${designSystem.palette.primary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`), `primary: '${t.primaryColor || designSystem.palette.primary}'`)
        .replace(new RegExp(`secondary: '${designSystem.palette.secondary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`), `secondary: '${t.secondaryColor || designSystem.palette.secondary}'`)
    }
  }

  // Write CSS
  writeFileSync(join(cssDir, 'style.css'), designSystem.css)

  // Safely access content
  const contentPages = options.content?.pages ?? []
  if (contentPages.length === 0) {
    throw new Error('AI 未生成任何页面内容，请重试')
  }

  // Generate navigation — ensure id/title are always plain strings
  const navItems = contentPages.map((p) => {
    const id = toStr(p.id) || 'home'
    const title = toStr(p.title) || '页面'
    return { id, title, href: id === 'home' ? 'index.html' : `${id}.html` }
  })

  const primaryLang = options.languages?.[0] || 'zh-CN'

  // Generate each page in the primary language
  const generatedPages: { id: string; path: string; title: string }[] = []
  for (const page of contentPages) {
    const pageId = toStr(page.id) || 'home'
    const pageTitle = toStr(page.title) || '页面'
    const filename = pageId === 'home' ? 'index.html' : `${pageId}.html`
    const filePath = join(outputDir, filename)
    const html = generatePageHTML(page, options, designSystem, navItems, options.content.seoMeta, primaryLang)
    writeFileSync(filePath, html)
    generatedPages.push({ id: pageId, path: filePath, title: pageTitle })
  }

  // Generate translated pages for additional languages (stored in subfolders)
  const translations: Record<string, GeneratedContent> = options.content.translations ?? {}
  const additionalLangs = (options.languages ?? []).filter((l) => l !== primaryLang)
  for (const lang of additionalLangs) {
    const translated = translations[lang]
    if (!translated) continue
    const langDir = join(outputDir, lang)
    const langCssDir = join(langDir, 'assets', 'css')
    mkdirSync(langCssDir, { recursive: true })
    writeFileSync(join(langCssDir, 'style.css'), designSystem.css)
    writeFaviconSVG(langDir, designSystem.palette.primary)

    const translatedPages = translated.pages ?? contentPages
    const translatedNav = translatedPages.map((p) => {
      const id = toStr(p.id) || 'home'
      const title = toStr(p.title) || '页面'
      return { id, title, href: id === 'home' ? 'index.html' : `${id}.html` }
    })

    for (const page of translatedPages) {
      const pageId = toStr(page.id) || 'home'
      const filename = pageId === 'home' ? 'index.html' : `${pageId}.html`
      const filePath = join(langDir, filename)
      const translatedSeo = translated.seoMeta ?? options.content.seoMeta
      const html = generatePageHTML(page, options, designSystem, translatedNav, translatedSeo, lang)
      writeFileSync(filePath, html)
    }
  }

  // Generate favicon placeholder
  writeFaviconSVG(outputDir, designSystem.palette.primary)

  return { outputDir, pages: generatedPages }
}

function generatePageHTML(
  page: PageContent,
  options: GenerateSiteOptions,
  designSystem: DesignSystem,
  navItems: { id: string; title: string; href: string }[],
  seoMeta: SEOMeta,
  currentLang?: string
): string {
  const pageId = toStr(page.id) || 'home'
  const isHome = pageId === 'home'
  const safeMeta = seoMeta ?? {} as SEOMeta
  const companyName = toStr(options.companyName) || '网站'
  const pageTitle = toStr(page.title) || '页面'
  const title = isHome ? (toStr(safeMeta.title) || companyName) : `${pageTitle} - ${companyName}`
  const description = isHome ? (toStr(safeMeta.description) || companyName) : `${pageTitle} - ${companyName}`

  const layoutProfile = getLayoutProfile(options.styleId)
  const allSections = page.sections ?? []
  const footerSection = allSections.find((s) => toStr(s.type) === 'footer')
  const contentSections = allSections.filter((s) => toStr(s.type) !== 'footer')
  const sectionsHTML = contentSections.map((s) => renderSection(s, options.styleId, layoutProfile)).join('\n\n')
  const meta = seoMeta ?? {} as SEOMeta

  const rawTwConfig = typeof designSystem.tailwindConfig === 'string' ? designSystem.tailwindConfig : '{}'
  const twConfig = (rawTwConfig || '{}')
    .replace('module.exports = ', '')
    .replace(/\n/g, '\n    ')

  const lang = currentLang || options.languages?.[0] || 'zh-CN'
  const pageFile = pageId === 'home' ? 'index.html' : `${pageId}.html`

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="keywords" content="${esc(Array.isArray(meta.keywords) ? meta.keywords.map(toStr).join(', ') : toStr(meta.keywords))}">
  <meta property="og:title" content="${esc(toStr(meta.ogTitle) || title)}">
  <meta property="og:description" content="${esc(toStr(meta.ogDescription) || description)}">
  <meta property="og:type" content="website">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="assets/css/style.css">
  <!-- AOS Animate on Scroll -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css">
  <!-- Animate.css -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/animate.css@4.1.1/animate.min.css">
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>
    tailwind.config = ${twConfig}
  <\/script>
  ${options.enableProMax || options.proMaxEffects ? getProMaxCSS(options.proMaxEffects) : ''}
</head>
<body class="bg-background text-foreground font-body">
  ${generateHeader(companyName, navItems, pageId, options.languages ?? [lang], lang, pageFile)}

  <main>
    ${sectionsHTML}
  </main>

  ${generateFooter(companyName, navItems, footerSection)}
  <!-- AOS init -->
  <script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"><\/script>
  <script>AOS.init({duration:800,once:true,offset:60,easing:'ease-out-cubic'});<\/script>
  <!-- GSAP for advanced animations -->
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"><\/script>
  <script>gsap.registerPlugin(ScrollTrigger);<\/script>
  ${options.enableProMax || options.proMaxEffects ? getProMaxJS(options.proMaxEffects) : ''}
</body>
</html>`
}

function generateLanguageSwitcher(languages: string[], currentLang: string, currentPageFile: string): string {
  if (languages.length <= 1) return ''
  const LANG_NAMES: Record<string, string> = {
    'zh-CN': '简体中文', 'zh-TW': '繁體中文', 'en': 'English',
    'de': 'Deutsch', 'ru': 'Русский', 'ko': '한국어', 'ja': '日本語', 'fr': 'Français'
  }
  const primaryLang = languages[0]
  const items = languages.map((lang) => {
    let href: string
    if (lang === primaryLang) {
      href = currentPageFile
    } else {
      href = `${lang}/${currentPageFile}`
    }
    const isActive = lang === currentLang
    return `<a href="${href}" class="block px-3 py-1.5 text-sm rounded ${isActive ? 'bg-primary text-white font-medium' : 'text-foreground/70 hover:bg-foreground/5'}" data-lang="${lang}">${LANG_NAMES[lang] || lang}</a>`
  }).join('\n            ')

  return `<div class="relative" id="lang-switcher">
          <button onclick="document.getElementById('lang-dropdown').classList.toggle('hidden')" class="flex items-center gap-1 text-sm text-foreground/70 hover:text-foreground px-2 py-1 rounded border border-gray-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
            ${LANG_NAMES[currentLang] || currentLang}
          </button>
          <div id="lang-dropdown" class="hidden absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
            ${items}
          </div>
        </div>`
}

function generateHeader(
  companyName: string,
  navItems: { id: string; title: string; href: string }[],
  currentPageId: string,
  languages: string[],
  currentLang: string,
  currentPageFile: string
): string {
  const langSwitcher = generateLanguageSwitcher(languages, currentLang, currentPageFile)
  return `<header class="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-gray-100">
    <div class="container mx-auto px-6">
      <nav class="flex items-center justify-between h-16">
        <a href="index.html" class="text-xl font-heading font-bold text-foreground">${esc(companyName)}</a>
        <div class="hidden md:flex items-center gap-8">
          ${navItems.map((item) => `<a href="${item.href}" class="text-sm font-medium ${item.id === currentPageId ? 'text-primary' : 'text-foreground/70 hover:text-foreground'} transition-colors">${esc(item.title)}</a>`).join('\n          ')}
          ${langSwitcher}
        </div>
        <button class="md:hidden p-2" onclick="document.getElementById('mobile-menu').classList.toggle('hidden')">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
      </nav>
      <div id="mobile-menu" class="hidden md:hidden pb-4">
        ${navItems.map((item) => `<a href="${item.href}" class="block py-2 text-sm ${item.id === currentPageId ? 'text-primary font-medium' : 'text-foreground/70'}">${esc(item.title)}</a>`).join('\n        ')}
        ${langSwitcher ? `<div class="pt-2 border-t mt-2">${langSwitcher}</div>` : ''}
      </div>
    </div>
  </header>`
}

function generateFooter(
  companyName: string,
  navItems: { id: string; title: string; href: string }[],
  footerSection?: PageContent['sections'][0]
): string {
  const year = new Date().getFullYear()
  const slogan = footerSection?.subheading ? toStr(footerSection.subheading) : '专业、可靠、值得信赖'
  const contactText = footerSection?.content ? toStr(footerSection.content) : '欢迎与我们联系'
  const contactItems = footerSection?.items ?? []
  const footerBg = footerSection?.bgColor
    ? ` style="background-color:${footerSection.bgColor}"`
    : ''
  const footerBgClass = footerSection?.bgColor ? '' : 'bg-foreground/5'
  const isDarkBg = footerSection?.bgColor ? (() => {
    const c = footerSection.bgColor!.replace('#', '')
    if (c.length >= 6) {
      const r = parseInt(c.substring(0, 2), 16)
      const g = parseInt(c.substring(2, 4), 16)
      const b = parseInt(c.substring(4, 6), 16)
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5
    }
    return false
  })() : false
  const textCls = isDarkBg ? 'text-white' : 'text-foreground'
  const subCls = isDarkBg ? 'text-white/60' : 'text-foreground/60'
  const borderCls = isDarkBg ? 'border-white/10' : 'border-gray-100'
  const borderCls2 = isDarkBg ? 'border-white/10' : 'border-gray-200'
  const copyCls = isDarkBg ? 'text-white/40' : 'text-foreground/40'
  return `<footer class="${footerBgClass} border-t ${borderCls} py-12"${footerBg}>
    <div class="container mx-auto px-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 class="font-heading font-bold ${textCls} text-lg mb-2">${esc(companyName)}</h3>
          <p class="${subCls} text-sm">${esc(slogan)}</p>
        </div>
        <div>
          <h4 class="font-medium ${textCls} mb-3">快速链接</h4>
          <div class="space-y-2">
            ${navItems.map((item) => `<a href="${item.href}" class="block text-sm ${subCls} hover:text-primary transition-colors">${esc(item.title)}</a>`).join('\n            ')}
          </div>
        </div>
        <div>
          <h4 class="font-medium ${textCls} mb-3">联系我们</h4>
          ${contactItems.length > 0
            ? contactItems.map((ci) => `<div class="mb-2"><span class="text-sm font-medium ${textCls}">${esc(ci.title)}</span><p class="text-sm ${subCls}">${esc(ci.description)}</p></div>`).join('\n          ')
            : `<p class="text-sm ${subCls}">${esc(contactText)}</p>`
          }
        </div>
      </div>
      <div class="mt-8 pt-8 border-t ${borderCls2} text-center text-sm ${copyCls}">
        &copy; ${year} ${esc(companyName)}. All rights reserved.
      </div>
    </div>
  </footer>`
}

function writeFaviconSVG(outputDir: string, primaryColor: string): void {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="${primaryColor}"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="white" font-size="18" font-weight="bold" font-family="sans-serif">W</text>
</svg>`
  writeFileSync(join(outputDir, 'favicon.svg'), svg)
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').trim()
}

function toStr(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'string') return stripHtml(val)
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (Array.isArray(val)) return val.map(toStr).filter(Boolean).join(', ')
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    for (const key of ['text', 'value', 'content', 'title', 'heading', 'name', 'label', 'zh', 'en', 'description']) {
      if (typeof obj[key] === 'string' && obj[key]) return stripHtml(obj[key] as string)
    }
    const vals = Object.values(obj).filter((v) => typeof v === 'string' && v)
    if (vals.length > 0) return stripHtml(vals[0] as string)
  }
  return ''
}

function esc(str: unknown): string {
  return toStr(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Get the output directory for a project.
 */
export function getProjectOutputDir(projectId: string): string {
  return join(app.getPath('userData'), 'projects', projectId, 'dist')
}

/**
 * Read a generated page HTML file and make it fully self-contained for
 * iframe srcDoc rendering (inline all local CSS, replace Tailwind CDN
 * with generated utility CSS).
 */
export function readGeneratedPage(projectId: string, pageFile: string): string {
  const outputDir = getProjectOutputDir(projectId)
  let filePath = join(outputDir, pageFile)

  if (!existsSync(filePath)) {
    const files = existsSync(outputDir) ? readdirSync(outputDir).filter((f) => f.endsWith('.html')) : []
    const baseName = pageFile.replace(/\.html$/, '').toLowerCase()
    const match = files.find((f) => f.toLowerCase().replace(/\.html$/, '') === baseName)
    if (match) {
      filePath = join(outputDir, match)
    } else {
      throw new Error(`Page file not found: ${pageFile} (available: ${files.join(', ')})`)
    }
  }

  let html = readFileSync(filePath, 'utf-8')
  const pageDir = join(filePath, '..')

  // Snapshot pages (from smart clone) have a marker comment — return as-is
  if (html.includes('<!-- webforge-snapshot -->')) {
    return html
  }

  // 1) Inline local CSS files
  html = html.replace(
    /<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/gi,
    (_match, href: string) => {
      try {
        const cssPath = join(pageDir, href)
        const css = readFileSync(cssPath, 'utf-8')
        return `<style>${css}</style>`
      } catch {
        return _match
      }
    }
  )

  // 2) Extract Tailwind config colors/fonts, then replace CDN script +
  //    config block with a comprehensive utility stylesheet
  const configMatch = html.match(/tailwind\.config\s*=\s*(\{[\s\S]*?\})\s*<\/script>/i)
  let utilityCSS = ''
  if (configMatch) {
    try {
      const configText = configMatch[1]
        .replace(/'/g, '"')
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/(\w+)\s*:/g, '"$1":')
      const cfg = JSON.parse(configText)
      const colors = cfg?.theme?.extend?.colors ?? {}
      const fonts = cfg?.theme?.extend?.fontFamily ?? {}
      utilityCSS = buildTailwindUtilityCSS(colors, fonts)
    } catch {
      utilityCSS = buildFallbackUtilityCSS()
    }
  } else {
    utilityCSS = buildFallbackUtilityCSS()
  }

  // Remove Tailwind CDN script and config script
  html = html.replace(/<script\s+src="https:\/\/cdn\.tailwindcss\.com"[^>]*><\/script>/gi, '')
  html = html.replace(/<script>\s*tailwind\.config\s*=[\s\S]*?<\/script>/gi, '')

  // Inject utility CSS right before </head>
  html = html.replace('</head>', `<style>${utilityCSS}</style>\n</head>`)

  // Inline local images as base64 for srcDoc preview
  const inlineLocalImage = (relPath: string): string | null => {
    try {
      const imgPath = join(pageDir, relPath)
      if (existsSync(imgPath)) {
        const ext = relPath.split('.').pop()?.toLowerCase() ?? 'png'
        const mime = ext === 'svg' ? 'image/svg+xml'
          : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
          : ext === 'png' ? 'image/png'
          : ext === 'gif' ? 'image/gif'
          : ext === 'webp' ? 'image/webp'
          : ext === 'bmp' ? 'image/bmp'
          : 'image/png'
        return `data:${mime};base64,${readFileSync(imgPath).toString('base64')}`
      }
    } catch { /* ignore */ }
    return null
  }

  // Handle src="assets/uploads/..."
  html = html.replace(
    /src="(assets\/[^"]+)"/gi,
    (_match, src: string) => {
      const b64 = inlineLocalImage(src)
      return b64 ? `src="${b64}"` : _match
    }
  )

  // Handle background-image: url('assets/uploads/...')
  html = html.replace(
    /url\(['"]?(assets\/[^'")]+)['"]?\)/gi,
    (_match, src: string) => {
      const b64 = inlineLocalImage(src)
      return b64 ? `url('${b64}')` : _match
    }
  )

  return html
}

function buildTailwindUtilityCSS(
  colors: Record<string, string>,
  fonts: Record<string, string[]>
): string {
  const lines: string[] = []

  // Color utilities
  for (const [name, value] of Object.entries(colors)) {
    const c = String(value)
    lines.push(`.bg-${name} { background-color: ${c}; }`)
    lines.push(`.text-${name} { color: ${c}; }`)
    lines.push(`.border-${name} { border-color: ${c}; }`)
    lines.push(`.ring-${name} { --tw-ring-color: ${c}; }`)
    // Opacity variants
    for (const op of [5, 10, 20, 30]) {
      const a = (op / 100).toFixed(2)
      lines.push(`.bg-${name}\\/${op} { background-color: ${hexToRgba(c, a)}; }`)
      lines.push(`.text-${name}\\/${op} { color: ${hexToRgba(c, a)}; }`)
      lines.push(`.ring-${name}\\/${op} { --tw-ring-color: ${hexToRgba(c, a)}; }`)
    }
    for (const op of [40, 50, 60, 70, 80, 90]) {
      const a = (op / 100).toFixed(2)
      lines.push(`.bg-${name}\\/${op} { background-color: ${hexToRgba(c, a)}; }`)
      lines.push(`.text-${name}\\/${op} { color: ${hexToRgba(c, a)}; }`)
    }
  }

  // Font family utilities
  for (const [name, value] of Object.entries(fonts)) {
    const fam = Array.isArray(value) ? value.join(', ') : String(value)
    lines.push(`.font-${name} { font-family: ${fam}; }`)
  }

  return getTailwindBaseUtilities() + '\n' + lines.join('\n')
}

function buildFallbackUtilityCSS(): string {
  return getTailwindBaseUtilities() + `
.bg-primary { background-color: var(--color-primary); }
.text-primary { color: var(--color-primary); }
.border-primary { border-color: var(--color-primary); }
.bg-secondary { background-color: var(--color-secondary); }
.text-secondary { color: var(--color-secondary); }
.bg-accent { background-color: var(--color-accent); }
.bg-background { background-color: var(--color-background); }
.text-foreground { color: var(--color-text); }
.bg-foreground\\/5 { background-color: rgba(0,0,0,0.05); }
.text-foreground\\/30 { color: rgba(0,0,0,0.30); }
.text-foreground\\/40 { color: rgba(0,0,0,0.40); }
.text-foreground\\/60 { color: rgba(0,0,0,0.60); }
.text-foreground\\/70 { color: rgba(0,0,0,0.70); }
.font-heading { font-family: var(--font-heading); }
.font-body { font-family: var(--font-body); }
`
}

function hexToRgba(hex: string, alpha: string): string {
  const h = hex.replace('#', '')
  if (h.length < 6) return hex
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return hex
  return `rgba(${r},${g},${b},${alpha})`
}

function getTailwindBaseUtilities(): string {
  return `
/* Tailwind-compatible utility classes */
.container { width: 100%; max-width: 1200px; margin-left: auto; margin-right: auto; padding-left: 1.5rem; padding-right: 1.5rem; }
.mx-auto { margin-left: auto; margin-right: auto; }
.px-4 { padding-left: 1rem; padding-right: 1rem; }
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
.px-8 { padding-left: 2rem; padding-right: 2rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.py-4 { padding-top: 1rem; padding-bottom: 1rem; }
.py-6 { padding-top: 1.5rem; padding-bottom: 1.5rem; }
.py-8 { padding-top: 2rem; padding-bottom: 2rem; }
.py-12 { padding-top: 3rem; padding-bottom: 3rem; }
.py-16 { padding-top: 4rem; padding-bottom: 4rem; }
.py-20 { padding-top: 5rem; padding-bottom: 5rem; }
.p-2 { padding: 0.5rem; }
.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }
.p-8 { padding: 2rem; }
.pb-4 { padding-bottom: 1rem; }
.pt-8 { padding-top: 2rem; }
.mb-1 { margin-bottom: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mb-4 { margin-bottom: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mb-8 { margin-bottom: 2rem; }
.mb-10 { margin-bottom: 2.5rem; }
.mb-12 { margin-bottom: 3rem; }
.mt-8 { margin-top: 2rem; }
.ml-4 { margin-left: 1rem; }
.mr-1 { margin-right: 0.25rem; }
.gap-1 { gap: 0.25rem; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }
.gap-8 { gap: 2rem; }
.gap-12 { gap: 3rem; }
.space-y-2 > :not(:first-child) { margin-top: 0.5rem; }
.space-y-4 > :not(:first-child) { margin-top: 1rem; }
.space-y-6 > :not(:first-child) { margin-top: 1.5rem; }
.flex { display: flex; }
.inline-flex { display: inline-flex; }
.grid { display: grid; }
.hidden { display: none; }
.block { display: block; }
.flex-col { flex-direction: column; }
.flex-1 { flex: 1 1 0%; }
.shrink-0 { flex-shrink: 0; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
.text-white { color: #ffffff; }
.text-gray-100 { color: #f3f4f6; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.leading-tight { line-height: 1.25; }
.leading-relaxed { line-height: 1.625; }
.italic { font-style: italic; }
.line-clamp-3 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 0.75rem; }
.rounded-2xl { border-radius: 1rem; }
.rounded-full { border-radius: 9999px; }
.border { border-width: 1px; }
.border-2 { border-width: 2px; }
.border-b { border-bottom-width: 1px; }
.border-t { border-top-width: 1px; }
.border-gray-100 { border-color: #f3f4f6; }
.border-gray-200 { border-color: #e5e7eb; }
.shadow-sm { box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); }
.shadow-lg { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1); }
.bg-white { background-color: #ffffff; }
.bg-gray-50 { background-color: #f9fafb; }
.bg-gray-100 { background-color: #f3f4f6; }
.overflow-hidden { overflow: hidden; }
.w-full { width: 100%; }
.w-6 { width: 1.5rem; }
.w-10 { width: 2.5rem; }
.w-12 { width: 3rem; }
.w-24 { width: 6rem; }
.h-6 { height: 1.5rem; }
.h-10 { height: 2.5rem; }
.h-12 { height: 3rem; }
.h-16 { height: 4rem; }
.h-24 { height: 6rem; }
.max-w-2xl { max-width: 42rem; }
.max-w-3xl { max-width: 48rem; }
.max-w-4xl { max-width: 56rem; }
.max-w-5xl { max-width: 64rem; }
.aspect-video { aspect-ratio: 16/9; }
.relative { position: relative; }
.sticky { position: sticky; }
.top-0 { top: 0; }
.z-50 { z-index: 50; }
.transition-colors { transition-property: color, background-color, border-color; transition-duration: 150ms; }
.transition-shadow { transition-property: box-shadow; transition-duration: 150ms; }
.transition-opacity { transition-property: opacity; transition-duration: 150ms; }
.transition-all { transition-property: all; transition-duration: 150ms; }
.opacity-90 { opacity: 0.9; }
.cursor-pointer { cursor: pointer; }
.outline-none { outline: none; }
.resize-none { resize: none; }
.backdrop-blur-md { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.bg-background\\/80 { background-color: rgba(255,255,255,0.8); }
.hover\\:shadow-md:hover { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); }
.hover\\:opacity-90:hover { opacity: 0.9; }
.hover\\:bg-gray-50:hover { background-color: #f9fafb; }
.focus\\:ring-2:focus { box-shadow: 0 0 0 2px var(--color-primary, #3b82f6); }
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }

@media (min-width: 640px) {
  .sm\\:flex-row { flex-direction: row; }
  .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 768px) {
  .md\\:flex { display: flex; }
  .md\\:hidden { display: none; }
  .md\\:py-24 { padding-top: 6rem; padding-bottom: 6rem; }
  .md\\:py-32 { padding-top: 8rem; padding-bottom: 8rem; }
  .md\\:text-2xl { font-size: 1.5rem; line-height: 2rem; }
  .md\\:text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
  .md\\:text-6xl { font-size: 3.75rem; line-height: 1; }
  .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (min-width: 1024px) {
  .lg\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
`
}

function on(fx: Record<string, boolean> | undefined, id: string): boolean {
  if (!fx) return true
  return fx[id] !== false
}

function getProMaxCSS(fx?: Record<string, boolean>): string {
  const css: string[] = ['<style>', '/* Dynamic Enhancements */']

  // ── Scroll entrance (MORE dramatic) ──
  if (on(fx, 'scrollEntrance')) {
    css.push(`
@keyframes fadeInUp { from { opacity:0; transform:translateY(80px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeInDown { from { opacity:0; transform:translateY(-60px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeInLeft { from { opacity:0; transform:translateX(-80px) } to { opacity:1; transform:translateX(0) } }
@keyframes fadeInRight { from { opacity:0; transform:translateX(80px) } to { opacity:1; transform:translateX(0) } }
@keyframes scaleIn { from { opacity:0; transform:scale(0.8) } to { opacity:1; transform:scale(1) } }
@keyframes rotateIn { from { opacity:0; transform:rotate(-8deg) scale(0.85) } to { opacity:1; transform:rotate(0) scale(1) } }
@keyframes flipInX { from { opacity:0; transform:perspective(600px) rotateX(-30deg) } to { opacity:1; transform:perspective(600px) rotateX(0) } }
.promax-animate { opacity:0; transition:none }
.promax-animate.promax-visible { animation-duration:1s; animation-fill-mode:both; animation-timing-function:cubic-bezier(0.22,0.61,0.36,1) }
.promax-fade-up.promax-visible { animation-name:fadeInUp }
.promax-fade-down.promax-visible { animation-name:fadeInDown }
.promax-fade-left.promax-visible { animation-name:fadeInLeft }
.promax-fade-right.promax-visible { animation-name:fadeInRight }
.promax-scale-in.promax-visible { animation-name:scaleIn }
.promax-rotate-in.promax-visible { animation-name:rotateIn }
.promax-flip-in.promax-visible { animation-name:flipInX }`)
  }

  // ── Stagger grid (slower, more noticeable) ──
  if (on(fx, 'staggerGrid')) {
    css.push(`
.promax-stagger.promax-visible > * { opacity:0; animation:fadeInUp 0.7s both }
.promax-stagger.promax-visible > *:nth-child(1) { animation-delay:0.08s }
.promax-stagger.promax-visible > *:nth-child(2) { animation-delay:0.18s }
.promax-stagger.promax-visible > *:nth-child(3) { animation-delay:0.28s }
.promax-stagger.promax-visible > *:nth-child(4) { animation-delay:0.38s }
.promax-stagger.promax-visible > *:nth-child(5) { animation-delay:0.48s }
.promax-stagger.promax-visible > *:nth-child(6) { animation-delay:0.58s }
.promax-stagger.promax-visible > *:nth-child(n+7) { animation-delay:0.68s }`)
  }

  // ── Reveal line ──
  if (on(fx, 'revealLine')) {
    css.push(`
@keyframes promax-line-grow { from { width:0 } to { width:80px } }
.promax-reveal-line { position:relative; padding-top:20px }
.promax-reveal-line::before { content:''; position:absolute; top:0; left:50%; transform:translateX(-50%); height:3px; width:0; background:linear-gradient(90deg,var(--color-primary,#3b82f6),#8b5cf6); border-radius:2px }
.promax-reveal-line.promax-visible::before { animation:promax-line-grow 0.8s 0.2s cubic-bezier(0.22,0.61,0.36,1) both }`)
  }

  // ── Card effects (MORE visible) ──
  if (on(fx, 'cardLift')) {
    css.push(`
.promax-card-lift { transition:transform 0.35s cubic-bezier(0.22,0.61,0.36,1), box-shadow 0.35s ease }
.promax-card-lift:hover { transform:translateY(-10px); box-shadow:0 20px 40px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06) }`)
  }
  if (on(fx, 'cardTilt3d')) {
    css.push(`
.promax-card-tilt { transition:transform 0.15s ease; transform-style:preserve-3d; perspective:600px }`)
  }
  if (on(fx, 'cardGlow')) {
    css.push(`
@keyframes promax-border-rotate { 0% { --promax-angle:0deg } 100% { --promax-angle:360deg } }
.promax-card-glow { position:relative; overflow:visible }
.promax-card-glow::before { content:''; position:absolute; inset:-3px; border-radius:inherit; background:conic-gradient(from 0deg, var(--color-primary,#3b82f6), #8b5cf6, #ec4899, #f59e0b, var(--color-primary,#3b82f6)); opacity:0; transition:opacity 0.5s ease; z-index:-1; filter:blur(8px) }
.promax-card-glow:hover::before { opacity:0.7; animation:promax-border-rotate 3s linear infinite }`)
  }
  if (on(fx, 'cardFlip')) {
    css.push(`
.promax-card-flip-wrap { perspective:1000px }
.promax-card-flip-inner { position:relative; transition:transform 0.6s cubic-bezier(0.4,0,0.2,1); transform-style:preserve-3d }
.promax-card-flip-wrap:hover .promax-card-flip-inner { transform:rotateY(180deg) }
.promax-card-flip-front, .promax-card-flip-back { backface-visibility:hidden }
.promax-card-flip-back { position:absolute; inset:0; transform:rotateY(180deg); display:flex; align-items:center; justify-content:center; padding:1.5rem; background:var(--color-primary,#3b82f6); color:#fff; border-radius:inherit; font-size:0.9rem }`)
  }

  // ── Button effects (STRONGER) ──
  if (on(fx, 'btnRipple')) {
    css.push(`
.promax-btn-ripple { position:relative; overflow:hidden }
.promax-btn-ripple .promax-ripple { position:absolute; border-radius:50%; background:rgba(255,255,255,0.5); transform:scale(0); animation:promax-ripple-anim 0.7s ease-out forwards; pointer-events:none }
@keyframes promax-ripple-anim { to { transform:scale(4); opacity:0 } }`)
  }
  if (on(fx, 'btnGlow')) {
    css.push(`
.promax-btn-glow { transition:box-shadow 0.3s ease, transform 0.3s ease }
.promax-btn-glow:hover { box-shadow:0 0 25px rgba(var(--color-primary,59 130 246),0.5), 0 0 50px rgba(var(--color-primary,59 130 246),0.2); transform:translateY(-2px) }`)
  }
  if (on(fx, 'btnBounce')) {
    css.push(`
.promax-btn-bounce { transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1) }
.promax-btn-bounce:hover { transform:scale(1.1) }
.promax-btn-bounce:active { transform:scale(0.95) }`)
  }
  if (on(fx, 'btnGradient')) {
    css.push(`
@keyframes promax-gradient-flow { 0% { background-position:0% 50% } 50% { background-position:100% 50% } 100% { background-position:0% 50% } }
.promax-btn-gradient { background:linear-gradient(90deg,var(--color-primary,#3b82f6),#8b5cf6,#ec4899,var(--color-primary,#3b82f6))!important; background-size:300% 100%; animation:promax-gradient-flow 3s ease infinite; color:#fff!important; border:none!important }`)
  }
  if (on(fx, 'btnUnderline')) {
    css.push(`
.promax-btn-underline { position:relative }
.promax-btn-underline::after { content:''; position:absolute; bottom:-2px; left:0; width:0; height:2px; background:linear-gradient(90deg,var(--color-primary,#3b82f6),#8b5cf6); transition:width 0.4s cubic-bezier(0.22,0.61,0.36,1) }
.promax-btn-underline:hover::after { width:100% }`)
  }
  if (on(fx, 'btnShine')) {
    css.push(`
@keyframes promax-shine { 0% { left:-100% } 100% { left:200% } }
.promax-btn-shine { position:relative; overflow:hidden }
.promax-btn-shine::before { content:''; position:absolute; top:0; left:-100%; width:50%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent); animation:promax-shine 3s ease-in-out infinite; pointer-events:none }`)
  }

  // ── Image effects (STRONGER) ──
  if (on(fx, 'imgZoom')) {
    css.push(`
.promax-img-zoom { overflow:hidden; border-radius:inherit }
.promax-img-zoom > * { transition:transform 0.6s cubic-bezier(0.22,0.61,0.36,1) }
.promax-img-zoom:hover > * { transform:scale(1.12) }`)
  }
  if (on(fx, 'imgGrayscale')) {
    css.push(`
.promax-img-gray { overflow:hidden }
.promax-img-gray > * { filter:grayscale(100%); transition:filter 0.6s ease }
.promax-img-gray:hover > * { filter:grayscale(0%) }`)
  }
  if (on(fx, 'imgOverlay')) {
    css.push(`
.promax-img-overlay { position:relative; overflow:hidden }
.promax-img-overlay::after { content:''; position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.7) 0%,rgba(0,0,0,0.2) 40%,transparent 70%); opacity:0; transition:opacity 0.5s ease; pointer-events:none }
.promax-img-overlay:hover::after { opacity:1 }`)
  }
  if (on(fx, 'imgKenburns')) {
    css.push(`
@keyframes promax-kenburns { 0% { transform:scale(1) translate(0,0) } 25% { transform:scale(1.12) translate(-2%,-1%) } 50% { transform:scale(1.06) translate(1%,-2%) } 75% { transform:scale(1.1) translate(-1%,1%) } 100% { transform:scale(1) translate(0,0) } }
.promax-img-kenburns { overflow:hidden }
.promax-img-kenburns > * { animation:promax-kenburns 15s ease-in-out infinite }`)
  }
  if (on(fx, 'imgBlur')) {
    css.push(`
.promax-img-blur { overflow:hidden }
.promax-img-blur > * { filter:blur(4px) brightness(0.9); transition:filter 0.6s ease }
.promax-img-blur:hover > * { filter:blur(0) brightness(1) }`)
  }
  if (on(fx, 'imgRevealSlide')) {
    css.push(`
@keyframes promax-img-reveal { from { clip-path:inset(0 100% 0 0) } to { clip-path:inset(0 0 0 0) } }
.promax-img-reveal { clip-path:inset(0 100% 0 0) }
.promax-img-reveal.promax-visible { animation:promax-img-reveal 1.2s cubic-bezier(0.22,0.61,0.36,1) both }`)
  }

  // ── Text effects (MORE vivid) ──
  if (on(fx, 'textGradient')) {
    css.push(`
@keyframes promax-text-shimmer { 0% { background-position:0% 50% } 100% { background-position:200% 50% } }
.promax-text-gradient { background:linear-gradient(90deg, var(--color-primary,#3b82f6), #8b5cf6, #ec4899, #f59e0b, var(--color-primary,#3b82f6)); background-size:200% auto; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:promax-text-shimmer 3s linear infinite }`)
  }
  if (on(fx, 'heroTypewriter')) {
    css.push(`
.promax-typewriter { overflow:hidden; white-space:nowrap; border-right:3px solid var(--color-primary,#3b82f6); animation:promax-typing 2.5s steps(30) 0.5s forwards, promax-blink 0.6s step-end infinite; width:0; display:inline-block }
@keyframes promax-typing { from { width:0 } to { width:100% } }
@keyframes promax-blink { 50% { border-color:transparent } }`)
  }
  if (on(fx, 'textShadow')) {
    css.push(`
.promax-text-shadow { transition:text-shadow 0.3s ease, transform 0.3s ease }
.promax-text-shadow:hover { text-shadow:0 6px 20px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1); transform:translateY(-2px) }`)
  }
  if (on(fx, 'textReveal')) {
    css.push(`
@keyframes promax-text-reveal { from { opacity:0; transform:translateY(30px); filter:blur(4px) } to { opacity:1; transform:translateY(0); filter:blur(0) } }
.promax-text-reveal p, .promax-text-reveal li { opacity:0 }
.promax-text-reveal.promax-visible p, .promax-text-reveal.promax-visible li { animation:promax-text-reveal 0.8s cubic-bezier(0.22,0.61,0.36,1) both }
.promax-text-reveal.promax-visible p:nth-child(2), .promax-text-reveal.promax-visible li:nth-child(2) { animation-delay:0.15s }
.promax-text-reveal.promax-visible p:nth-child(3), .promax-text-reveal.promax-visible li:nth-child(3) { animation-delay:0.3s }`)
  }
  if (on(fx, 'textGlow')) {
    css.push(`
@keyframes promax-neon-pulse { 0%,100% { text-shadow:0 0 10px var(--color-primary,#3b82f6), 0 0 20px var(--color-primary,#3b82f6), 0 0 40px var(--color-primary,#3b82f6) } 50% { text-shadow:0 0 5px var(--color-primary,#3b82f6), 0 0 10px var(--color-primary,#3b82f6), 0 0 20px var(--color-primary,#3b82f6) } }
.promax-text-glow { animation:promax-neon-pulse 2s ease-in-out infinite }`)
  }

  // ── Header shrink (with glass) ──
  if (on(fx, 'headerShrink')) {
    css.push(`
header { transition:all 0.4s cubic-bezier(0.22,0.61,0.36,1) }
header.promax-scrolled { box-shadow:0 4px 20px rgba(0,0,0,0.08); padding-top:0.25rem; padding-bottom:0.25rem; backdrop-filter:blur(12px); background:rgba(255,255,255,0.85)!important }`)
  }

  // ── CTA Pulse (STRONGER) ──
  if (on(fx, 'ctaPulse')) {
    css.push(`
.promax-pulse { position:relative; overflow:hidden }
.promax-pulse::before { content:''; position:absolute; inset:-4px; border-radius:inherit; opacity:0; background:var(--color-primary,#3b82f6); filter:blur(12px); animation:promax-pulse-glow 2s ease-in-out infinite; pointer-events:none; z-index:-1 }
@keyframes promax-pulse-glow { 0%,100% { opacity:0; transform:scale(0.95) } 50% { opacity:0.4; transform:scale(1.05) } }`)
  }

  // ── Parallax hero ──
  if (on(fx, 'parallaxHero')) {
    css.push(`
.promax-parallax { will-change:transform; transition:transform 0.05s linear }`)
  }

  // ── Counter animation ──
  if (on(fx, 'counterAnim')) {
    css.push(`
.promax-counter { font-variant-numeric:tabular-nums }`)
  }

  // ── Floating shapes ──
  if (on(fx, 'floatingShapes')) {
    css.push(`
@keyframes promax-float-1 { 0%,100% { transform:translate(0,0) rotate(0deg) } 25% { transform:translate(20px,-30px) rotate(90deg) } 50% { transform:translate(-10px,-50px) rotate(180deg) } 75% { transform:translate(-30px,-20px) rotate(270deg) } }
@keyframes promax-float-2 { 0%,100% { transform:translate(0,0) rotate(0deg) } 33% { transform:translate(-25px,25px) rotate(120deg) } 66% { transform:translate(15px,-15px) rotate(240deg) } }
.promax-floating-container { position:fixed; inset:0; pointer-events:none; z-index:0; overflow:hidden }
.promax-floating-shape { position:absolute; border-radius:50%; opacity:0.08; filter:blur(1px) }`)
  }

  // ── Progress bar ──
  if (on(fx, 'progressBar')) {
    css.push(`
.promax-progress-bar { position:fixed; top:0; left:0; height:3px; background:linear-gradient(90deg,var(--color-primary,#3b82f6),#8b5cf6,#ec4899); z-index:9999; transition:width 0.1s linear; border-radius:0 2px 2px 0; box-shadow:0 0 8px var(--color-primary,#3b82f6) }`)
  }

  // ── Cursor glow ──
  if (on(fx, 'cursorGlow')) {
    css.push(`
.promax-cursor-glow { position:fixed; width:300px; height:300px; border-radius:50%; background:radial-gradient(circle,rgba(var(--color-primary,59 130 246),0.12) 0%,transparent 70%); pointer-events:none; z-index:9998; transform:translate(-50%,-50%); transition:opacity 0.3s ease }`)
  }

  css.push('</style>')
  return css.join('\n')
}

function getProMaxJS(fx?: Record<string, boolean>): string {
  const js: string[] = ['<script>', '(function(){']

  // Shared visibility observer
  js.push(`
  var vObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) { if (e.isIntersecting) { e.target.classList.add('promax-visible'); vObs.unobserve(e.target) } });
  }, { threshold:0.08, rootMargin:'0px 0px -60px 0px' });`)

  // ── Scroll entrance ──
  if (on(fx, 'scrollEntrance')) {
    js.push(`
  var anims = ['promax-fade-up','promax-fade-down','promax-fade-left','promax-fade-right','promax-scale-in','promax-rotate-in','promax-flip-in'];
  document.querySelectorAll('section').forEach(function(s,i) {
    s.classList.add('promax-animate', anims[i % anims.length]);
    vObs.observe(s);
  });`)
  }

  // ── Stagger grid ──
  if (on(fx, 'staggerGrid')) {
    js.push(`
  document.querySelectorAll('.grid').forEach(function(g) { g.classList.add('promax-stagger'); vObs.observe(g) });`)
  }

  // ── Reveal line ──
  if (on(fx, 'revealLine')) {
    js.push(`
  document.querySelectorAll('section:not(:first-of-type)').forEach(function(s) { s.classList.add('promax-reveal-line'); vObs.observe(s) });`)
  }

  // ── Card effects ──
  if (on(fx, 'cardLift')) {
    js.push(`
  document.querySelectorAll('.grid > div, .grid > article').forEach(function(c) { c.classList.add('promax-card-lift') });`)
  }
  if (on(fx, 'cardTilt3d')) {
    js.push(`
  document.querySelectorAll('.grid > div, .grid > article').forEach(function(c) {
    c.classList.add('promax-card-tilt');
    c.addEventListener('mousemove', function(e) {
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      c.style.transform = 'perspective(600px) rotateY(' + (x*12) + 'deg) rotateX(' + (-y*12) + 'deg) scale(1.03)';
    });
    c.addEventListener('mouseleave', function() { c.style.transform = '' });
  });`)
  }
  if (on(fx, 'cardGlow')) {
    js.push(`
  document.querySelectorAll('.grid > div, .grid > article').forEach(function(c) { c.classList.add('promax-card-glow') });`)
  }
  if (on(fx, 'cardFlip')) {
    js.push(`
  document.querySelectorAll('.grid > div, .grid > article').forEach(function(c) {
    if (c.querySelector('p') && c.querySelector('h3')) {
      var desc = c.querySelector('p').textContent || '';
      var inner = document.createElement('div'); inner.className = 'promax-card-flip-inner';
      var front = document.createElement('div'); front.className = 'promax-card-flip-front';
      while (c.firstChild) front.appendChild(c.firstChild);
      var back = document.createElement('div'); back.className = 'promax-card-flip-back';
      back.textContent = desc;
      inner.appendChild(front); inner.appendChild(back);
      c.appendChild(inner);
      c.classList.add('promax-card-flip-wrap');
    }
  });`)
  }

  // ── Button effects ──
  if (on(fx, 'btnRipple')) {
    js.push(`
  document.querySelectorAll('a[href], button').forEach(function(btn) {
    if (btn.closest('nav') || btn.closest('header')) return;
    btn.classList.add('promax-btn-ripple');
    btn.addEventListener('click', function(e) {
      var r = btn.getBoundingClientRect(), d = Math.max(r.width, r.height)*2, span = document.createElement('span');
      span.className = 'promax-ripple';
      span.style.width = span.style.height = d + 'px';
      span.style.left = (e.clientX - r.left - d/2) + 'px';
      span.style.top = (e.clientY - r.top - d/2) + 'px';
      btn.appendChild(span);
      setTimeout(function() { span.remove() }, 700);
    });
  });`)
  }
  if (on(fx, 'btnGlow')) {
    js.push(`
  document.querySelectorAll('a[href]:not(nav a):not(header a), button:not(nav button)').forEach(function(b) {
    if (b.closest('nav') || b.closest('header')) return;
    b.classList.add('promax-btn-glow');
  });`)
  }
  if (on(fx, 'btnBounce')) {
    js.push(`
  document.querySelectorAll('a[href]:not(nav a):not(header a), button:not(nav button)').forEach(function(b) {
    if (b.closest('nav') || b.closest('header')) return;
    b.classList.add('promax-btn-bounce');
  });`)
  }
  if (on(fx, 'btnGradient')) {
    js.push(`
  document.querySelectorAll('a.bg-primary, button.bg-primary, [class*="bg-primary"]').forEach(function(b) {
    if (b.closest('nav') || b.closest('header')) return;
    b.classList.add('promax-btn-gradient');
  });`)
  }
  if (on(fx, 'btnUnderline')) {
    js.push(`
  document.querySelectorAll('nav a, header a').forEach(function(a) { a.classList.add('promax-btn-underline') });`)
  }
  if (on(fx, 'btnShine')) {
    js.push(`
  document.querySelectorAll('a[href]:not(nav a):not(header a), button:not(nav button)').forEach(function(b) {
    if (b.closest('nav') || b.closest('header')) return;
    b.classList.add('promax-btn-shine');
  });`)
  }

  // ── Image effects ──
  if (on(fx, 'imgZoom')) {
    js.push(`
  document.querySelectorAll('.aspect-video, [class*="aspect-"]').forEach(function(el) { el.classList.add('promax-img-zoom') });`)
  }
  if (on(fx, 'imgGrayscale')) {
    js.push(`
  document.querySelectorAll('.aspect-video, [class*="aspect-"]').forEach(function(el) { el.classList.add('promax-img-gray') });`)
  }
  if (on(fx, 'imgOverlay')) {
    js.push(`
  document.querySelectorAll('.aspect-video, [class*="aspect-"]').forEach(function(el) { el.classList.add('promax-img-overlay') });`)
  }
  if (on(fx, 'imgKenburns')) {
    js.push(`
  document.querySelectorAll('.aspect-video, [class*="aspect-"]').forEach(function(el) { el.classList.add('promax-img-kenburns') });`)
  }
  if (on(fx, 'imgBlur')) {
    js.push(`
  document.querySelectorAll('.aspect-video, [class*="aspect-"]').forEach(function(el) { el.classList.add('promax-img-blur') });`)
  }
  if (on(fx, 'imgRevealSlide')) {
    js.push(`
  document.querySelectorAll('.aspect-video, [class*="aspect-"], img').forEach(function(el) {
    if (el.closest('.promax-img-kenburns') || el.closest('.promax-img-zoom')) return;
    el.classList.add('promax-img-reveal'); vObs.observe(el);
  });`)
  }

  // ── Text effects ──
  if (on(fx, 'textGradient')) {
    js.push(`
  var heroH1 = document.querySelector('section:first-of-type h1');
  if (heroH1) heroH1.classList.add('promax-text-gradient');`)
  }
  if (on(fx, 'heroTypewriter')) {
    js.push(`
  var heroSub = document.querySelector('section:first-of-type h1 + p');
  if (heroSub) { heroSub.classList.add('promax-typewriter'); heroSub.style.display = 'inline-block' }`)
  }
  if (on(fx, 'textShadow')) {
    js.push(`
  document.querySelectorAll('h1,h2,h3').forEach(function(h) { h.classList.add('promax-text-shadow') });`)
  }
  if (on(fx, 'textReveal')) {
    js.push(`
  document.querySelectorAll('section').forEach(function(s) {
    if (s.querySelector('p') || s.querySelector('li')) { s.classList.add('promax-text-reveal'); vObs.observe(s) }
  });`)
  }
  if (on(fx, 'textGlow')) {
    js.push(`
  var heroH = document.querySelector('section:first-of-type h1');
  if (heroH) heroH.classList.add('promax-text-glow');`)
  }

  // ── Header shrink ──
  if (on(fx, 'headerShrink')) {
    js.push(`
  var hdr = document.querySelector('header');
  if (hdr) {
    var tick = false;
    window.addEventListener('scroll', function() {
      if (!tick) { window.requestAnimationFrame(function() { if (window.scrollY > 50) hdr.classList.add('promax-scrolled'); else hdr.classList.remove('promax-scrolled'); tick = false }); tick = true }
    }, { passive:true });
  }`)
  }

  // ── CTA Pulse ──
  if (on(fx, 'ctaPulse')) {
    js.push(`
  var cta = document.querySelector('section:first-of-type a[href]');
  if (cta) cta.classList.add('promax-pulse');`)
  }

  // ── Smooth scroll ──
  if (on(fx, 'smoothScroll')) {
    js.push(`
  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) { var t = document.querySelector(a.getAttribute('href')); if (t) { e.preventDefault(); t.scrollIntoView({ behavior:'smooth', block:'start' }) } });
  });`)
  }

  // ── Parallax hero ──
  if (on(fx, 'parallaxHero')) {
    js.push(`
  var heroSec = document.querySelector('section:first-of-type');
  if (heroSec) {
    heroSec.classList.add('promax-parallax');
    var ptick = false;
    window.addEventListener('scroll', function() {
      if (!ptick) { window.requestAnimationFrame(function() { if (window.scrollY < window.innerHeight) heroSec.style.transform = 'translateY(' + (window.scrollY * 0.25) + 'px)'; ptick = false }); ptick = true }
    }, { passive:true });
  }`)
  }

  // ── Counter animation ──
  if (on(fx, 'counterAnim')) {
    js.push(`
  var cObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        cObs.unobserve(e.target);
        var end = parseInt(e.target.textContent) || 0;
        if (end <= 0) return;
        var dur = 2000, startTime = null;
        function step(ts) {
          if (!startTime) startTime = ts;
          var p = Math.min((ts - startTime) / dur, 1);
          p = 1 - Math.pow(1 - p, 3);
          e.target.textContent = Math.floor(p * end);
          if (p < 1) requestAnimationFrame(step);
          else e.target.textContent = end;
        }
        e.target.textContent = '0';
        requestAnimationFrame(step);
      }
    });
  }, { threshold:0.5 });
  document.querySelectorAll('.promax-counter').forEach(function(el) { cObs.observe(el) });`)
  }

  // ── Floating shapes ──
  if (on(fx, 'floatingShapes')) {
    js.push(`
  var fc = document.createElement('div'); fc.className = 'promax-floating-container';
  var colors = ['var(--color-primary,#3b82f6)','#8b5cf6','#ec4899','#f59e0b','#10b981'];
  for (var fi = 0; fi < 6; fi++) {
    var shape = document.createElement('div'); shape.className = 'promax-floating-shape';
    var size = 40 + Math.random() * 80;
    shape.style.width = size + 'px'; shape.style.height = size + 'px';
    shape.style.left = (Math.random() * 100) + '%'; shape.style.top = (Math.random() * 100) + '%';
    shape.style.background = colors[fi % colors.length];
    shape.style.animation = 'promax-float-' + (fi % 2 + 1) + ' ' + (15 + Math.random() * 15) + 's ease-in-out infinite';
    shape.style.animationDelay = (-Math.random() * 10) + 's';
    fc.appendChild(shape);
  }
  document.body.appendChild(fc);`)
  }

  // ── Progress bar ──
  if (on(fx, 'progressBar')) {
    js.push(`
  var pbar = document.createElement('div'); pbar.className = 'promax-progress-bar';
  document.body.appendChild(pbar);
  window.addEventListener('scroll', function() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    pbar.style.width = (h > 0 ? (window.scrollY / h * 100) : 0) + '%';
  }, { passive:true });`)
  }

  // ── Cursor glow ──
  if (on(fx, 'cursorGlow')) {
    js.push(`
  var cg = document.createElement('div'); cg.className = 'promax-cursor-glow'; cg.style.opacity = '0';
  document.body.appendChild(cg);
  document.addEventListener('mousemove', function(e) { cg.style.left = e.clientX + 'px'; cg.style.top = e.clientY + 'px'; cg.style.opacity = '1' });
  document.addEventListener('mouseleave', function() { cg.style.opacity = '0' });`)
  }

  js.push('})();')
  js.push('</script>')
  return js.join('\n')
}
