import type { SectionContent, SectionItem } from './ai-types'
import type { LayoutProfile } from './design-system'

// ─── Shared Helpers ──────────────────────────────────────────────────

function headingStyle(s: SectionContent): string {
  const parts: string[] = []
  if (s.fontFamily) parts.push(`font-family: ${s.fontFamily}`)
  if (s.fontSize) parts.push(`font-size: ${s.fontSize}`)
  if (s.fontWeight) parts.push(`font-weight: ${s.fontWeight}`)
  if (s.color) parts.push(`color: ${s.color}`)
  return parts.length > 0 ? ` style="${parts.join('; ')}"` : ''
}

function subheadingStyle(s: SectionContent): string {
  if (s.subheadingColor) return ` style="color: ${s.subheadingColor}"`
  return ''
}

function contentStyle(s: SectionContent): string {
  if (s.contentColor) return ` style="color: ${s.contentColor}"`
  return ''
}

function itemTitleStyle(item: SectionItem): string {
  const parts: string[] = []
  if (item.fontFamily) parts.push(`font-family: ${item.fontFamily}`)
  if (item.fontSize) parts.push(`font-size: ${item.fontSize}`)
  if (item.fontWeight) parts.push(`font-weight: ${item.fontWeight}`)
  if (item.color) parts.push(`color: ${item.color}`)
  return parts.length > 0 ? ` style="${parts.join('; ')}"` : ''
}

function imgSizeStyle(size?: string): string {
  switch (size) {
    case 'small': return ' style="max-width:320px;margin:0 auto"'
    case 'large': return ' style="max-width:896px;margin:0 auto"'
    case 'full': return ' style="width:100%"'
    default: return ' style="max-width:672px;margin:0 auto"'
  }
}

const ICON_SVG: Record<string, string> = {
  shield: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>',
  zap: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>',
  star: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>',
  check: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>',
  globe: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/>',
  heart: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>',
  target: '<circle cx="12" cy="12" r="10" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="6" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="2" stroke-width="2" fill="none"/>',
  award: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15l-3.5 2 .9-3.9L6 10.2l4-.3L12 6l2 3.9 4 .3-3.4 2.9.9 3.9z"/>',
  settings: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" stroke-width="2" fill="none"/>',
  users: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4" stroke-width="2" fill="none"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
  trending: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="17 6 23 6 23 12" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  layers: '<polygon points="12 2 2 7 12 12 22 7 12 2" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="2 17 12 22 22 17" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="2 12 12 17 22 12" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  code: '<polyline points="16 18 22 12 16 6" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polyline points="8 6 2 12 8 18" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  rocket: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/>'
}

function getIcon(name?: string): string {
  const svgPath = ICON_SVG[name || ''] || ICON_SVG.check
  return `<svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">${svgPath}</svg>`
}

function getAos(profile: LayoutProfile, variant?: string): string {
  const map: Record<LayoutProfile, string[]> = {
    classic: ['fade-up', 'fade-up', 'fade-up'],
    modern: ['fade-right', 'zoom-in', 'fade-left'],
    bold: ['fade-left', 'flip-up', 'fade-right'],
    luxury: ['fade', 'fade', 'fade'],
    playful: ['zoom-in', 'flip-left', 'zoom-in-up']
  }
  const pool = map[profile]
  const hash = (variant || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return pool[hash % pool.length]
}

// ─── Main Entry ──────────────────────────────────────────────────────

export function renderSection(section: SectionContent, _styleId?: string, profile?: LayoutProfile): string {
  const p = profile ?? 'classic'
  const sType = toStr(section.type)
  switch (sType) {
    case 'hero': return renderHero(section, p)
    case 'features': return renderFeatures(section, p)
    case 'about': return renderAbout(section, p)
    case 'services': return renderServices(section, p)
    case 'testimonials': return renderTestimonials(section, p)
    case 'pricing': return renderPricing(section, p)
    case 'cta': return renderCTA(section, p)
    case 'contact': return renderContact(section, p)
    case 'team': return renderTeam(section, p)
    case 'faq': return renderFAQ(section, p)
    case 'gallery': return renderGallery(section, p)
    case 'blog-list': return renderBlogList(section, p)
    case 'stats': return renderStats(section, p)
    case 'process': return renderProcess(section, p)
    case 'logos': return renderLogos(section, p)
    case 'comparison': return renderComparison(section, p)
    default: return renderGeneric(section, p)
  }
}

function sectionAos(s: SectionContent, fallback: string): string {
  return s.animation && s.animation !== 'none' ? s.animation : fallback
}

function sectionBg(s: SectionContent): string {
  switch (s.bgPattern) {
    case 'gradient': return 'background:linear-gradient(135deg, rgba(var(--color-primary-rgb,59,130,246),0.05), rgba(var(--color-accent-rgb,99,102,241),0.08))'
    case 'dark': return 'background:var(--color-text,#1a1a2e);color:#fff'
    case 'accent': return 'background:var(--color-primary);color:#fff'
    case 'dots': return `background-color:var(--color-background);background-image:radial-gradient(circle,rgba(0,0,0,0.04) 1px,transparent 1px);background-size:20px 20px`
    case 'grid': return `background-color:var(--color-background);background-image:linear-gradient(rgba(0,0,0,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.03) 1px,transparent 1px);background-size:40px 40px`
    case 'waves': return `background:linear-gradient(180deg, var(--color-background) 0%, rgba(var(--color-primary-rgb,59,130,246),0.04) 50%, var(--color-background) 100%)`
    case 'blob': return 'background:var(--color-background);position:relative'
    default: return ''
  }
}

function sectionBgAttr(s: SectionContent): string {
  const parts: string[] = []
  const patternBg = sectionBg(s)
  if (patternBg) parts.push(patternBg)
  if (s.bgColor) parts.push(`background-color:${s.bgColor}`)
  if (s.bgImage) parts.push(`background-image:url('${s.bgImage}');background-size:cover;background-position:center`)
  if (s.bgImage) parts.push('position:relative')
  return parts.length > 0 ? ` style="${parts.join(';')}"` : ''
}

function sectionOverlay(s: SectionContent): string {
  if (!s.bgImage) return ''
  return '<div class="absolute inset-0 bg-black/40 z-0"></div>'
}

function sectionTextColor(s: SectionContent): string {
  if (s.bgImage || s.bgPattern === 'dark' || s.bgPattern === 'accent') return 'text-white'
  if (s.bgColor) {
    const c = s.bgColor.replace('#', '')
    if (c.length >= 6) {
      const r = parseInt(c.substring(0, 2), 16)
      const g = parseInt(c.substring(2, 4), 16)
      const b = parseInt(c.substring(4, 6), 16)
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      if (lum < 0.5) return 'text-white'
    }
  }
  return 'text-foreground'
}

function blobDecor(s: SectionContent): string {
  if (s.bgPattern !== 'blob') return ''
  return `<div class="absolute top-10 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
  <div class="absolute bottom-10 left-10 w-48 h-48 bg-accent/5 rounded-full blur-2xl -z-10"></div>`
}

function dividerHtml(s: SectionContent): string {
  if (!s.showDivider) return ''
  return '<div style="width:60px;height:2px;background:var(--color-primary);margin:0 auto 2rem auto;border-radius:1px"></div>'
}

// ─── HERO ────────────────────────────────────────────────────────────

function renderHero(s: SectionContent, p: LayoutProfile): string {
  const sub = toStr(s.subheading)
  const body = toStr(s.content)
  const heroImg = s.image || (s.images && s.images[0]) || ''
  // AI's layoutHint overrides profile-based selection
  if (s.layoutHint === 'split') return renderHeroSplit(s, sub, body, heroImg)
  if (s.layoutHint === 'fullwidth') return renderHeroFullscreen(s, sub, body, heroImg)
  if (s.layoutHint === 'minimal') return renderHeroElegant(s, sub, body, heroImg)
  switch (p) {
    case 'modern': return renderHeroSplit(s, sub, body, heroImg)
    case 'bold': return renderHeroFullscreen(s, sub, body, heroImg)
    case 'luxury': return renderHeroElegant(s, sub, body, heroImg)
    case 'playful': return renderHeroPlayful(s, sub, body, heroImg)
    default: return renderHeroClassic(s, sub, body, heroImg)
  }
}

function renderHeroClassic(s: SectionContent, sub: string, body: string, heroImg: string): string {
  const bgImage = heroImg ? ` style="background-image: url('${esc(heroImg)}'); background-size: cover; background-position: center;"` : ''
  const overlay = heroImg ? '<div class="absolute inset-0 bg-black/50"></div>' : ''
  const textColor = heroImg ? 'text-white' : 'text-foreground'
  return `<section class="relative py-20 md:py-32 ${heroImg ? '' : 'bg-gradient-to-br from-primary/10 via-background to-secondary/10'}"${bgImage} data-aos="fade-up">
  ${overlay}
  <div class="container mx-auto px-6 text-center relative z-10">
    <h1 class="text-4xl md:text-6xl font-heading font-bold ${textColor} mb-6 leading-tight"${headingStyle(s)}>${esc(s.heading)}</h1>
    ${sub ? `<p class="text-xl md:text-2xl ${textColor}/80 mb-8 max-w-3xl mx-auto"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    ${body ? `<p class="text-lg ${textColor}/70 mb-10 max-w-2xl mx-auto"${contentStyle(s)}>${esc(body)}</p>` : ''}
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="#contact" class="inline-flex items-center justify-center px-8 py-3 bg-primary text-white font-medium rounded-lg hover:opacity-90 transition-opacity">开始咨询</a>
      <a href="#services" class="inline-flex items-center justify-center px-8 py-3 border-2 ${heroImg ? 'border-white text-white hover:bg-white/10' : 'border-primary text-primary hover:bg-primary/5'} font-medium rounded-lg transition-colors">了解更多</a>
    </div>
  </div>
</section>`
}

function renderHeroSplit(s: SectionContent, sub: string, body: string, heroImg: string): string {
  const imgBlock = heroImg
    ? `<img src="${esc(heroImg)}" alt="${esc(s.heading)}" class="w-full h-full object-cover rounded-2xl" loading="lazy">`
    : `<div class="w-full aspect-square bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 rounded-2xl flex items-center justify-center"><div class="w-32 h-32 rounded-full bg-primary/20 animate-pulse"></div></div>`
  return `<section class="relative py-16 md:py-24 bg-background overflow-hidden" data-aos="fade-right">
  <div class="container mx-auto px-6">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-foreground mb-6 leading-tight"${headingStyle(s)}>${esc(s.heading)}</h1>
        ${sub ? `<p class="text-xl text-foreground/70 mb-6"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
        ${body ? `<p class="text-lg text-foreground/60 mb-8"${contentStyle(s)}>${esc(body)}</p>` : ''}
        <div class="flex flex-wrap gap-4">
          <a href="#contact" class="inline-flex items-center justify-center px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20">开始咨询</a>
          <a href="#services" class="inline-flex items-center justify-center px-8 py-3 border-2 border-foreground/20 text-foreground font-medium rounded-xl hover:border-primary hover:text-primary transition-all">了解更多</a>
        </div>
      </div>
      <div class="relative" data-aos="zoom-in" data-aos-delay="200">
        ${imgBlock}
        <div class="absolute -bottom-6 -left-6 w-24 h-24 bg-primary/10 rounded-2xl -z-10"></div>
        <div class="absolute -top-6 -right-6 w-32 h-32 bg-accent/10 rounded-full -z-10"></div>
      </div>
    </div>
  </div>
</section>`
}

function renderHeroFullscreen(s: SectionContent, sub: string, body: string, heroImg: string): string {
  const bgImage = heroImg ? ` style="background-image: url('${esc(heroImg)}'); background-size: cover; background-position: center;"` : ''
  return `<section class="relative min-h-screen flex items-center justify-center ${heroImg ? '' : 'bg-foreground'}"${bgImage} data-aos="fade">
  <div class="absolute inset-0 bg-black/60"></div>
  <div class="container mx-auto px-6 text-center relative z-10">
    <h1 class="text-5xl md:text-7xl lg:text-8xl font-heading font-black text-white mb-8 leading-none tracking-tight"${headingStyle(s)}>${esc(s.heading)}</h1>
    ${sub ? `<p class="text-2xl md:text-3xl text-white/80 mb-10 max-w-4xl mx-auto font-light"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    ${body ? `<p class="text-lg text-white/60 mb-12 max-w-2xl mx-auto"${contentStyle(s)}>${esc(body)}</p>` : ''}
    <a href="#contact" class="inline-flex items-center justify-center px-10 py-4 bg-white text-foreground font-bold text-lg rounded-none hover:bg-primary hover:text-white transition-all uppercase tracking-widest">立即行动</a>
  </div>
  <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
    <svg class="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
  </div>
</section>`
}

function renderHeroElegant(s: SectionContent, sub: string, body: string, heroImg: string): string {
  return `<section class="relative py-24 md:py-40 bg-background" data-aos="fade" data-aos-duration="1200">
  <div class="container mx-auto px-6 text-center max-w-4xl">
    <div class="wf-divider mx-auto mb-8" style="width:60px;height:1px;background:var(--color-primary)"></div>
    <h1 class="text-4xl md:text-6xl font-heading font-normal text-foreground mb-8 leading-tight italic"${headingStyle(s)}>${esc(s.heading)}</h1>
    ${sub ? `<p class="text-xl md:text-2xl text-foreground/60 mb-8 font-light"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    ${body ? `<p class="text-lg text-foreground/50 mb-12 max-w-2xl mx-auto leading-relaxed"${contentStyle(s)}>${esc(body)}</p>` : ''}
    ${heroImg ? `<div class="mt-12 rounded-lg overflow-hidden" data-aos="fade-up" data-aos-delay="300"><img src="${esc(heroImg)}" alt="${esc(s.heading)}" class="w-full h-auto" loading="lazy"></div>` : ''}
    <div class="mt-10 flex justify-center gap-6">
      <a href="#contact" class="inline-flex items-center justify-center px-8 py-3 border border-foreground/20 text-foreground font-light tracking-widest text-sm uppercase hover:bg-foreground hover:text-background transition-all">联系我们</a>
    </div>
  </div>
</section>`
}

function renderHeroPlayful(s: SectionContent, sub: string, body: string, heroImg: string): string {
  return `<section class="relative py-16 md:py-28 overflow-hidden" style="background: linear-gradient(135deg, rgba(var(--color-primary-rgb,59,130,246),0.08), rgba(var(--color-accent-rgb,99,102,241),0.08), rgba(255,200,50,0.05))" data-aos="zoom-in">
  <div class="absolute top-10 left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl"></div>
  <div class="absolute bottom-10 right-10 w-32 h-32 bg-accent/10 rounded-full blur-2xl"></div>
  <div class="absolute top-1/2 left-1/4 w-16 h-16 bg-secondary/10 rounded-2xl rotate-12 blur-lg"></div>
  <div class="container mx-auto px-6 text-center relative z-10">
    <div class="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6" data-aos="fade-down">✨ ${esc(sub || '欢迎来到')}</div>
    <h1 class="text-4xl md:text-6xl font-heading font-extrabold text-foreground mb-6 leading-tight"${headingStyle(s)}>${esc(s.heading)}</h1>
    ${body ? `<p class="text-lg text-foreground/60 mb-10 max-w-2xl mx-auto"${contentStyle(s)}>${esc(body)}</p>` : ''}
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="#contact" class="inline-flex items-center justify-center px-8 py-4 bg-primary text-white font-bold rounded-full hover:scale-105 transition-transform shadow-lg shadow-primary/30">🚀 开始体验</a>
      <a href="#services" class="inline-flex items-center justify-center px-8 py-4 bg-white text-foreground font-medium rounded-full border-2 border-foreground/10 hover:border-primary transition-colors">了解更多 →</a>
    </div>
    ${heroImg ? `<div class="mt-12 rounded-3xl overflow-hidden shadow-2xl max-w-3xl mx-auto" data-aos="fade-up" data-aos-delay="300"><img src="${esc(heroImg)}" alt="${esc(s.heading)}" class="w-full h-auto" loading="lazy"></div>` : ''}
  </div>
</section>`
}

// ─── FEATURES ────────────────────────────────────────────────────────

function renderFeatures(s: SectionContent, p: LayoutProfile): string {
  const items = safeItems(s.items)
  const sub = toStr(s.subheading)
  if (s.layoutHint === 'bento') return renderFeaturesBento(s, items, sub)
  if (s.layoutHint === 'alternating' || s.layoutHint === 'numbered') return renderFeaturesHorizontal(s, items, sub)
  if (s.layoutHint === 'minimal') return renderFeaturesMinimal(s, items, sub)
  switch (p) {
    case 'modern': return renderFeaturesBento(s, items, sub)
    case 'bold': return renderFeaturesHorizontal(s, items, sub)
    case 'luxury': return renderFeaturesMinimal(s, items, sub)
    case 'playful': return renderFeaturesColorful(s, items, sub)
    default: return renderFeaturesGrid(s, items, sub)
  }
}

function renderFeaturesGrid(s: SectionContent, items: SectionItem[], sub: string): string {
  const cols = s.columns || 3
  const textCls = sectionTextColor(s)
  const subCls = textCls === 'text-white' ? 'text-white/70' : 'text-foreground/60'
  const cardStyle = s.sectionStyle === 'glass' ? 'wf-card p-6 backdrop-blur-md bg-white/10 border border-white/20' :
    s.sectionStyle === 'bordered' ? 'p-6 border-2 border-foreground/10' :
    s.sectionStyle === 'elevated' ? 'wf-card p-6 bg-white shadow-xl' :
    s.sectionStyle === 'outlined' ? 'p-6 border border-foreground/10 rounded-xl' :
    s.sectionStyle === 'flat' ? 'p-6' :
    'wf-card p-6 bg-white'
  return `<section class="py-16 md:py-24" id="features"${sectionBgAttr(s)} data-aos="${sectionAos(s, 'fade-up')}">
  ${blobDecor(s)}
  <div class="container mx-auto px-6">
    <div class="text-center mb-12">
      ${dividerHtml(s)}
      <h2 class="text-3xl md:text-4xl font-heading font-bold ${textCls} mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
      ${sub ? `<p class="text-lg ${subCls} max-w-2xl mx-auto"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cols} gap-8">
      ${items.map((item, i) => `<div class="${cardStyle}" data-aos="${sectionAos(s, 'fade-up')}" data-aos-delay="${i * 100}">
        ${itemImgOrIcon(item)}
        <h3 class="text-xl font-heading font-semibold ${textCls} mb-2"${itemTitleStyle(item)}>${esc(item.title)}</h3>
        <p class="${subCls}">${esc(item.description)}</p>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`
}

function renderFeaturesBento(s: SectionContent, items: SectionItem[], sub: string): string {
  return `<section class="py-16 md:py-24 bg-background" id="features" data-aos="fade-up">
  <div class="container mx-auto px-6">
    <div class="text-center mb-12">
      <h2 class="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
      ${sub ? `<p class="text-lg text-foreground/60 max-w-2xl mx-auto"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    </div>
    <div class="wf-bento" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1.5rem">
      ${items.map((item, i) => {
        const span = i === 0 ? ' style="grid-column:span 2;grid-row:span 2"' : (i === items.length - 1 && items.length > 2 ? ' style="grid-column:span 2"' : '')
        return `<div class="wf-card p-6 bg-white flex flex-col justify-between"${span} data-aos="zoom-in" data-aos-delay="${i * 80}">
        ${itemImgOrIcon(item)}
        <div>
          <h3 class="text-xl font-heading font-semibold text-foreground mb-2"${itemTitleStyle(item)}>${esc(item.title)}</h3>
          <p class="text-foreground/60 text-sm">${esc(item.description)}</p>
        </div>
      </div>`}).join('\n      ')}
    </div>
  </div>
</section>`
}

function renderFeaturesHorizontal(s: SectionContent, items: SectionItem[], sub: string): string {
  return `<section class="py-16 md:py-24 bg-background" id="features" data-aos="fade-left">
  <div class="container mx-auto px-6">
    <div class="mb-12">
      <h2 class="text-4xl md:text-5xl font-heading font-black text-foreground mb-4 uppercase tracking-tight"${headingStyle(s)}>${esc(s.heading)}</h2>
      ${sub ? `<p class="text-lg text-foreground/60 max-w-xl"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    </div>
    <div class="space-y-6">
      ${items.map((item, i) => `<div class="wf-card flex flex-col md:flex-row items-start gap-6 p-6 bg-white" data-aos="fade-left" data-aos-delay="${i * 100}">
        <div class="shrink-0 w-16 h-16 flex items-center justify-center bg-primary text-white text-2xl font-black" style="border-radius:var(--radius-card)">${String(i + 1).padStart(2, '0')}</div>
        <div class="flex-1">
          <h3 class="text-xl font-heading font-bold text-foreground mb-2"${itemTitleStyle(item)}>${esc(item.title)}</h3>
          <p class="text-foreground/60">${esc(item.description)}</p>
        </div>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`
}

function renderFeaturesMinimal(s: SectionContent, items: SectionItem[], sub: string): string {
  return `<section class="py-20 md:py-32 bg-background" id="features" data-aos="fade" data-aos-duration="1000">
  <div class="container mx-auto px-6 max-w-5xl">
    <div class="text-center mb-16">
      <div class="wf-divider mx-auto mb-6" style="width:40px;height:1px;background:var(--color-primary)"></div>
      <h2 class="text-3xl md:text-4xl font-heading text-foreground mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
      ${sub ? `<p class="text-lg text-foreground/50 max-w-xl mx-auto"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
      ${items.map((item, i) => `<div class="flex gap-5" data-aos="fade" data-aos-delay="${i * 150}">
        <div class="shrink-0 w-1 bg-primary/20 rounded-full"></div>
        <div>
          <h3 class="text-lg font-heading font-semibold text-foreground mb-2"${itemTitleStyle(item)}>${esc(item.title)}</h3>
          <p class="text-foreground/50 leading-relaxed">${esc(item.description)}</p>
        </div>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`
}

function renderFeaturesColorful(s: SectionContent, items: SectionItem[], sub: string): string {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4']
  return `<section class="py-16 md:py-24 bg-background" id="features" data-aos="zoom-in">
  <div class="container mx-auto px-6">
    <div class="text-center mb-12">
      <h2 class="text-3xl md:text-4xl font-heading font-extrabold text-foreground mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
      ${sub ? `<p class="text-lg text-foreground/60 max-w-2xl mx-auto"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${items.map((item, i) => {
        const c = colors[i % colors.length]
        return `<div class="wf-card p-6 bg-white relative overflow-hidden" data-aos="zoom-in" data-aos-delay="${i * 80}">
        <div class="absolute top-0 left-0 w-full h-1" style="background:${c}"></div>
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style="background:${c}15">
          <div style="color:${c}">${getIcon(item.icon)}</div>
        </div>
        <h3 class="text-lg font-heading font-bold text-foreground mb-2"${itemTitleStyle(item)}>${esc(item.title)}</h3>
        <p class="text-foreground/60 text-sm">${esc(item.description)}</p>
      </div>`}).join('\n      ')}
    </div>
  </div>
</section>`
}

// ─── ABOUT ───────────────────────────────────────────────────────────

function renderAbout(s: SectionContent, p: LayoutProfile): string {
  const sub = toStr(s.subheading)
  switch (p) {
    case 'modern': return renderAboutOverlap(s, sub)
    case 'bold': return renderAboutFullText(s, sub)
    case 'luxury': return renderAboutElegant(s, sub)
    default: return renderAboutClassic(s, sub)
  }
}

function renderAboutClassic(s: SectionContent, sub: string): string {
  return `<section class="py-16 md:py-24 ${!s.bgColor && !s.bgImage ? 'bg-background' : ''} relative" id="about"${sectionBgAttr(s)} data-aos="${sectionAos(s, 'fade-up')}">
  ${sectionOverlay(s)}
  <div class="container mx-auto px-6 relative z-10">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div>
        <h2 class="text-3xl md:text-4xl font-heading font-bold text-foreground mb-6"${headingStyle(s)}>${esc(s.heading)}</h2>
        ${sub ? `<p class="text-xl text-foreground/70 mb-4"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
        <div class="text-foreground/60 space-y-4 leading-relaxed"${contentStyle(s)}>${esc(s.content)}</div>
      </div>
      ${s.image
        ? `<div class="rounded-2xl overflow-hidden" data-aos="fade-left"${imgSizeStyle(s.imageSize)}><img src="${esc(s.image)}" alt="${esc(s.heading)}" class="w-full h-auto object-cover rounded-2xl" loading="lazy"></div>`
        : `<div class="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl aspect-video flex items-center justify-center"><span class="text-foreground/30 text-sm">图片占位</span></div>`
      }
    </div>
  </div>
</section>`
}

function renderAboutOverlap(s: SectionContent, sub: string): string {
  return `<section class="py-16 md:py-24 bg-background relative" id="about" data-aos="fade-right">
  <div class="container mx-auto px-6">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      <div class="lg:col-span-5 relative" data-aos="zoom-in">
        ${s.image
          ? `<div class="rounded-2xl overflow-hidden shadow-2xl"><img src="${esc(s.image)}" alt="${esc(s.heading)}" class="w-full h-auto object-cover" loading="lazy"></div>`
          : `<div class="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl aspect-square"></div>`}
        <div class="absolute -bottom-4 -right-4 w-3/4 h-3/4 bg-primary/5 rounded-2xl -z-10"></div>
      </div>
      <div class="lg:col-span-7 lg:pl-8">
        <span class="text-primary font-medium text-sm uppercase tracking-widest mb-4 block">关于我们</span>
        <h2 class="text-3xl md:text-4xl font-heading font-bold text-foreground mb-6"${headingStyle(s)}>${esc(s.heading)}</h2>
        ${sub ? `<p class="text-xl text-foreground/70 mb-4"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
        <div class="text-foreground/60 space-y-4 leading-relaxed"${contentStyle(s)}>${esc(s.content)}</div>
      </div>
    </div>
  </div>
</section>`
}

function renderAboutFullText(s: SectionContent, sub: string): string {
  return `<section class="py-16 md:py-24 bg-background" id="about" data-aos="fade-left">
  <div class="container mx-auto px-6 max-w-4xl">
    <h2 class="text-4xl md:text-6xl font-heading font-black text-foreground mb-8 leading-tight uppercase"${headingStyle(s)}>${esc(s.heading)}</h2>
    ${sub ? `<p class="text-2xl text-primary mb-6 font-semibold"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    <div class="text-lg text-foreground/70 space-y-6 leading-relaxed"${contentStyle(s)}>${esc(s.content)}</div>
    ${s.image ? `<div class="mt-12 overflow-hidden" data-aos="fade-up"><img src="${esc(s.image)}" alt="${esc(s.heading)}" class="w-full h-auto" loading="lazy"></div>` : ''}
  </div>
</section>`
}

function renderAboutElegant(s: SectionContent, sub: string): string {
  return `<section class="py-20 md:py-32 bg-background" id="about" data-aos="fade" data-aos-duration="1200">
  <div class="container mx-auto px-6 max-w-5xl">
    <div class="text-center mb-12">
      <div class="wf-divider mx-auto mb-6" style="width:40px;height:1px;background:var(--color-primary)"></div>
      <h2 class="text-3xl md:text-4xl font-heading text-foreground mb-6 italic"${headingStyle(s)}>${esc(s.heading)}</h2>
    </div>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
      <div>
        ${sub ? `<p class="text-xl text-foreground/60 mb-4 font-light"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
        <div class="text-foreground/50 space-y-4 leading-loose"${contentStyle(s)}>${esc(s.content)}</div>
      </div>
      ${s.image
        ? `<div class="rounded-lg overflow-hidden" data-aos="fade" data-aos-delay="200"><img src="${esc(s.image)}" alt="${esc(s.heading)}" class="w-full h-auto object-cover" loading="lazy"></div>`
        : '<div class="aspect-[4/5] bg-gradient-to-b from-primary/5 to-secondary/5 rounded-lg"></div>'}
    </div>
  </div>
</section>`
}

// ─── SERVICES ────────────────────────────────────────────────────────

function renderServices(s: SectionContent, p: LayoutProfile): string {
  const items = safeItems(s.items)
  const sub = toStr(s.subheading)
  if (s.layoutHint === 'alternating') return renderServicesAlternating(s, items, sub)
  if (s.layoutHint === 'numbered') return renderServicesNumbered(s, items, sub)
  if (s.layoutHint === 'minimal' || s.layoutHint === 'timeline') return renderServicesElegant(s, items, sub)
  switch (p) {
    case 'modern': return renderServicesAlternating(s, items, sub)
    case 'bold': return renderServicesNumbered(s, items, sub)
    case 'luxury': return renderServicesElegant(s, items, sub)
    default: return renderServicesGrid(s, items, sub)
  }
}

function renderServicesGrid(s: SectionContent, items: SectionItem[], sub: string): string {
  const tc = sectionTextColor(s)
  const sc = tc === 'text-white' ? 'text-white/70' : 'text-foreground/60'
  return `<section class="py-16 md:py-24 ${!s.bgColor && !s.bgImage ? 'bg-gray-50' : ''} relative" id="services"${sectionBgAttr(s)} data-aos="${sectionAos(s, 'fade-up')}">
  ${sectionOverlay(s)}
  <div class="container mx-auto px-6 relative z-10">
    <div class="text-center mb-12">
      <h2 class="text-3xl md:text-4xl font-heading font-bold ${tc} mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
      ${sub ? `<p class="text-lg ${sc} max-w-2xl mx-auto"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      ${items.map((item, i) => {
        const bg = item.bgColor ? ` style="background-color: ${item.bgColor}"` : ''
        return `<div class="wf-card ${item.bgColor ? '' : 'bg-white'} overflow-hidden"${bg} data-aos="fade-up" data-aos-delay="${i * 100}">
        ${item.image ? `<div class="aspect-video overflow-hidden"><img src="${esc(item.image)}" alt="${esc(item.title)}" class="w-full h-full object-cover" loading="lazy"></div>` : ''}
        <div class="p-8">
          <h3 class="text-xl font-heading font-semibold text-foreground mb-3"${itemTitleStyle(item)}>${esc(item.title)}</h3>
          <p class="text-foreground/60">${esc(item.description)}</p>
        </div>
      </div>`}).join('\n      ')}
    </div>
  </div>
</section>`
}

function renderServicesAlternating(s: SectionContent, items: SectionItem[], sub: string): string {
  return `<section class="py-16 md:py-24 bg-background" id="services" data-aos="fade-up">
  <div class="container mx-auto px-6">
    <div class="text-center mb-16">
      <h2 class="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
      ${sub ? `<p class="text-lg text-foreground/60 max-w-2xl mx-auto"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    </div>
    <div class="space-y-16">
      ${items.map((item, i) => {
        const reverse = i % 2 === 1
        return `<div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center${reverse ? '' : ''}" data-aos="${reverse ? 'fade-left' : 'fade-right'}">
        <div class="${reverse ? 'md:order-2' : ''}">
          <span class="text-primary/40 text-6xl font-black">${String(i + 1).padStart(2, '0')}</span>
          <h3 class="text-2xl font-heading font-bold text-foreground mb-3 -mt-2"${itemTitleStyle(item)}>${esc(item.title)}</h3>
          <p class="text-foreground/60 leading-relaxed">${esc(item.description)}</p>
        </div>
        <div class="${reverse ? 'md:order-1' : ''}">
          ${item.image
            ? `<div class="rounded-2xl overflow-hidden"><img src="${esc(item.image)}" alt="${esc(item.title)}" class="w-full h-auto object-cover" loading="lazy"></div>`
            : `<div class="aspect-video rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">${getIcon(item.icon)}</div>`}
        </div>
      </div>`}).join('\n      ')}
    </div>
  </div>
</section>`
}

function renderServicesNumbered(s: SectionContent, items: SectionItem[], sub: string): string {
  return `<section class="py-16 md:py-24 bg-background" id="services" data-aos="fade-left">
  <div class="container mx-auto px-6">
    <h2 class="text-4xl md:text-5xl font-heading font-black text-foreground mb-4 uppercase"${headingStyle(s)}>${esc(s.heading)}</h2>
    ${sub ? `<p class="text-lg text-foreground/60 mb-12 max-w-xl"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${items.map((item, i) => `<div class="wf-card p-8 bg-white flex gap-6" data-aos="fade-left" data-aos-delay="${i * 100}">
        <div class="shrink-0 text-4xl font-black text-primary/20">${String(i + 1).padStart(2, '0')}</div>
        <div>
          <h3 class="text-xl font-heading font-bold text-foreground mb-2"${itemTitleStyle(item)}>${esc(item.title)}</h3>
          <p class="text-foreground/60">${esc(item.description)}</p>
        </div>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`
}

function renderServicesElegant(s: SectionContent, items: SectionItem[], sub: string): string {
  return `<section class="py-20 md:py-32 bg-background" id="services" data-aos="fade">
  <div class="container mx-auto px-6 max-w-5xl">
    <div class="text-center mb-16">
      <div class="wf-divider mx-auto mb-6" style="width:40px;height:1px;background:var(--color-primary)"></div>
      <h2 class="text-3xl md:text-4xl font-heading text-foreground mb-4 italic"${headingStyle(s)}>${esc(s.heading)}</h2>
      ${sub ? `<p class="text-foreground/50 max-w-xl mx-auto"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    </div>
    <div class="space-y-0 divide-y divide-foreground/10">
      ${items.map((item, i) => `<div class="py-8 flex flex-col md:flex-row md:items-start gap-6" data-aos="fade" data-aos-delay="${i * 100}">
        <h3 class="text-lg font-heading font-semibold text-foreground md:w-1/3"${itemTitleStyle(item)}>${esc(item.title)}</h3>
        <p class="text-foreground/50 md:w-2/3 leading-relaxed">${esc(item.description)}</p>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`
}

// ─── TESTIMONIALS ────────────────────────────────────────────────────

function renderTestimonials(s: SectionContent, p: LayoutProfile): string {
  const items = safeItems(s.items)
  switch (p) {
    case 'modern': return renderTestimonialsSingle(s, items)
    case 'bold': return renderTestimonialsBold(s, items)
    case 'luxury': return renderTestimonialsElegant(s, items)
    default: return renderTestimonialsGrid(s, items)
  }
}

function renderTestimonialsGrid(s: SectionContent, items: SectionItem[]): string {
  const tc = sectionTextColor(s)
  return `<section class="py-16 md:py-24 ${!s.bgColor && !s.bgImage ? 'bg-background' : ''} relative"${sectionBgAttr(s)} data-aos="${sectionAos(s, 'fade-up')}">
  ${sectionOverlay(s)}
  <div class="container mx-auto px-6 relative z-10">
    <div class="text-center mb-12">
      <h2 class="text-3xl md:text-4xl font-heading font-bold ${tc} mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      ${items.map((item, i) => `<div class="wf-card bg-white p-6" data-aos="fade-up" data-aos-delay="${i * 100}">
        <div class="text-primary/20 text-4xl font-serif mb-2">"</div>
        <p class="text-foreground/70 mb-4 italic">${esc(item.description)}</p>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">${esc(initial(item.title))}</div>
          <span class="font-medium text-foreground"${itemTitleStyle(item)}>${esc(item.title)}</span>
        </div>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`
}

function renderTestimonialsSingle(s: SectionContent, items: SectionItem[]): string {
  const first = items[0]
  if (!first) return renderTestimonialsGrid(s, items)
  return `<section class="py-16 md:py-24 bg-background" data-aos="zoom-in">
  <div class="container mx-auto px-6 max-w-3xl text-center">
    <h2 class="text-3xl md:text-4xl font-heading font-bold text-foreground mb-12"${headingStyle(s)}>${esc(s.heading)}</h2>
    <div class="relative">
      <div class="text-8xl text-primary/10 font-serif absolute -top-8 left-1/2 -translate-x-1/2">"</div>
      <blockquote class="text-xl md:text-2xl text-foreground/80 italic leading-relaxed mb-8 relative z-10">${esc(first.description)}</blockquote>
      <div class="flex items-center justify-center gap-3">
        <div class="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-lg font-bold">${esc(initial(first.title))}</div>
        <span class="font-semibold text-foreground text-lg"${itemTitleStyle(first)}>${esc(first.title)}</span>
      </div>
    </div>
    ${items.length > 1 ? `<div class="flex justify-center gap-2 mt-8">${items.map((_, i) => `<div class="w-2 h-2 rounded-full ${i === 0 ? 'bg-primary' : 'bg-foreground/20'}"></div>`).join('')}</div>` : ''}
  </div>
</section>`
}

function renderTestimonialsBold(s: SectionContent, items: SectionItem[]): string {
  return `<section class="py-16 md:py-24 bg-foreground text-white" data-aos="fade-left">
  <div class="container mx-auto px-6">
    <h2 class="text-4xl md:text-5xl font-heading font-black mb-12 uppercase"${headingStyle(s)}>${esc(s.heading)}</h2>
    <div class="space-y-8">
      ${items.map((item, i) => `<div class="border-l-4 border-primary pl-8 py-4" data-aos="fade-left" data-aos-delay="${i * 100}">
        <p class="text-xl text-white/80 mb-3 italic">"${esc(item.description)}"</p>
        <span class="text-white/60 font-medium"${itemTitleStyle(item)}>— ${esc(item.title)}</span>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`
}

function renderTestimonialsElegant(s: SectionContent, items: SectionItem[]): string {
  return `<section class="py-20 md:py-32 bg-background" data-aos="fade">
  <div class="container mx-auto px-6 max-w-4xl text-center">
    <div class="wf-divider mx-auto mb-8" style="width:40px;height:1px;background:var(--color-primary)"></div>
    <h2 class="text-3xl font-heading text-foreground mb-16 italic"${headingStyle(s)}>${esc(s.heading)}</h2>
    <div class="space-y-16">
      ${items.map((item, i) => `<div data-aos="fade" data-aos-delay="${i * 200}">
        <p class="text-xl text-foreground/60 italic leading-relaxed mb-4">"${esc(item.description)}"</p>
        <div class="wf-divider mx-auto my-4" style="width:30px;height:1px;background:var(--color-primary)"></div>
        <span class="text-sm text-foreground/40 uppercase tracking-widest"${itemTitleStyle(item)}>${esc(item.title)}</span>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`
}

// ─── PRICING ─────────────────────────────────────────────────────────

function renderPricing(s: SectionContent, p: LayoutProfile): string {
  const items = safeItems(s.items)
  const sub = toStr(s.subheading)
  switch (p) {
    case 'bold': return renderPricingBold(s, items, sub)
    case 'luxury': case 'modern': return renderPricingMinimal(s, items, sub)
    default: return renderPricingClassic(s, items, sub)
  }
}

function renderPricingClassic(s: SectionContent, items: SectionItem[], sub: string): string {
  return `<section class="py-16 md:py-24 bg-gray-50" id="pricing" data-aos="fade-up">
  <div class="container mx-auto px-6">
    <div class="text-center mb-12">
      <h2 class="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
      ${sub ? `<p class="text-lg text-foreground/60 max-w-2xl mx-auto"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      ${items.map((item, i) => `<div class="wf-card bg-white p-8 ${i === 1 ? 'ring-2 ring-primary shadow-lg relative' : ''}" data-aos="fade-up" data-aos-delay="${i * 100}">
        ${i === 1 ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-bold rounded-full">推荐</div>' : ''}
        <h3 class="text-xl font-heading font-semibold text-foreground mb-2"${itemTitleStyle(item)}>${esc(item.title)}</h3>
        <p class="text-foreground/60 mb-6">${esc(item.description)}</p>
        <a href="#contact" class="block w-full py-3 text-center rounded-lg ${i === 1 ? 'bg-primary text-white' : 'border-2 border-primary text-primary'} font-medium hover:opacity-90 transition-opacity">立即咨询</a>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`
}

function renderPricingBold(s: SectionContent, items: SectionItem[], sub: string): string {
  return `<section class="py-16 md:py-24 bg-background" id="pricing" data-aos="fade-left">
  <div class="container mx-auto px-6">
    <h2 class="text-4xl md:text-5xl font-heading font-black text-foreground mb-4 uppercase"${headingStyle(s)}>${esc(s.heading)}</h2>
    ${sub ? `<p class="text-lg text-foreground/60 mb-12"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    <div class="space-y-4">
      ${items.map((item, i) => `<div class="wf-card flex flex-col md:flex-row items-center justify-between p-8 bg-white gap-4" data-aos="fade-left" data-aos-delay="${i * 100}">
        <div>
          <h3 class="text-2xl font-heading font-bold text-foreground"${itemTitleStyle(item)}>${esc(item.title)}</h3>
          <p class="text-foreground/60">${esc(item.description)}</p>
        </div>
        <a href="#contact" class="shrink-0 px-8 py-3 bg-primary text-white font-bold uppercase tracking-wider hover:opacity-90 transition-opacity" style="border-radius:var(--radius-card)">选择方案</a>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`
}

function renderPricingMinimal(s: SectionContent, items: SectionItem[], sub: string): string {
  return `<section class="py-20 md:py-32 bg-background" id="pricing" data-aos="fade">
  <div class="container mx-auto px-6 max-w-4xl">
    <div class="text-center mb-16">
      <h2 class="text-3xl font-heading text-foreground mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
      ${sub ? `<p class="text-foreground/50"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    </div>
    <div class="divide-y divide-foreground/10">
      ${items.map((item, i) => `<div class="py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4" data-aos="fade" data-aos-delay="${i * 100}">
        <div>
          <h3 class="text-lg font-heading font-semibold text-foreground"${itemTitleStyle(item)}>${esc(item.title)}</h3>
          <p class="text-foreground/50 text-sm">${esc(item.description)}</p>
        </div>
        <a href="#contact" class="shrink-0 px-6 py-2 border border-foreground/20 text-foreground text-sm font-medium hover:bg-foreground hover:text-background transition-all" style="border-radius:var(--radius-card)">了解详情</a>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`
}

// ─── CTA ─────────────────────────────────────────────────────────────

function renderCTA(s: SectionContent, p: LayoutProfile): string {
  const sub = toStr(s.subheading)
  const btnText = toStr(s.content) || '立即开始'
  switch (p) {
    case 'modern': return renderCTAModern(s, sub, btnText)
    case 'bold': return renderCTABold(s, sub, btnText)
    case 'luxury': return renderCTAElegant(s, sub, btnText)
    default: return renderCTAClassic(s, sub, btnText)
  }
}

function renderCTAClassic(s: SectionContent, sub: string, btnText: string): string {
  const useBg = s.bgPattern === 'gradient'
    ? ` style="background:linear-gradient(135deg, var(--color-primary), var(--color-secondary))"`
    : s.bgPattern === 'dark'
    ? ` style="background:var(--color-text)"`
    : ''
  return `<section class="py-16 md:py-24 ${!useBg ? 'bg-primary' : ''} text-white"${useBg} data-aos="${sectionAos(s, 'fade-up')}">
  <div class="container mx-auto px-6 text-center">
    ${dividerHtml(s)}
    <h2 class="text-3xl md:text-4xl font-heading font-bold mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
    ${sub ? `<p class="text-xl opacity-90 mb-8 max-w-2xl mx-auto"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    <a href="#contact" class="inline-flex items-center justify-center px-8 py-3 bg-white text-primary font-semibold rounded-lg hover:opacity-90 transition-opacity">${esc(btnText)}</a>
  </div>
</section>`
}

function renderCTAModern(s: SectionContent, sub: string, btnText: string): string {
  return `<section class="py-16 md:py-24 bg-background" data-aos="zoom-in">
  <div class="container mx-auto px-6">
    <div class="wf-card p-12 md:p-16 text-center relative overflow-hidden" style="background:linear-gradient(135deg, var(--color-primary), var(--color-secondary))">
      <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div class="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
      <div class="relative z-10">
        <h2 class="text-3xl md:text-4xl font-heading font-bold text-white mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
        ${sub ? `<p class="text-xl text-white/80 mb-8 max-w-2xl mx-auto"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
        <a href="#contact" class="inline-flex items-center justify-center px-8 py-3 bg-white text-primary font-semibold rounded-xl hover:scale-105 transition-transform shadow-lg">${esc(btnText)}</a>
      </div>
    </div>
  </div>
</section>`
}

function renderCTABold(s: SectionContent, sub: string, btnText: string): string {
  return `<section class="py-20 md:py-32 bg-foreground text-white" data-aos="fade">
  <div class="container mx-auto px-6">
    <h2 class="text-5xl md:text-7xl font-heading font-black mb-6 uppercase leading-none"${headingStyle(s)}>${esc(s.heading)}</h2>
    ${sub ? `<p class="text-xl text-white/60 mb-10 max-w-xl"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    <a href="#contact" class="inline-flex items-center justify-center px-10 py-4 bg-primary text-white font-bold text-lg uppercase tracking-widest hover:opacity-90 transition-opacity">${esc(btnText)}</a>
  </div>
</section>`
}

function renderCTAElegant(s: SectionContent, sub: string, btnText: string): string {
  return `<section class="py-24 md:py-36 bg-background" data-aos="fade" data-aos-duration="1200">
  <div class="container mx-auto px-6 text-center max-w-3xl">
    <div class="wf-divider mx-auto mb-8" style="width:40px;height:1px;background:var(--color-primary)"></div>
    <h2 class="text-3xl md:text-4xl font-heading text-foreground mb-6 italic"${headingStyle(s)}>${esc(s.heading)}</h2>
    ${sub ? `<p class="text-lg text-foreground/50 mb-10"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    <a href="#contact" class="inline-flex items-center justify-center px-8 py-3 border border-foreground/20 text-foreground font-light text-sm uppercase tracking-widest hover:bg-foreground hover:text-background transition-all">${esc(btnText)}</a>
  </div>
</section>`
}

// ─── CONTACT ─────────────────────────────────────────────────────────

function renderContact(s: SectionContent, p: LayoutProfile): string {
  const sub = toStr(s.subheading)
  const inputClass = p === 'bold'
    ? 'w-full px-4 py-3 border-2 border-foreground bg-transparent focus:border-primary outline-none transition font-mono'
    : p === 'luxury'
    ? 'w-full px-4 py-3 border-b border-foreground/20 bg-transparent focus:border-primary outline-none transition'
    : 'w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition'
  const btnClass = p === 'bold'
    ? 'w-full py-3 bg-primary text-white font-bold uppercase tracking-widest hover:opacity-90 transition-opacity'
    : 'w-full py-3 bg-primary text-white font-medium rounded-lg hover:opacity-90 transition-opacity'

  return `<section class="py-16 md:py-24 bg-background" id="contact" data-aos="${getAos(p, 'contact')}">
  <div class="container mx-auto px-6">
    <div class="max-w-4xl mx-auto">
      <div class="text-center mb-12">
        ${p === 'luxury' ? '<div class="wf-divider mx-auto mb-6" style="width:40px;height:1px;background:var(--color-primary)"></div>' : ''}
        <h2 class="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
        ${sub ? `<p class="text-lg text-foreground/60"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <form class="space-y-4">
          <div><input type="text" placeholder="您的姓名" class="${inputClass}"></div>
          <div><input type="email" placeholder="电子邮箱" class="${inputClass}"></div>
          <div><input type="tel" placeholder="联系电话" class="${inputClass}"></div>
          <div><textarea rows="4" placeholder="留言内容" class="${inputClass} resize-none"></textarea></div>
          <button type="submit" class="${btnClass}">发送消息</button>
        </form>
        <div class="space-y-6">
          ${toStr(s.content) ? `<p class="text-foreground/60"${contentStyle(s)}>${esc(s.content)}</p>` : ''}
          ${safeItems(s.items).map((item) => `<div>
            <h4 class="font-medium text-foreground mb-1"${itemTitleStyle(item)}>${esc(item.title)}</h4>
            <p class="text-foreground/60">${esc(item.description)}</p>
          </div>`).join('\n          ')}
        </div>
      </div>
    </div>
  </div>
</section>`
}

// ─── TEAM ────────────────────────────────────────────────────────────

function renderTeam(s: SectionContent, p: LayoutProfile): string {
  const items = safeItems(s.items)
  const isHorizontal = p === 'modern' || p === 'luxury'
  return `<section class="py-16 md:py-24 bg-background" id="team" data-aos="${getAos(p, 'team')}">
  <div class="container mx-auto px-6">
    <div class="${p === 'luxury' ? 'text-center' : ''} mb-12">
      ${p === 'luxury' ? '<div class="wf-divider mx-auto mb-6" style="width:40px;height:1px;background:var(--color-primary)"></div>' : ''}
      <h2 class="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
    </div>
    <div class="${isHorizontal ? 'flex gap-8 overflow-x-auto pb-4' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8'}">
      ${items.map((item, i) => `<div class="${isHorizontal ? 'shrink-0 w-64' : ''} text-center" data-aos="fade-up" data-aos-delay="${i * 100}">
        ${item.image
          ? `<div class="${p === 'bold' ? 'w-24 h-24 mx-auto mb-4 overflow-hidden' : 'w-24 h-24 mx-auto rounded-full mb-4 overflow-hidden'}"><img src="${esc(item.image)}" alt="${esc(item.title)}" class="w-full h-full object-cover" loading="lazy"></div>`
          : `<div class="w-24 h-24 mx-auto rounded-full bg-primary/10 mb-4 flex items-center justify-center text-primary text-2xl font-bold">${esc(initial(item.title))}</div>`}
        <h3 class="font-heading font-semibold text-foreground"${itemTitleStyle(item)}>${esc(item.title)}</h3>
        <p class="text-foreground/60 text-sm">${esc(item.description)}</p>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`
}

// ─── FAQ ─────────────────────────────────────────────────────────────

function renderFAQ(s: SectionContent, p: LayoutProfile): string {
  const items = safeItems(s.items)
  const isCards = p === 'modern' || p === 'playful'
  return `<section class="py-16 md:py-24 ${p === 'bold' ? 'bg-background' : 'bg-gray-50'}" id="faq" data-aos="${getAos(p, 'faq')}">
  <div class="container mx-auto px-6 ${isCards ? '' : 'max-w-3xl'}">
    <div class="${p === 'luxury' ? 'text-center' : ''} mb-12">
      ${p === 'luxury' ? '<div class="wf-divider mx-auto mb-6" style="width:40px;height:1px;background:var(--color-primary)"></div>' : ''}
      <h2 class="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
    </div>
    ${isCards ? `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${items.map((item, i) => `<div class="wf-card p-6 bg-white" data-aos="zoom-in" data-aos-delay="${i * 80}">
        <h4 class="font-semibold text-foreground mb-2"${itemTitleStyle(item)}>${esc(item.title)}</h4>
        <p class="text-foreground/60 text-sm">${esc(item.description)}</p>
      </div>`).join('\n      ')}
    </div>` : `<div class="space-y-4">
      ${items.map((item, i) => `<details class="wf-card bg-white overflow-hidden" data-aos="fade-up" data-aos-delay="${i * 60}">
        <summary class="px-6 py-4 cursor-pointer font-medium text-foreground hover:bg-gray-50 transition-colors"${itemTitleStyle(item)}>${esc(item.title)}</summary>
        <div class="px-6 pb-4 text-foreground/60">${esc(item.description)}</div>
      </details>`).join('\n      ')}
    </div>`}
  </div>
</section>`
}

// ─── GALLERY ─────────────────────────────────────────────────────────

function renderGallery(s: SectionContent, p: LayoutProfile): string {
  const items = safeItems(s.items)
  const count = Math.max(items.length, 6)
  const isMasonry = p === 'modern' || p === 'luxury'
  return `<section class="py-16 md:py-24 bg-background" id="gallery" data-aos="${getAos(p, 'gallery')}">
  <div class="container mx-auto px-6">
    <div class="${p === 'luxury' ? 'text-center' : ''} mb-12">
      ${p === 'luxury' ? '<div class="wf-divider mx-auto mb-6" style="width:40px;height:1px;background:var(--color-primary)"></div>' : ''}
      <h2 class="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
    </div>
    <div class="${isMasonry ? 'columns-2 md:columns-3 gap-4 space-y-4' : 'grid grid-cols-2 md:grid-cols-3 gap-4'}">
      ${Array.from({ length: count }, (_, i) => {
        const item = items[i]
        const sectionImages = s.images ?? []
        const imgSrc = item?.image || sectionImages[i]
        const height = isMasonry ? (i % 3 === 0 ? 'aspect-square' : i % 3 === 1 ? 'aspect-video' : 'aspect-[3/4]') : 'aspect-video'
        if (imgSrc) {
          return `<div class="${isMasonry ? 'break-inside-avoid mb-4' : ''} ${height} rounded-lg overflow-hidden wf-card" data-aos="fade" data-aos-delay="${i * 60}"><img src="${esc(imgSrc)}" alt="${item ? esc(item.title) : '图片 ' + (i + 1)}" class="w-full h-full object-cover" loading="lazy"></div>`
        }
        return `<div class="${isMasonry ? 'break-inside-avoid mb-4' : ''} ${height} bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center">
        <span class="text-foreground/30 text-sm">${item ? esc(item.title) : '图片 ' + (i + 1)}</span>
      </div>`
      }).join('\n      ')}
    </div>
  </div>
</section>`
}

// ─── BLOG LIST ───────────────────────────────────────────────────────

function renderBlogList(s: SectionContent, p: LayoutProfile): string {
  const items = safeItems(s.items)
  const isList = p === 'luxury' || p === 'bold'
  return `<section class="py-16 md:py-24 bg-background" id="blog" data-aos="${getAos(p, 'blog')}">
  <div class="container mx-auto px-6">
    <div class="${p === 'luxury' ? 'text-center' : ''} mb-12">
      <h2 class="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
    </div>
    ${isList ? `<div class="max-w-3xl ${p === 'luxury' ? 'mx-auto' : ''} divide-y divide-foreground/10">
      ${items.map((item, i) => `<article class="py-6 flex gap-6" data-aos="fade" data-aos-delay="${i * 80}">
        ${item.image ? `<div class="shrink-0 w-32 h-24 rounded-lg overflow-hidden"><img src="${esc(item.image)}" alt="${esc(item.title)}" class="w-full h-full object-cover" loading="lazy"></div>` : ''}
        <div>
          <h3 class="font-heading font-semibold text-foreground mb-1"${itemTitleStyle(item)}>${esc(item.title)}</h3>
          <p class="text-foreground/60 text-sm line-clamp-3">${esc(item.description)}</p>
        </div>
      </article>`).join('\n      ')}
    </div>` : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      ${items.map((item, i) => `<article class="wf-card bg-white overflow-hidden" data-aos="fade-up" data-aos-delay="${i * 100}">
        ${item.image
          ? `<div class="aspect-video overflow-hidden"><img src="${esc(item.image)}" alt="${esc(item.title)}" class="w-full h-full object-cover" loading="lazy"></div>`
          : '<div class="aspect-video bg-gradient-to-br from-primary/10 to-secondary/10"></div>'}
        <div class="p-6">
          <h3 class="font-heading font-semibold text-foreground mb-2"${itemTitleStyle(item)}>${esc(item.title)}</h3>
          <p class="text-foreground/60 text-sm line-clamp-3">${esc(item.description)}</p>
        </div>
      </article>`).join('\n      ')}
    </div>`}
  </div>
</section>`
}

// ─── STATS ───────────────────────────────────────────────────────────

function renderStats(s: SectionContent, _p: LayoutProfile): string {
  const stats = (s.stats && Array.isArray(s.stats) ? s.stats : []).filter(st => st && st.value)
  const items = safeItems(s.items)
  const allStats = stats.length > 0 ? stats : items.map(it => ({ value: it.value || it.title, label: it.description || it.title }))
  const isDark = s.bgPattern === 'dark' || s.bgPattern === 'accent'
  const textCls = isDark ? 'text-white' : 'text-foreground'
  const subCls = isDark ? 'text-white/70' : 'text-foreground/60'
  return `<section class="py-16 md:py-24"${sectionBgAttr(s)} data-aos="${sectionAos(s, 'fade-up')}">
  ${blobDecor(s)}
  <div class="container mx-auto px-6">
    ${s.heading ? `<div class="text-center mb-12">${dividerHtml(s)}<h2 class="text-3xl md:text-4xl font-heading font-bold ${textCls} mb-4"${headingStyle(s)}>${esc(s.heading)}</h2></div>` : ''}
    <div class="grid grid-cols-2 md:grid-cols-${Math.min(allStats.length, 4)} gap-8 text-center">
      ${allStats.map((st, i) => `<div data-aos="zoom-in" data-aos-delay="${i * 100}">
        <div class="text-4xl md:text-5xl font-heading font-black ${isDark ? 'text-white' : 'text-primary'} mb-2">${esc(st.value)}</div>
        <div class="text-sm ${subCls} uppercase tracking-wider">${esc(st.label)}</div>
      </div>`).join('\n      ')}
    </div>
  </div>
</section>`
}

// ─── PROCESS ─────────────────────────────────────────────────────────

function renderProcess(s: SectionContent, _p: LayoutProfile): string {
  const items = safeItems(s.items)
  const sub = toStr(s.subheading)
  const isTimeline = s.layoutHint === 'timeline' || true
  return `<section class="py-16 md:py-24 bg-background"${sectionBgAttr(s)} data-aos="${sectionAos(s, 'fade-up')}">
  ${blobDecor(s)}
  <div class="container mx-auto px-6 max-w-4xl">
    <div class="text-center mb-16">
      ${dividerHtml(s)}
      <h2 class="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
      ${sub ? `<p class="text-lg text-foreground/60 max-w-2xl mx-auto"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    </div>
    ${isTimeline ? `<div class="relative">
      <div class="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-primary/20 -translate-x-1/2"></div>
      ${items.map((item, i) => {
        const isLeft = i % 2 === 0
        const step = item.value || String(i + 1).padStart(2, '0')
        return `<div class="relative flex items-start gap-6 mb-12 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}" data-aos="${isLeft ? 'fade-right' : 'fade-left'}" data-aos-delay="${i * 100}">
          <div class="hidden md:block md:w-5/12 ${isLeft ? 'text-right' : 'text-left'}">
            <h3 class="text-xl font-heading font-bold text-foreground mb-1"${itemTitleStyle(item)}>${esc(item.title)}</h3>
            <p class="text-foreground/60">${esc(item.description)}</p>
          </div>
          <div class="shrink-0 w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg z-10 shadow-lg shadow-primary/20">${esc(step)}</div>
          <div class="md:w-5/12 md:hidden">
            <h3 class="text-xl font-heading font-bold text-foreground mb-1"${itemTitleStyle(item)}>${esc(item.title)}</h3>
            <p class="text-foreground/60">${esc(item.description)}</p>
          </div>
        </div>`
      }).join('\n      ')}
    </div>` : ''}
  </div>
</section>`
}

// ─── LOGOS ────────────────────────────────────────────────────────────

function renderLogos(s: SectionContent, _p: LayoutProfile): string {
  const items = safeItems(s.items)
  const isDark = s.bgPattern === 'dark'
  const textCls = isDark ? 'text-white' : 'text-foreground'
  return `<section class="py-12 md:py-16"${sectionBgAttr(s)} data-aos="${sectionAos(s, 'fade-up')}">
  <div class="container mx-auto px-6">
    ${s.heading ? `<div class="text-center mb-10"><h2 class="text-lg font-heading font-medium ${textCls}/60 uppercase tracking-widest"${headingStyle(s)}>${esc(s.heading)}</h2></div>` : ''}
    <div class="flex flex-wrap items-center justify-center gap-8 md:gap-12">
      ${items.map((item, i) => {
        if (item.image) {
          return `<div class="h-10 opacity-50 hover:opacity-100 transition-opacity" data-aos="fade-up" data-aos-delay="${i * 60}"><img src="${esc(item.image)}" alt="${esc(item.title)}" class="h-full w-auto object-contain" loading="lazy"></div>`
        }
        return `<div class="px-6 py-3 border border-foreground/10 rounded-lg ${isDark ? 'text-white/40' : 'text-foreground/40'} font-heading font-semibold text-lg hover:text-foreground/80 hover:border-foreground/30 transition-all" data-aos="fade-up" data-aos-delay="${i * 60}">${esc(item.title)}</div>`
      }).join('\n      ')}
    </div>
  </div>
</section>`
}

// ─── COMPARISON ──────────────────────────────────────────────────────

function renderComparison(s: SectionContent, _p: LayoutProfile): string {
  const items = safeItems(s.items)
  const sub = toStr(s.subheading)
  return `<section class="py-16 md:py-24 bg-background"${sectionBgAttr(s)} data-aos="${sectionAos(s, 'fade-up')}">
  ${blobDecor(s)}
  <div class="container mx-auto px-6">
    <div class="text-center mb-12">
      ${dividerHtml(s)}
      <h2 class="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4"${headingStyle(s)}>${esc(s.heading)}</h2>
      ${sub ? `<p class="text-lg text-foreground/60 max-w-2xl mx-auto"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-${Math.min(items.length, 3)} gap-6 max-w-5xl mx-auto">
      ${items.map((item, i) => {
        const isFeatured = i === 1 && items.length >= 2
        return `<div class="wf-card p-8 ${isFeatured ? 'ring-2 ring-primary shadow-xl relative bg-white' : 'bg-white'}" data-aos="fade-up" data-aos-delay="${i * 100}">
        ${isFeatured ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-bold rounded-full">推荐</div>' : ''}
        <h3 class="text-xl font-heading font-bold text-foreground mb-1"${itemTitleStyle(item)}>${esc(item.title)}</h3>
        ${item.value ? `<div class="text-3xl font-heading font-black text-primary my-4">${esc(item.value)}</div>` : ''}
        <p class="text-foreground/60 mb-6">${esc(item.description)}</p>
        ${item.subtitle ? `<p class="text-sm text-foreground/40">${esc(item.subtitle)}</p>` : ''}
        <a href="#contact" class="block w-full py-3 text-center rounded-lg ${isFeatured ? 'bg-primary text-white font-bold' : 'border-2 border-primary text-primary font-medium'} hover:opacity-90 transition-opacity mt-4">选择方案</a>
      </div>`}).join('\n      ')}
    </div>
  </div>
</section>`
}

// ─── GENERIC ─────────────────────────────────────────────────────────

function renderGeneric(s: SectionContent, p: LayoutProfile): string {
  const sub = toStr(s.subheading)
  const tc = sectionTextColor(s)
  const sc = tc === 'text-white' ? 'text-white/70' : 'text-foreground/60'
  return `<section class="py-16 md:py-24 ${!s.bgColor && !s.bgImage ? 'bg-background' : ''} relative"${sectionBgAttr(s)} data-aos="${getAos(p, 'generic')}">
  ${sectionOverlay(s)}
  <div class="container mx-auto px-6 relative z-10">
    <h2 class="text-3xl md:text-4xl font-heading font-bold ${tc} mb-6"${headingStyle(s)}>${esc(s.heading)}</h2>
    ${sub ? `<p class="text-lg ${sc} mb-4"${subheadingStyle(s)}>${esc(sub)}</p>` : ''}
    <div class="${sc}"${contentStyle(s)}>${esc(s.content)}</div>
  </div>
</section>`
}

// ─── Utilities ───────────────────────────────────────────────────────

function itemImgOrIcon(item: SectionItem): string {
  if (item.image) {
    return `<div class="w-full rounded-lg overflow-hidden mb-4"><img src="${esc(item.image)}" alt="${esc(item.title)}" class="w-full h-auto max-h-48 object-cover rounded-lg" loading="lazy"></div>`
  }
  const bgStyle = item.bgColor ? ` style="background-color: ${item.bgColor}"` : ''
  return `<div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4"${bgStyle}>${getIcon(item.icon)}</div>`
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
    if (vals.length > 0) return vals[0] as string
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

function initial(str: unknown): string {
  const s = toStr(str)
  return s.length > 0 ? s.charAt(0) : '?'
}

function safeItems(items: unknown): SectionItem[] {
  if (!Array.isArray(items)) return []
  return items.map((item) => {
    if (item == null || typeof item !== 'object') return { title: toStr(item), description: '' }
    return {
      title: toStr(item.title),
      description: toStr(item.description),
      icon: item.icon ? toStr(item.icon) : undefined,
      image: item.image ? toStr(item.image) : undefined,
      link: item.link ? toStr(item.link) : undefined,
      fontFamily: typeof item.fontFamily === 'string' ? item.fontFamily : undefined,
      fontSize: typeof item.fontSize === 'string' ? item.fontSize : undefined,
      fontWeight: typeof item.fontWeight === 'string' ? item.fontWeight : undefined,
      color: typeof item.color === 'string' ? item.color : undefined,
      bgColor: typeof item.bgColor === 'string' ? item.bgColor : undefined,
      value: item.value ? toStr(item.value) : undefined,
      subtitle: item.subtitle ? toStr(item.subtitle) : undefined,
    }
  })
}
