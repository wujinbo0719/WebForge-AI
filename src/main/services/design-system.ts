import { readFileSync } from 'fs'
import { join } from 'path'

interface PaletteData {
  id: string
  name: string
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
}

interface FontData {
  id: string
  name: string
  heading: string
  body: string
  category: string
}

interface StyleData {
  id: string
  name: string
  description: string
  category: string
}

export interface DesignSystem {
  style: StyleData
  palette: PaletteData
  font: FontData
  css: string
  tailwindConfig: string
}

export type LayoutProfile = 'classic' | 'modern' | 'bold' | 'luxury' | 'playful'

const STYLE_TO_PROFILE: Record<string, LayoutProfile> = {
  glassmorphism: 'modern',
  minimalism: 'classic',
  'dark-mode': 'modern',
  'soft-ui': 'modern',
  'bento-box': 'modern',
  claymorphism: 'playful',
  'liquid-glass': 'luxury',
  cyberpunk: 'bold',
  'hero-centric': 'bold',
  brutalism: 'bold',
  'ai-native': 'modern',
  'swiss-style': 'classic',
  'clean-minimal': 'classic',
  'trust-authority': 'classic',
  'feature-rich': 'classic',
  'conversion-optimized': 'bold',
  'friendly-modern': 'playful',
  'social-proof': 'classic',
  'elegant-serif': 'luxury',
  storytelling: 'luxury',
  'dark-mode-oled': 'modern',
  'interactive-demo': 'modern',
  'minimal-direct': 'classic',
  'warm-organic': 'playful',
  'minimal-gallery': 'luxury',
  'full-bleed': 'bold',
  'feature-showcase': 'modern',
  'clean-modern': 'classic'
}

export function getLayoutProfile(styleId: string): LayoutProfile {
  return STYLE_TO_PROFILE[styleId] ?? 'classic'
}

let stylesCache: StyleData[] | null = null
let palettesCache: PaletteData[] | null = null
let fontsCache: FontData[] | null = null

function loadData<T>(filename: string): T[] {
  const filePath = join(__dirname, `../../data/${filename}`)
  return JSON.parse(readFileSync(filePath, 'utf-8'))
}

function getStyles(): StyleData[] {
  if (!stylesCache) stylesCache = loadData<StyleData>('styles.json')
  return stylesCache
}

function getPalettes(): PaletteData[] {
  if (!palettesCache) palettesCache = loadData<PaletteData>('palettes.json')
  return palettesCache
}

function getFonts(): FontData[] {
  if (!fontsCache) fontsCache = loadData<FontData>('fonts.json')
  return fontsCache
}

export function buildDesignSystem(
  styleId: string,
  paletteId: string,
  fontId: string
): DesignSystem {
  const style = getStyles().find((s) => s.id === styleId) ?? getStyles()[0]
  const palette = getPalettes().find((p) => p.id === paletteId) ?? getPalettes()[0]
  const font = getFonts().find((f) => f.id === fontId) ?? getFonts()[0]

  const css = generateCSS(palette, font, style)
  const tailwindConfig = generateTailwindConfig(palette, font)

  return { style, palette, font, css, tailwindConfig }
}

export function getStyleDescription(styleId: string): string {
  return STYLE_DESCRIPTIONS[styleId] ?? '通用风格，标准布局'
}

const STYLE_DESCRIPTIONS: Record<string, string> = {
  glassmorphism: '玻璃拟态风格：使用半透明磨砂玻璃效果的卡片，模糊背景，浅色边框，光影层次感强。适合科技、金融类网站。布局建议：卡片使用backdrop-filter毛玻璃效果，Hero区使用渐变叠加。',
  minimalism: '极简主义：大量留白，简洁排版，少量色彩点缀，信息层级通过字号和间距区分。布局建议：单列或两列为主，留白充足，去除多余装饰。',
  'dark-mode': '深色模式：深色背景搭配亮色文字，适合科技感强的网站。布局建议：使用微妙的渐变和边框来区分区块，卡片使用暗灰色背景。',
  'soft-ui': '新拟态风格：柔和的凹凸阴影效果，仿佛从背景中浮起或凹陷。布局建议：圆角卡片配合内外阴影，按钮使用凸起效果。',
  'bento-box': '便当盒网格：类似Apple风格的混合尺寸卡片网格，大小不一的信息块拼接。布局建议：使用CSS Grid的span功能创建不规则网格，重要内容占更大面积。',
  claymorphism: '黏土拟态：3D柔和质感，像彩色黏土捏出的圆润卡片。布局建议：所有元素使用超大圆角(24px+)，柔和内阴影和外阴影。',
  'liquid-glass': '液态玻璃：高端奢华的半透明效果，配合流动渐变。布局建议：大面积留白，卡片极度圆润带模糊效果，色彩克制。',
  cyberpunk: '赛博朋克：霓虹色彩、故障效果、几何切割。布局建议：使用斜角裁切(clip-path)，霓虹发光边框，暗底亮字。',
  'hero-centric': '大图主视觉：全屏图片/视频Hero区，沉浸式首屏体验。布局建议：首屏100vh，文字叠加在图片上，其他区块也使用大图。',
  brutalism: '粗犷主义：粗黑边框、不对称布局、原始排版、高对比度。布局建议：使用硬边框(3px+)、偏移阴影、不规则间距、大字号。',
  'ai-native': 'AI原生界面：智能交互感，渐变流光效果，数据可视化风格。布局建议：使用流动渐变背景，卡片带微光效果，线条装饰。',
  'swiss-style': '瑞士国际风格：严格的网格系统，无衬线字体，清晰的信息层级。布局建议：严格12列网格对齐，使用横线分隔，大量无衬线字体。',
  'clean-minimal': '干净极简：专业信任感，标准商务风格。布局建议：整洁有序，标准网格，淡色背景交替。',
  'trust-authority': '权威信任：稳重专业，适合金融医疗。布局建议：蓝色系主调，盾牌/认证图标，数据统计醒目展示。',
  'feature-rich': '功能丰富展示：多区块信息密集，功能列表详尽。布局建议：紧凑网格，图标+文字列表，Tab切换展示。',
  'conversion-optimized': '转化率优化：突出CTA按钮，社会证明密集。布局建议：大CTA按钮，客户评价紧跟功能介绍，价格对比醒目。',
  'friendly-modern': '友好现代：圆角、温暖色调、亲和力强。布局建议：超大圆角(16px+)，彩色渐变背景，手绘风图标。',
  'social-proof': '社会证明驱动：评价和案例突出展示。布局建议：Logo墙、星级评分、客户头像、案例卡片占重要位置。',
  'elegant-serif': '优雅衬线：高端品牌感，衬线字体为主角。布局建议：大面积留白，衬线大标题，细线装饰，图片留出呼吸空间。',
  storytelling: '叙事型布局：滚动驱动的故事展现，像杂志排版。布局建议：全宽图文交替，视差效果，时间线叙事结构。',
  'dark-mode-oled': '纯黑OLED：#000纯黑背景，高对比度，色彩点缀极少。布局建议：纯黑背景，细线边框分隔，荧光色重点高亮。',
  'interactive-demo': '互动演示：产品体验驱动，模拟界面截图。布局建议：浮窗卡片叠加，模拟UI截图，动态交互暗示。',
  'minimal-direct': '极简直接：信息层级极清晰，一目了然。布局建议：左对齐文字为主，最少装饰，清晰的标题层级。',
  'warm-organic': '温暖有机：自然纹理、暖色、手工感。布局建议：圆润形状，大地色系，手绘线条装饰。',
  'minimal-gallery': '极简画廊：图片为绝对主角，文字极少。布局建议：大图铺满，Masonry瀑布流，hover显示信息。',
  'full-bleed': '全出血布局：无边距大图，视觉冲击力强。布局建议：图片/色块铺满全宽无边距，文字叠加。',
  'feature-showcase': '功能展示：适合SaaS产品，截图+文字交替。布局建议：左右交替的截图+说明，功能列表带图标。',
  'clean-modern': '干净现代：通用商业风格，适合大多数行业。布局建议：标准卡片网格，交替背景色，适中的间距。'
}

function generateCSS(palette: PaletteData, font: FontData, style: StyleData): string {
  const fontImports = getFontImports(font)
  const styleSpecificCSS = getStyleSpecificCSS(style.id)
  const profile = getLayoutProfile(style.id)

  return `/* WebForge AI Generated Design System — ${style.name} */
${fontImports}

:root {
  --color-primary: ${palette.primary};
  --color-secondary: ${palette.secondary};
  --color-accent: ${palette.accent};
  --color-background: ${palette.background};
  --color-text: ${palette.text};
  --font-heading: '${font.heading}', sans-serif;
  --font-body: '${font.body}', sans-serif;
  --radius-card: ${getCardRadius(profile)};
  --shadow-card: ${getCardShadow(profile)};
  --section-padding: ${getSectionPadding(profile)};
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-body);
  color: var(--color-text);
  background-color: var(--color-background);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  line-height: 1.2;
}

a {
  color: var(--color-primary);
  text-decoration: none;
  transition: opacity 0.2s;
}

a:hover {
  opacity: 0.8;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.wf-card {
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.wf-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.1);
}

${styleSpecificCSS}
`
}

function getCardRadius(profile: LayoutProfile): string {
  switch (profile) {
    case 'bold': return '4px'
    case 'playful': return '24px'
    case 'luxury': return '16px'
    case 'modern': return '16px'
    default: return '12px'
  }
}

function getCardShadow(profile: LayoutProfile): string {
  switch (profile) {
    case 'bold': return 'none'
    case 'luxury': return '0 2px 8px rgba(0,0,0,0.04)'
    case 'modern': return '0 8px 32px rgba(0,0,0,0.08)'
    case 'playful': return '0 6px 20px rgba(0,0,0,0.06)'
    default: return '0 1px 3px rgba(0,0,0,0.06)'
  }
}

function getSectionPadding(profile: LayoutProfile): string {
  switch (profile) {
    case 'luxury': return '6rem 0'
    case 'bold': return '5rem 0'
    default: return '4rem 0'
  }
}

function getFontImports(font: FontData): string {
  const fontMap: Record<string, string> = {
    Inter: 'Inter:wght@300;400;500;600;700',
    'Space Grotesk': 'Space+Grotesk:wght@300;400;500;600;700',
    Poppins: 'Poppins:wght@300;400;500;600;700',
    Roboto: 'Roboto:wght@300;400;500;700',
    Montserrat: 'Montserrat:wght@300;400;500;600;700',
    'Open Sans': 'Open+Sans:wght@300;400;500;600;700',
    Raleway: 'Raleway:wght@300;400;500;600;700',
    Nunito: 'Nunito:wght@300;400;500;600;700',
    Lato: 'Lato:wght@300;400;700',
    'Playfair Display': 'Playfair+Display:wght@400;500;600;700',
    'DM Serif Display': 'DM+Serif+Display',
    'DM Sans': 'DM+Sans:wght@400;500;600;700',
    'Cabinet Grotesk': 'Cabinet+Grotesk:wght@400;500;700',
    Satoshi: 'Satoshi:wght@400;500;700',
    'Clash Display': 'Clash+Display:wght@400;500;600;700',
    'General Sans': 'General+Sans:wght@400;500;600;700',
    'Noto Sans SC': 'Noto+Sans+SC:wght@300;400;500;700',
    'Source Han Sans SC': 'Noto+Sans+SC:wght@300;400;500;700',
    Merriweather: 'Merriweather:wght@300;400;700',
    'Source Sans 3': 'Source+Sans+3:wght@300;400;500;600;700',
    'Noto Serif SC': 'Noto+Serif+SC:wght@400;500;600;700',
    'Source Han Serif SC': 'Noto+Serif+SC:wght@400;500;600;700',
    'HarmonyOS Sans SC': 'Noto+Sans+SC:wght@300;400;500;700',
    'Libre Baskerville': 'Libre+Baskerville:wght@400;700',
    'Cormorant Garamond': 'Cormorant+Garamond:wght@400;500;600;700',
    'JetBrains Mono': 'JetBrains+Mono:wght@400;500;700',
    'Fira Code': 'Fira+Code:wght@400;500;700',
    Bitter: 'Bitter:wght@400;500;700',
    'Josefin Sans': 'Josefin+Sans:wght@300;400;500;600;700',
    'Work Sans': 'Work+Sans:wght@300;400;500;600;700',
    Outfit: 'Outfit:wght@300;400;500;600;700',
    Sora: 'Sora:wght@300;400;500;600;700',
    'Plus Jakarta Sans': 'Plus+Jakarta+Sans:wght@300;400;500;600;700',
    Manrope: 'Manrope:wght@300;400;500;600;700;800'
  }

  const headingParam = fontMap[font.heading]
  const bodyParam = fontMap[font.body]

  const families: string[] = []
  if (headingParam) families.push(`family=${headingParam}`)
  if (bodyParam && bodyParam !== headingParam) families.push(`family=${bodyParam}`)

  if (families.length === 0) return ''
  return `@import url('https://fonts.googleapis.com/css2?${families.join('&')}&display=swap');`
}

function getStyleSpecificCSS(styleId: string): string {
  const styleCSS: Record<string, string> = {
    glassmorphism: `
.wf-card, .wf-glass {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
section { position: relative; }
.wf-section-bg { background: linear-gradient(135deg, rgba(var(--color-primary-rgb, 59,130,246), 0.05), rgba(var(--color-secondary-rgb, 79,70,229), 0.05)); }`,

    minimalism: `
.wf-card { border: none; box-shadow: none; background: transparent; }
.wf-card:hover { transform: none; box-shadow: none; }
section { border-bottom: 1px solid rgba(0,0,0,0.06); }
h2 { letter-spacing: -0.02em; }`,

    'dark-mode': `
body { background-color: #0a0a0a; color: #f5f5f5; }
.wf-card { background: #1a1a1a; border: 1px solid #2a2a2a; }
.wf-card:hover { border-color: var(--color-primary); }
.bg-gray-50, .bg-white { background-color: #111 !important; }
.border-gray-100, .border-gray-200 { border-color: #2a2a2a !important; }
.text-foreground\\/60 { color: rgba(255,255,255,0.6) !important; }`,

    'soft-ui': `
.wf-card {
  background: var(--color-background);
  box-shadow: 8px 8px 16px rgba(0,0,0,0.08), -8px -8px 16px rgba(255,255,255,0.8);
  border: none;
}
.wf-card:hover { box-shadow: 12px 12px 24px rgba(0,0,0,0.1), -12px -12px 24px rgba(255,255,255,0.9); }
button, .wf-btn { box-shadow: 4px 4px 8px rgba(0,0,0,0.08), -4px -4px 8px rgba(255,255,255,0.8); }
button:active, .wf-btn:active { box-shadow: inset 4px 4px 8px rgba(0,0,0,0.08), inset -4px -4px 8px rgba(255,255,255,0.8); }`,

    'bento-box': `
.wf-bento { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
.wf-bento > *:nth-child(1) { grid-column: span 2; grid-row: span 2; }
.wf-bento > *:nth-child(4) { grid-column: span 2; }
.wf-card { background: var(--color-background); border: 1px solid rgba(0,0,0,0.06); overflow: hidden; }
.wf-card:hover { transform: scale(1.02); }
@media (max-width: 768px) { .wf-bento { grid-template-columns: 1fr; } .wf-bento > * { grid-column: span 1 !important; grid-row: span 1 !important; } }`,

    claymorphism: `
.wf-card {
  background: var(--color-background);
  border-radius: 24px;
  border: none;
  box-shadow: inset -4px -4px 10px rgba(0,0,0,0.08), 8px 8px 20px rgba(0,0,0,0.06);
}
.wf-card:hover { transform: translateY(-6px) rotate(0.5deg); }
button, .wf-btn { border-radius: 999px; }
h2 { font-weight: 800; }`,

    'liquid-glass': `
.wf-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.15);
}
body { background: linear-gradient(135deg, #0f0f1a, #1a1a2e); color: #e8e8e8; }
.bg-gray-50, .bg-white { background: rgba(255,255,255,0.03) !important; }`,

    cyberpunk: `
body { background: #0a0a1a; color: #00ff88; font-family: 'JetBrains Mono', monospace; }
.wf-card { background: rgba(0,255,136,0.03); border: 1px solid rgba(0,255,136,0.2); border-radius: 0; clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px)); }
.wf-card:hover { border-color: var(--color-accent); box-shadow: 0 0 20px rgba(0,255,136,0.2), inset 0 0 20px rgba(0,255,136,0.05); transform: none; }
h1, h2, h3 { text-shadow: 0 0 10px var(--color-accent), 0 0 20px var(--color-accent); text-transform: uppercase; letter-spacing: 0.05em; }
.bg-gray-50, .bg-white { background: #0d0d24 !important; }
a { color: #00ff88; }`,

    'hero-centric': `
.wf-hero { min-height: 100vh; display: flex; align-items: center; }
.wf-card { border-radius: 8px; overflow: hidden; }
h1 { font-size: 4rem; line-height: 1.05; }
@media (max-width: 768px) { h1 { font-size: 2.5rem; } }`,

    brutalism: `
.wf-card { border: 3px solid var(--color-text); box-shadow: 6px 6px 0 var(--color-text); border-radius: 0; background: var(--color-background); }
.wf-card:hover { transform: translate(3px, 3px); box-shadow: 3px 3px 0 var(--color-text); }
button, .wf-btn, a[href="#contact"] { border: 3px solid var(--color-text) !important; box-shadow: 4px 4px 0 var(--color-text); border-radius: 0 !important; text-transform: uppercase; font-weight: 900; letter-spacing: 0.1em; }
button:hover, .wf-btn:hover { transform: translate(2px, 2px); box-shadow: 2px 2px 0 var(--color-text); }
h1, h2 { text-transform: uppercase; letter-spacing: -0.03em; font-weight: 900; }
section { border-bottom: 3px solid var(--color-text); }`,

    'ai-native': `
body { background: linear-gradient(180deg, #0f0f1e 0%, #151528 100%); color: #e0e0f0; }
.wf-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; position: relative; overflow: hidden; }
.wf-card::before { content: ''; position: absolute; top: 0; left: -100%; width: 200%; height: 1px; background: linear-gradient(90deg, transparent, rgba(var(--color-primary-rgb,59,130,246),0.5), transparent); animation: wf-scan 3s ease-in-out infinite; }
@keyframes wf-scan { 0% { left: -100%; } 100% { left: 100%; } }
.bg-gray-50, .bg-white { background: rgba(255,255,255,0.02) !important; }`,

    'swiss-style': `
.wf-card { border: 1px solid rgba(0,0,0,0.1); border-radius: 0; box-shadow: none; }
.wf-card:hover { transform: none; box-shadow: none; border-color: var(--color-primary); }
h2 { font-weight: 700; letter-spacing: -0.01em; }
section { border-bottom: 1px solid rgba(0,0,0,0.08); }
.container { max-width: 1100px; }`,

    'clean-minimal': `
.wf-card { border: 1px solid rgba(0,0,0,0.06); }
section:nth-child(even) { background: rgba(0,0,0,0.015); }`,

    'trust-authority': `
.wf-card { border: 1px solid rgba(0,0,0,0.08); border-top: 3px solid var(--color-primary); border-radius: 0 0 8px 8px; }
h2 { font-weight: 700; }
.wf-trust-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: var(--color-primary); color: white; border-radius: 4px; font-size: 0.875rem; font-weight: 600; }`,

    'feature-rich': `
.wf-card { border: 1px solid rgba(0,0,0,0.06); padding: 1.25rem; }
.wf-card h3 { font-size: 1rem; }
.wf-card p { font-size: 0.875rem; }`,

    'conversion-optimized': `
.wf-cta-primary { font-size: 1.25rem; padding: 1rem 2.5rem; border-radius: 8px; font-weight: 700; background: var(--color-primary); color: white; box-shadow: 0 4px 14px rgba(var(--color-primary-rgb,59,130,246),0.3); }
.wf-cta-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(var(--color-primary-rgb,59,130,246),0.4); }
.wf-card { border: 1px solid rgba(0,0,0,0.06); }`,

    'friendly-modern': `
.wf-card { border-radius: 20px; border: 2px solid rgba(0,0,0,0.04); background: white; }
.wf-card:hover { transform: translateY(-6px) scale(1.01); }
button, .wf-btn { border-radius: 999px !important; }
section:nth-child(odd) { background: linear-gradient(135deg, rgba(var(--color-primary-rgb,59,130,246),0.03), rgba(var(--color-accent-rgb,99,102,241),0.03)); }`,

    'social-proof': `
.wf-card { border: 1px solid rgba(0,0,0,0.06); }
.wf-stars { color: #f59e0b; letter-spacing: 2px; }
.wf-avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }`,

    'elegant-serif': `
h1, h2, h3 { font-style: italic; letter-spacing: -0.02em; }
.wf-card { border: none; border-bottom: 1px solid rgba(0,0,0,0.08); border-radius: 0; box-shadow: none; padding: 2rem 0; }
.wf-card:hover { transform: none; box-shadow: none; }
.wf-divider { width: 60px; height: 1px; background: var(--color-primary); margin: 1.5rem auto; }
section { padding: var(--section-padding); }`,

    storytelling: `
section { padding: 5rem 0; position: relative; }
section:nth-child(even) .container { max-width: 900px; }
.wf-card { border: none; box-shadow: none; background: transparent; }
.wf-card:hover { transform: none; }
h2 { font-size: 2.5rem; }
img { border-radius: 8px; }`,

    'dark-mode-oled': `
body { background-color: #000000; color: #ffffff; }
.wf-card { background: #080808; border: 1px solid #1a1a1a; }
.wf-card:hover { border-color: var(--color-primary); }
.bg-gray-50, .bg-white { background: #050505 !important; }
.border-gray-100, .border-gray-200 { border-color: #1a1a1a !important; }
a { color: var(--color-accent); }`,

    'interactive-demo': `
.wf-card { background: white; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; overflow: hidden; position: relative; }
.wf-card::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 32px; background: linear-gradient(to right, #ef4444 8px, transparent 8px, transparent 10px, #f59e0b 10px, #f59e0b 18px, transparent 18px, transparent 20px, #22c55e 20px, #22c55e 28px, transparent 28px); background-repeat: no-repeat; background-position: 12px 10px; background-size: 28px 12px; border-bottom: 1px solid rgba(0,0,0,0.06); }
.wf-card > * { position: relative; z-index: 1; }`,

    'minimal-direct': `
.wf-card { border: none; box-shadow: none; background: transparent; border-bottom: 1px solid rgba(0,0,0,0.06); border-radius: 0; padding: 1.5rem 0; }
.wf-card:hover { transform: none; }
h2 { text-align: left; margin-bottom: 2rem; }`,

    'warm-organic': `
.wf-card { border-radius: 20px; background: rgba(255,255,255,0.8); border: 2px dashed rgba(0,0,0,0.08); }
.wf-card:hover { border-color: var(--color-primary); border-style: solid; }
body { background-image: url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Ccircle cx='20' cy='20' r='1' fill='rgba(0,0,0,0.02)'/%3E%3C/svg%3E"); }
button, .wf-btn { border-radius: 999px; }`,

    'minimal-gallery': `
.wf-card { border-radius: 4px; overflow: hidden; box-shadow: none; border: none; }
.wf-card:hover { transform: scale(1.03); }
.wf-card img { transition: transform 0.6s ease; }
.wf-card:hover img { transform: scale(1.1); }
h2 { font-weight: 300; letter-spacing: 0.1em; text-transform: uppercase; font-size: 0.875rem; }`,

    'full-bleed': `
section { padding: 0; }
section > .container { max-width: none; padding: 0; }
.wf-card { border-radius: 0; border: none; }
.wf-fullwidth { width: 100vw; position: relative; left: 50%; right: 50%; margin-left: -50vw; margin-right: -50vw; }
img { width: 100%; }`,

    'feature-showcase': `
.wf-card { background: white; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; overflow: hidden; }
.wf-showcase-row { display: flex; align-items: center; gap: 3rem; }
.wf-showcase-row:nth-child(even) { flex-direction: row-reverse; }
@media (max-width: 768px) { .wf-showcase-row, .wf-showcase-row:nth-child(even) { flex-direction: column; } }`,

    'clean-modern': `
.wf-card { background: white; border: 1px solid rgba(0,0,0,0.06); }
section:nth-child(even) { background: #f8f9fa; }
h2 { font-weight: 700; }`
  }

  return styleCSS[styleId] ?? ''
}

function generateTailwindConfig(palette: PaletteData, font: FontData): string {
  return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.html"],
  theme: {
    extend: {
      colors: {
        primary: '${palette.primary}',
        secondary: '${palette.secondary}',
        accent: '${palette.accent}',
        background: '${palette.background}',
        foreground: '${palette.text}',
      },
      fontFamily: {
        heading: ['${font.heading}', 'sans-serif'],
        body: ['${font.body}', 'sans-serif'],
      },
    },
  },
  plugins: [],
}`
}
