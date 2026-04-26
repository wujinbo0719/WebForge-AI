import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { GripVertical, Trash2, Type, Plus, ChevronDown, Paintbrush, ImagePlus } from 'lucide-react'

export interface SectionData {
  type: string
  heading: string
  subheading?: string
  content: string
  items?: {
    title: string
    description: string
    icon?: string
    image?: string
    bgColor?: string
    link?: string
    fontFamily?: string
    fontSize?: string
    fontWeight?: string
    color?: string
  }[]
  fontFamily?: string
  fontSize?: string
  fontWeight?: string
  color?: string
  subheadingColor?: string
  contentColor?: string
  image?: string
  imageSize?: string
  images?: string[]
  bgColor?: string
  bgImage?: string
}

interface PropertyPanelProps {
  section: SectionData | null
  onUpdate: (section: SectionData) => void
  onDelete: () => void
  onUploadImages?: () => void
}

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero 主视觉',
  features: '特性/优势',
  about: '关于我们',
  services: '服务/产品',
  testimonials: '客户评价',
  pricing: '价格方案',
  cta: '行动号召',
  contact: '联系我们',
  team: '团队介绍',
  faq: '常见问题',
  gallery: '图片画廊',
  'blog-list': '博客列表',
  stats: '数据统计',
  process: '服务流程',
  logos: '合作伙伴',
  comparison: '方案对比',
  footer: '页脚'
}

const FONT_FAMILIES = [
  { value: '', label: '默认' },
  { value: 'SimSun, serif', label: '宋体' },
  { value: 'SimHei, sans-serif', label: '黑体' },
  { value: 'KaiTi, serif', label: '楷体' },
  { value: 'FangSong, serif', label: '仿宋' },
  { value: 'YouYuan, sans-serif', label: '幼圆' },
  { value: 'STXinwei, serif', label: '华文新魏' },
  { value: 'STZhongsong, serif', label: '华文中宋' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: "'Times New Roman', serif", label: 'Times New Roman' }
]

const FONT_SIZES = [
  { value: '', label: '默认' },
  { value: '12px', label: '12px (小六)' },
  { value: '14px', label: '14px (五号)' },
  { value: '16px', label: '16px (小四)' },
  { value: '18px', label: '18px (四号)' },
  { value: '20px', label: '20px (小三)' },
  { value: '24px', label: '24px (三号)' },
  { value: '28px', label: '28px (小二)' },
  { value: '32px', label: '32px (二号)' },
  { value: '36px', label: '36px (小一)' },
  { value: '42px', label: '42px (一号)' },
  { value: '48px', label: '48px' },
  { value: '56px', label: '56px' },
  { value: '64px', label: '64px' }
]

const FONT_WEIGHTS = [
  { value: '', label: '默认' },
  { value: '300', label: '细体 (300)' },
  { value: '400', label: '常规 (400)' },
  { value: '500', label: '中等 (500)' },
  { value: '600', label: '半粗 (600)' },
  { value: '700', label: '粗体 (700)' },
  { value: '800', label: '特粗 (800)' }
]

function ColorInput({
  value,
  onChange,
  label
}: {
  value: string | undefined
  onChange: (v: string | undefined) => void
  label: string
}): React.JSX.Element {
  const color = value || ''
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-xs shrink-0 w-8">{label}</Label>
      <div className="relative flex items-center gap-1 flex-1">
        <input
          type="color"
          value={color || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded border cursor-pointer p-0.5 bg-background shrink-0"
        />
        <Input
          value={color}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder="#000000"
          className="h-7 text-xs font-mono flex-1"
        />
        {color && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => onChange(undefined)}
            title="重置颜色"
          >
            <span className="text-xs text-muted-foreground">×</span>
          </Button>
        )}
      </div>
    </div>
  )
}

function FontStyleRow({
  fontFamily,
  fontSize,
  fontWeight,
  color,
  onFontFamily,
  onFontSize,
  onFontWeight,
  onColor
}: {
  fontFamily?: string
  fontSize?: string
  fontWeight?: string
  color?: string
  onFontFamily: (v: string | undefined) => void
  onFontSize: (v: string | undefined) => void
  onFontWeight: (v: string | undefined) => void
  onColor: (v: string | undefined) => void
}): React.JSX.Element {
  return (
    <div className="space-y-2 pl-3 border-l-2 border-primary/20">
      <div>
        <Label className="text-xs mb-0.5 block text-muted-foreground">字体</Label>
        <select
          value={fontFamily ?? ''}
          onChange={(e) => onFontFamily(e.target.value || undefined)}
          className="w-full h-7 rounded-md border px-2 text-xs bg-background focus:ring-1 focus:ring-primary/20 outline-none"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <Label className="text-xs mb-0.5 block text-muted-foreground">字号</Label>
          <select
            value={fontSize ?? ''}
            onChange={(e) => onFontSize(e.target.value || undefined)}
            className="w-full h-7 rounded-md border px-2 text-xs bg-background focus:ring-1 focus:ring-primary/20 outline-none"
          >
            {FONT_SIZES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs mb-0.5 block text-muted-foreground">字重</Label>
          <select
            value={fontWeight ?? ''}
            onChange={(e) => onFontWeight(e.target.value || undefined)}
            className="w-full h-7 rounded-md border px-2 text-xs bg-background focus:ring-1 focus:ring-primary/20 outline-none"
          >
            {FONT_WEIGHTS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>
      <ColorInput value={color} onChange={onColor} label="颜色" />
    </div>
  )
}

export default function PropertyPanel({
  section,
  onUpdate,
  onDelete,
  onUploadImages
}: PropertyPanelProps): React.JSX.Element {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())

  if (!section) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <Type className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">选择一个区块进行编辑</p>
      </div>
    )
  }

  function toggleItemExpand(idx: number): void {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const hasSubheading = section.subheading !== undefined ||
    ['hero', 'features', 'about', 'services', 'pricing', 'cta', 'contact', 'footer'].includes(section.type)

  const hasItems = (section.items && section.items.length > 0) ||
    ['features', 'services', 'testimonials', 'pricing', 'team', 'faq', 'gallery', 'blog-list', 'contact', 'footer', 'stats', 'process', 'logos', 'comparison'].includes(section.type)

  const isFooter = section.type === 'footer'

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            {SECTION_LABELS[section.type] ?? section.type}
          </h3>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <Separator />

        {/* Section Background */}
        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-1">
            <Paintbrush className="h-3 w-3" />
            区块背景
          </Label>
          <div className="space-y-2 pl-3 border-l-2 border-accent/20">
            <ColorInput
              value={section.bgColor}
              onChange={(v) => onUpdate({ ...section, bgColor: v })}
              label="底色"
            />
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">背景图片</Label>
              {section.bgImage ? (
                <div className="relative rounded border overflow-hidden">
                  <img src={section.bgImage} alt="背景" className="w-full h-16 object-cover" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-0.5 right-0.5 h-5 w-5 bg-black/40 hover:bg-black/60 text-white"
                    onClick={() => onUpdate({ ...section, bgImage: undefined })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value=""
                    onChange={() => {}}
                    placeholder="图片URL或点击上传"
                    className="h-7 text-xs flex-1"
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        onUpdate({ ...section, bgImage: e.target.value.trim() })
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim()
                        if (val) onUpdate({ ...section, bgImage: val })
                      }
                    }}
                  />
                  {onUploadImages && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 shrink-0"
                      onClick={async () => {
                        const result = await (window as unknown as { api: { uploadPageMaterials: (p: unknown) => Promise<{ success: boolean; files: { name: string; relativePath: string }[] }> } }).api.uploadPageMaterials({
                          projectId: section.type,
                          pageId: 'bgImage'
                        })
                        if (result.success && result.files.length > 0) {
                          onUpdate({ ...section, bgImage: result.files[0].relativePath })
                        }
                      }}
                    >
                      <ImagePlus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Heading */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-medium">{isFooter ? '页脚标识（内部）' : '标题'}</Label>
            {section.color && (
              <span className="w-3 h-3 rounded-full border shrink-0" style={{ backgroundColor: section.color }} />
            )}
          </div>
          <Input
            value={section.heading}
            onChange={(e) => onUpdate({ ...section, heading: e.target.value })}
            className="h-8 text-sm"
          />
          <FontStyleRow
            fontFamily={section.fontFamily}
            fontSize={section.fontSize}
            fontWeight={section.fontWeight}
            color={section.color}
            onFontFamily={(v) => onUpdate({ ...section, fontFamily: v })}
            onFontSize={(v) => onUpdate({ ...section, fontSize: v })}
            onFontWeight={(v) => onUpdate({ ...section, fontWeight: v })}
            onColor={(v) => onUpdate({ ...section, color: v })}
          />
        </div>

        {/* Subheading */}
        {hasSubheading && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-medium">{isFooter ? '公司标语' : '副标题'}</Label>
              {section.subheadingColor && (
                <span className="w-3 h-3 rounded-full border shrink-0" style={{ backgroundColor: section.subheadingColor }} />
              )}
            </div>
            <Input
              value={section.subheading ?? ''}
              onChange={(e) => onUpdate({ ...section, subheading: e.target.value })}
              className="h-8 text-sm"
            />
            <ColorInput
              value={section.subheadingColor}
              onChange={(v) => onUpdate({ ...section, subheadingColor: v })}
              label="颜色"
            />
          </div>
        )}

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-medium">{isFooter ? '联系说明' : '内容'}</Label>
            {section.contentColor && (
              <span className="w-3 h-3 rounded-full border shrink-0" style={{ backgroundColor: section.contentColor }} />
            )}
          </div>
          <textarea
            value={section.content}
            onChange={(e) => onUpdate({ ...section, content: e.target.value })}
            className="w-full min-h-[60px] rounded-md border px-3 py-2 text-sm resize-y focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
          <ColorInput
            value={section.contentColor}
            onChange={(v) => onUpdate({ ...section, contentColor: v })}
            label="颜色"
          />
        </div>

        {/* Items Editor */}
        {hasItems && (
          <>
            <Separator />
            <div>
              <Label className="text-xs font-medium mb-2 block">{isFooter ? '联系信息' : '列表项'}</Label>
              <div className="space-y-2">
                {(section.items ?? []).map((item, idx) => {
                  const isExpanded = expandedItems.has(idx)
                  const hasStyle = item.fontFamily || item.fontSize || item.fontWeight || item.color
                  return (
                    <div key={idx} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/30">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <Input
                          value={item.title}
                          onChange={(e) => {
                            const newItems = [...(section.items ?? [])]
                            newItems[idx] = { ...newItems[idx], title: e.target.value }
                            onUpdate({ ...section, items: newItems })
                          }}
                          className="h-7 text-xs flex-1"
                          placeholder="标题"
                        />
                        {hasStyle && (
                          <span className="w-3 h-3 rounded-full border shrink-0" style={{ backgroundColor: item.color || '#888' }} />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => toggleItemExpand(idx)}
                          title="样式设置"
                        >
                          {isExpanded
                            ? <ChevronDown className="h-3 w-3" />
                            : <Paintbrush className="h-3 w-3 text-muted-foreground" />
                          }
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            const newItems = (section.items ?? []).filter((_, i) => i !== idx)
                            onUpdate({ ...section, items: newItems })
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="px-2 py-1.5">
                        <textarea
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...(section.items ?? [])]
                            newItems[idx] = { ...newItems[idx], description: e.target.value }
                            onUpdate({ ...section, items: newItems })
                          }}
                          className="w-full min-h-[36px] rounded-md border px-2 py-1 text-xs resize-y focus:ring-1 focus:ring-primary/20 outline-none"
                          placeholder="描述"
                        />
                      </div>
                      {isExpanded && (
                        <div className="px-2 pb-2 space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                              <Paintbrush className="h-3 w-3" />
                              标题样式
                            </p>
                            <FontStyleRow
                              fontFamily={item.fontFamily}
                              fontSize={item.fontSize}
                              fontWeight={item.fontWeight}
                              color={item.color}
                              onFontFamily={(v) => { const ni = [...(section.items ?? [])]; ni[idx] = { ...ni[idx], fontFamily: v }; onUpdate({ ...section, items: ni }) }}
                              onFontSize={(v) => { const ni = [...(section.items ?? [])]; ni[idx] = { ...ni[idx], fontSize: v }; onUpdate({ ...section, items: ni }) }}
                              onFontWeight={(v) => { const ni = [...(section.items ?? [])]; ni[idx] = { ...ni[idx], fontWeight: v }; onUpdate({ ...section, items: ni }) }}
                              onColor={(v) => { const ni = [...(section.items ?? [])]; ni[idx] = { ...ni[idx], color: v }; onUpdate({ ...section, items: ni }) }}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">背景颜色</Label>
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="color"
                                value={item.bgColor || '#ffffff'}
                                onChange={(e) => {
                                  const ni = [...(section.items ?? [])]
                                  ni[idx] = { ...ni[idx], bgColor: e.target.value }
                                  onUpdate({ ...section, items: ni })
                                }}
                                className="w-6 h-6 rounded border cursor-pointer"
                              />
                              <Input
                                value={item.bgColor || ''}
                                onChange={(e) => {
                                  const ni = [...(section.items ?? [])]
                                  ni[idx] = { ...ni[idx], bgColor: e.target.value || undefined }
                                  onUpdate({ ...section, items: ni })
                                }}
                                placeholder="默认白色"
                                className="h-6 text-xs flex-1"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">项目图片</Label>
                            {item.image ? (
                              <div className="relative rounded border overflow-hidden mt-1">
                                <img src={item.image} alt="" className="w-full h-16 object-cover" />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute top-0.5 right-0.5 h-4 w-4 bg-black/40 hover:bg-black/60 text-white"
                                  onClick={() => {
                                    const ni = [...(section.items ?? [])]
                                    ni[idx] = { ...ni[idx], image: undefined }
                                    onUpdate({ ...section, items: ni })
                                  }}
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            ) : onUploadImages ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-xs gap-1 mt-1"
                                onClick={async () => {
                                  const result = await (window as unknown as { api: { uploadPageMaterials: (p: unknown) => Promise<{ success: boolean; files: { name: string; relativePath: string }[] }> } }).api.uploadPageMaterials({
                                    projectId: section.type,
                                    pageId: `item_${idx}`
                                  })
                                  if (result.success && result.files.length > 0) {
                                    const ni = [...(section.items ?? [])]
                                    ni[idx] = { ...ni[idx], image: result.files[0].relativePath }
                                    onUpdate({ ...section, items: ni })
                                  }
                                }}
                              >
                                <ImagePlus className="h-3 w-3" />
                                上传图片
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const newItems = [...(section.items ?? []), { title: '新项目', description: '描述' }]
                    onUpdate({ ...section, items: newItems })
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  添加项目
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Images */}
        <Separator />
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">图片</Label>
            {onUploadImages && (
              <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={onUploadImages}>
                <ImagePlus className="h-3 w-3" />
                上传图片
              </Button>
            )}
          </div>
          {section.image && (
            <div className="space-y-2">
              <div className="relative rounded border overflow-hidden">
                <img src={section.image} alt="区块图片" className="w-full h-20 object-cover" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5 bg-black/40 hover:bg-black/60 text-white"
                  onClick={() => onUpdate({ ...section, image: undefined })}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">图片尺寸</Label>
                <div className="flex gap-1 mt-1">
                  {[
                    { id: 'small', label: '小' },
                    { id: 'medium', label: '中' },
                    { id: 'large', label: '大' },
                    { id: 'full', label: '全幅' }
                  ].map((sz) => (
                    <button
                      key={sz.id}
                      onClick={() => onUpdate({ ...section, imageSize: sz.id })}
                      className={`px-2 py-0.5 text-xs rounded border ${
                        (section.imageSize || 'medium') === sz.id
                          ? 'bg-primary text-white border-primary'
                          : 'border-gray-200 hover:border-primary/50'
                      }`}
                    >
                      {sz.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {section.images && section.images.length > 0 && (
            <div className="grid grid-cols-3 gap-1">
              {section.images.map((img, idx) => (
                <div key={idx} className="relative rounded border overflow-hidden aspect-video">
                  <img src={img} alt={`图片${idx + 1}`} className="w-full h-full object-cover" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-0.5 right-0.5 h-4 w-4 bg-black/40 hover:bg-black/60 text-white"
                    onClick={() => {
                      const newImages = section.images!.filter((_, i) => i !== idx)
                      onUpdate({ ...section, images: newImages.length ? newImages : undefined })
                    }}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />
        <div>
          <Label className="text-xs mb-1 block text-muted-foreground">区块类型</Label>
          <p className="text-xs text-muted-foreground">{SECTION_LABELS[section.type] ?? section.type}</p>
        </div>
      </div>
    </ScrollArea>
  )
}
