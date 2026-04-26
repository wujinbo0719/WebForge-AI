import { useWizardStore } from '@/stores/wizard-store'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import stylesData from '../../../../../data/styles.json'
import palettesData from '../../../../../data/palettes.json'
import fontsData from '../../../../../data/fonts.json'
import rulesData from '../../../../../data/rules.json'

interface StyleItem {
  id: string
  name: string
  description: string
  category: string
}

interface PaletteItem {
  id: string
  name: string
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
}

interface FontItem {
  id: string
  name: string
  heading: string
  body: string
  category: string
}

interface RuleItem {
  industry: string
  styles: string[]
  palettes: string[]
  fonts: string[]
}

const CATEGORY_LABELS: Record<string, string> = {
  modern: '现代',
  classic: '经典',
  bold: '大胆',
  playful: '活泼',
  luxury: '奢华',
  professional: '专业'
}

const STYLE_PREVIEWS: Record<string, { bg: string; card: string; radius: string; border: string }> = {
  glassmorphism: { bg: 'linear-gradient(135deg, #667eea, #764ba2)', card: 'rgba(255,255,255,0.15)', radius: '16px', border: '1px solid rgba(255,255,255,0.3)' },
  minimalism: { bg: '#fafafa', card: '#ffffff', radius: '4px', border: '1px solid #eee' },
  'dark-mode': { bg: '#0a0a0a', card: '#1a1a1a', radius: '12px', border: '1px solid #2a2a2a' },
  'soft-ui': { bg: '#e8e8e8', card: '#e8e8e8', radius: '16px', border: 'none' },
  'bento-box': { bg: '#f5f5f5', card: '#ffffff', radius: '16px', border: '1px solid #eee' },
  claymorphism: { bg: '#f0f0f0', card: '#f0f0f0', radius: '24px', border: 'none' },
  'liquid-glass': { bg: 'linear-gradient(135deg, #0f0f1a, #1a1a2e)', card: 'rgba(255,255,255,0.08)', radius: '24px', border: '1px solid rgba(255,255,255,0.1)' },
  cyberpunk: { bg: '#0a0a1a', card: 'rgba(0,255,136,0.05)', radius: '0', border: '1px solid rgba(0,255,136,0.3)' },
  brutalism: { bg: '#ffffff', card: '#ffffff', radius: '0', border: '3px solid #000' },
  'hero-centric': { bg: '#1a1a2e', card: '#252540', radius: '8px', border: 'none' },
  'ai-native': { bg: 'linear-gradient(180deg, #0f0f1e, #151528)', card: 'rgba(255,255,255,0.04)', radius: '16px', border: '1px solid rgba(255,255,255,0.08)' },
  'swiss-style': { bg: '#ffffff', card: '#ffffff', radius: '0', border: '1px solid #ddd' },
  'elegant-serif': { bg: '#faf8f5', card: 'transparent', radius: '0', border: 'none' },
  storytelling: { bg: '#f8f6f3', card: 'transparent', radius: '8px', border: 'none' },
  'dark-mode-oled': { bg: '#000000', card: '#080808', radius: '12px', border: '1px solid #1a1a1a' },
  'friendly-modern': { bg: '#f0f4ff', card: '#ffffff', radius: '20px', border: '2px solid rgba(0,0,0,0.04)' },
  'warm-organic': { bg: '#f5f0eb', card: 'rgba(255,255,255,0.8)', radius: '20px', border: '2px dashed rgba(0,0,0,0.08)' },
  'full-bleed': { bg: '#1a1a2e', card: 'transparent', radius: '0', border: 'none' }
}

const FONT_CATEGORY_LABELS: Record<string, string> = {
  sans: '无衬线',
  'serif-sans': '衬线+无衬线',
  chinese: '中文',
  mono: '等宽'
}

export default function StylePicker(): React.JSX.Element {
  const { industry, styleId, paletteId, fontId, setField } = useWizardStore()

  const rules = (rulesData as RuleItem[]).find((r) => r.industry === industry)
  const recommendedStyleIds = rules?.styles ?? []
  const recommendedPaletteIds = rules?.palettes ?? []
  const recommendedFontIds = rules?.fonts ?? []

  const sortedStyles = [...(stylesData as StyleItem[])].sort((a, b) => {
    const aRec = recommendedStyleIds.includes(a.id) ? 0 : 1
    const bRec = recommendedStyleIds.includes(b.id) ? 0 : 1
    return aRec - bRec
  })

  const sortedPalettes = [...(palettesData as PaletteItem[])].sort((a, b) => {
    const aRec = recommendedPaletteIds.includes(a.id) ? 0 : 1
    const bRec = recommendedPaletteIds.includes(b.id) ? 0 : 1
    return aRec - bRec
  })

  const sortedFonts = [...(fontsData as FontItem[])].sort((a, b) => {
    const aRec = recommendedFontIds.includes(a.id) ? 0 : 1
    const bRec = recommendedFontIds.includes(b.id) ? 0 : 1
    return aRec - bRec
  })

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">选择风格</h2>
      <p className="text-muted-foreground mb-6">
        基于所选行业，AI 已推荐最匹配的设计风格、配色和字体。不同风格将产生截然不同的页面布局和视觉效果。
      </p>

      <Tabs defaultValue="style" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="style">设计风格</TabsTrigger>
          <TabsTrigger value="palette">配色方案</TabsTrigger>
          <TabsTrigger value="font">字体搭配</TabsTrigger>
        </TabsList>

        <TabsContent value="style">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {sortedStyles.map((style) => {
              const isRecommended = recommendedStyleIds.includes(style.id)
              const preview = STYLE_PREVIEWS[style.id]
              return (
                <button
                  key={style.id}
                  onClick={() => setField('styleId', style.id)}
                  className={cn(
                    'relative flex flex-col items-start gap-2 rounded-xl border-2 p-3 text-left transition-all hover:shadow-md',
                    styleId === style.id
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {isRecommended && (
                    <Badge variant="secondary" className="absolute right-2 top-2 text-xs">
                      推荐
                    </Badge>
                  )}
                  {preview && (
                    <div
                      className="w-full h-14 rounded-lg flex items-center justify-center gap-1.5 p-2 overflow-hidden"
                      style={{ background: preview.bg }}
                    >
                      <div
                        className="h-8 flex-1 rounded"
                        style={{
                          background: preview.card,
                          borderRadius: preview.radius,
                          border: preview.border,
                          backdropFilter: style.id.includes('glass') ? 'blur(4px)' : undefined,
                          boxShadow: style.id === 'soft-ui' ? '4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.8)' :
                            style.id === 'brutalism' ? '3px 3px 0 #000' :
                            style.id === 'claymorphism' ? 'inset -2px -2px 5px rgba(0,0,0,0.1), 4px 4px 10px rgba(0,0,0,0.06)' : undefined
                        }}
                      />
                      <div
                        className="h-8 w-8 rounded"
                        style={{
                          background: preview.card,
                          borderRadius: preview.radius,
                          border: preview.border,
                          opacity: 0.7
                        }}
                      />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{style.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {CATEGORY_LABELS[style.category] || style.category}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground line-clamp-2">{style.description}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="palette">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {sortedPalettes.map((palette) => {
              const isRecommended = recommendedPaletteIds.includes(palette.id)
              return (
                <button
                  key={palette.id}
                  onClick={() => setField('paletteId', palette.id)}
                  className={cn(
                    'relative flex flex-col gap-2 rounded-xl border-2 p-4 transition-all hover:shadow-md',
                    paletteId === palette.id
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {isRecommended && (
                    <Badge variant="secondary" className="absolute right-2 top-2 text-xs">
                      推荐
                    </Badge>
                  )}
                  <div className="flex gap-1">
                    <div
                      className="h-8 w-8 rounded-full shadow-sm"
                      style={{ backgroundColor: palette.primary }}
                      title={`主色 ${palette.primary}`}
                    />
                    <div
                      className="h-8 w-8 rounded-full shadow-sm"
                      style={{ backgroundColor: palette.secondary }}
                      title={`辅色 ${palette.secondary}`}
                    />
                    <div
                      className="h-8 w-8 rounded-full shadow-sm"
                      style={{ backgroundColor: palette.accent }}
                      title={`强调色 ${palette.accent}`}
                    />
                    <div
                      className="h-8 w-8 rounded-full border shadow-sm"
                      style={{ backgroundColor: palette.background }}
                      title={`背景色 ${palette.background}`}
                    />
                  </div>
                  <div className="h-3 w-full rounded-full overflow-hidden flex">
                    <div className="h-full flex-[3]" style={{ backgroundColor: palette.primary }} />
                    <div className="h-full flex-[2]" style={{ backgroundColor: palette.secondary }} />
                    <div className="h-full flex-1" style={{ backgroundColor: palette.accent }} />
                    <div className="h-full flex-[4]" style={{ backgroundColor: palette.background }} />
                  </div>
                  <span className="text-sm font-medium">{palette.name}</span>
                </button>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="font">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sortedFonts.map((font) => {
              const isRecommended = recommendedFontIds.includes(font.id)
              return (
                <button
                  key={font.id}
                  onClick={() => setField('fontId', font.id)}
                  className={cn(
                    'relative flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all hover:shadow-md',
                    fontId === font.id
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  {isRecommended && (
                    <Badge variant="secondary" className="absolute right-2 top-2 text-xs">
                      推荐
                    </Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{font.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {FONT_CATEGORY_LABELS[font.category] || font.category}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <div>标题: {font.heading}</div>
                    <div>正文: {font.body}</div>
                  </div>
                  <div className="mt-1 p-2 bg-muted/50 rounded-lg">
                    <div className="text-base font-bold truncate" style={{ fontFamily: `'${font.heading}', sans-serif` }}>
                      Aa 标题字体预览
                    </div>
                    <div className="text-xs text-muted-foreground truncate" style={{ fontFamily: `'${font.body}', sans-serif` }}>
                      Aa 正文字体预览 Body Text Preview
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
