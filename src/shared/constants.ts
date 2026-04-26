export const APP_NAME = 'WebForge AI'
export const DB_NAME = 'webforge.db'

export const INDUSTRIES = [
  { id: 'enterprise', label: '企业/商业服务', icon: '🏢' },
  { id: 'ecommerce', label: '电商/零售', icon: '🛒' },
  { id: 'education', label: '教育/培训', icon: '🎓' },
  { id: 'healthcare', label: '医疗/健康', icon: '🏥' },
  { id: 'fintech', label: '金融科技', icon: '💰' },
  { id: 'pharma', label: '医药', icon: '💊' },
  { id: 'restaurant', label: '餐饮', icon: '🍽️' },
  { id: 'luxury', label: '奢侈品', icon: '💎' },
  { id: 'photography', label: '摄影', icon: '📷' },
  { id: 'gaming', label: '游戏', icon: '🎮' },
  { id: 'beauty', label: '美容/SPA', icon: '💆' },
  { id: 'realestate', label: '房地产', icon: '🏠' },
  { id: 'travel', label: '旅游/酒店', icon: '✈️' },
  { id: 'saas', label: '科技/SaaS', icon: '💻' },
  { id: 'general', label: '综合/自定义', icon: '⚙️' }
] as const

export type IndustryId = (typeof INDUSTRIES)[number]['id']

export const WEBSITE_TYPES = [
  { id: 'single-page', label: '单页落地页' },
  { id: 'multi-page', label: '多页面官网' },
  { id: 'ecommerce', label: '电商店铺' },
  { id: 'blog', label: '博客/新闻站' }
] as const

export const PAGE_OPTIONS = [
  { id: 'home', label: '首页 (Hero + 核心业务)', default: true },
  { id: 'about', label: '关于我们', default: true },
  { id: 'services', label: '服务/产品', default: true },
  { id: 'contact', label: '联系我们', default: true },
  { id: 'blog', label: '新闻/博客', default: false },
  { id: 'team', label: '团队介绍', default: false },
  { id: 'cases', label: '案例展示', default: false },
  { id: 'pricing', label: '价格方案', default: false },
  { id: 'faq', label: 'FAQ', default: false }
] as const

export const LANGUAGE_OPTIONS = [
  { id: 'zh-CN', label: '简体中文', flag: '🇨🇳', nativeName: '简体中文' },
  { id: 'zh-TW', label: '繁體中文', flag: '🇹🇼', nativeName: '繁體中文' },
  { id: 'en', label: '英语', flag: '🇬🇧', nativeName: 'English' },
  { id: 'de', label: '德语', flag: '🇩🇪', nativeName: 'Deutsch' },
  { id: 'ru', label: '俄罗斯语', flag: '🇷🇺', nativeName: 'Русский' },
  { id: 'ko', label: '韩语', flag: '🇰🇷', nativeName: '한국어' },
  { id: 'ja', label: '日语', flag: '🇯🇵', nativeName: '日本語' },
  { id: 'fr', label: '法语', flag: '🇫🇷', nativeName: 'Français' }
] as const

export type LanguageId = (typeof LANGUAGE_OPTIONS)[number]['id']

export const PROJECT_STATUS = {
  draft: '草稿',
  generated: '已生成',
  confirmed: '已确认',
  deployed: '已部署'
} as const

// ──────────────────────────────────────────────
// Dynamic Effects Configuration
// ──────────────────────────────────────────────

export interface ProMaxEffectDef {
  id: string
  label: string
  description: string
  category: string
  defaultOn: boolean
}

export const PROMAX_CATEGORIES = [
  { id: 'scroll', label: '滚动入场动画' },
  { id: 'card', label: '卡片效果' },
  { id: 'button', label: '按钮效果' },
  { id: 'image', label: '图片效果' },
  { id: 'text', label: '文字效果' },
  { id: 'general', label: '通用效果' }
] as const

export const PROMAX_EFFECTS: ProMaxEffectDef[] = [
  // ── 滚动入场 ──
  { id: 'scrollEntrance', label: '区块淡入动画', description: '区块滚动到视口时依次淡入（上滑/左滑/右滑/缩放/翻转/旋转），大幅度位移+慢速过渡', category: 'scroll', defaultOn: true },
  { id: 'staggerGrid', label: '网格交错动画', description: '网格内子元素依次错落出现，间隔更明显', category: 'scroll', defaultOn: true },
  { id: 'revealLine', label: '水平线揭幕', description: '区块出现时先绘制一条彩色横线再展开内容', category: 'scroll', defaultOn: true },
  // ── 卡片效果 ──
  { id: 'cardLift', label: '卡片悬停上浮', description: '鼠标悬停时卡片大幅上移并加深阴影', category: 'card', defaultOn: true },
  { id: 'cardTilt3d', label: '3D倾斜效果', description: '鼠标移动时卡片产生3D透视倾斜', category: 'card', defaultOn: true },
  { id: 'cardGlow', label: '边框渐变发光', description: '悬停时卡片边框出现旋转彩色光晕', category: 'card', defaultOn: true },
  { id: 'cardFlip', label: '卡片翻转揭示', description: '悬停时卡片180°翻转显示背面描述', category: 'card', defaultOn: false },
  // ── 按钮效果 ──
  { id: 'btnRipple', label: '涟漪点击效果', description: '点击按钮时产生Material风格水波纹扩散', category: 'button', defaultOn: true },
  { id: 'btnGlow', label: '悬停发光效果', description: '鼠标悬停时按钮周围出现强烈光晕', category: 'button', defaultOn: true },
  { id: 'btnBounce', label: '弹性缩放效果', description: '悬停时按钮弹性放大+缩小回弹', category: 'button', defaultOn: true },
  { id: 'btnGradient', label: '渐变流动效果', description: '按钮背景色持续流动变化', category: 'button', defaultOn: false },
  { id: 'btnUnderline', label: '下划线滑入', description: '悬停时文字下方滑入下划线', category: 'button', defaultOn: true },
  { id: 'btnShine', label: '按钮光泽扫过', description: '按钮上有一道光泽不断扫过表面', category: 'button', defaultOn: true },
  // ── 图片效果 ──
  { id: 'imgZoom', label: '悬停缩放', description: '鼠标悬停时图片明显放大', category: 'image', defaultOn: true },
  { id: 'imgGrayscale', label: '灰度变彩色', description: '图片默认灰度，悬停时显示彩色', category: 'image', defaultOn: false },
  { id: 'imgOverlay', label: '遮罩揭示', description: '悬停时显示半透明渐变遮罩层', category: 'image', defaultOn: true },
  { id: 'imgKenburns', label: '肯·伯恩斯效果', description: '图片缓慢缩放+平移，电影感动态', category: 'image', defaultOn: true },
  { id: 'imgBlur', label: '模糊揭示', description: '图片默认微模糊，悬停时变清晰', category: 'image', defaultOn: false },
  { id: 'imgRevealSlide', label: '图片滑幕揭示', description: '图片被彩色遮罩从左向右擦除揭示', category: 'image', defaultOn: true },
  // ── 文字效果 ──
  { id: 'textGradient', label: '渐变流光文字', description: 'Hero标题使用渐变色并流动闪烁', category: 'text', defaultOn: true },
  { id: 'heroTypewriter', label: '打字机效果', description: 'Hero区域副标题逐字显示', category: 'text', defaultOn: false },
  { id: 'textShadow', label: '文字悬停阴影', description: '标题悬停时出现柔和投影', category: 'text', defaultOn: true },
  { id: 'textReveal', label: '文字逐行揭示', description: '段落文字从下方逐行滑入', category: 'text', defaultOn: true },
  { id: 'textGlow', label: '标题霓虹发光', description: 'Hero标题带有持续发光的霓虹效果', category: 'text', defaultOn: false },
  // ── 通用效果 ──
  { id: 'headerShrink', label: '导航栏滚动缩小', description: '页面滚动时导航栏变窄并添加阴影+毛玻璃', category: 'general', defaultOn: true },
  { id: 'smoothScroll', label: '平滑锚点滚动', description: '点击锚点链接时平滑滚动到目标位置', category: 'general', defaultOn: true },
  { id: 'ctaPulse', label: 'CTA呼吸灯', description: 'Hero区域主按钮柔和呼吸发光效果', category: 'general', defaultOn: true },
  { id: 'parallaxHero', label: 'Hero视差滚动', description: '滚动时Hero背景以不同速率移动产生纵深感', category: 'general', defaultOn: true },
  { id: 'counterAnim', label: '数字滚动动画', description: '数字内容滚动到视口时从0递增到目标值', category: 'general', defaultOn: false },
  { id: 'floatingShapes', label: '漂浮装饰元素', description: '页面背景中有几何图形缓慢漂浮', category: 'general', defaultOn: false },
  { id: 'progressBar', label: '滚动进度条', description: '页面顶部显示彩色滚动进度条', category: 'general', defaultOn: true },
  { id: 'cursorGlow', label: '鼠标跟随光晕', description: '鼠标移动时有柔和渐变光晕跟随', category: 'general', defaultOn: false },
]

export function getDefaultProMaxEffects(): Record<string, boolean> {
  const effects: Record<string, boolean> = {}
  for (const e of PROMAX_EFFECTS) effects[e.id] = e.defaultOn
  return effects
}
