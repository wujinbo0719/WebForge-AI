import { useWizardStore } from '@/stores/wizard-store'
import { INDUSTRIES, WEBSITE_TYPES, PAGE_OPTIONS, LANGUAGE_OPTIONS } from '../../../../shared/constants'
import stylesData from '../../../../../data/styles.json'
import palettesData from '../../../../../data/palettes.json'
import fontsData from '../../../../../data/fonts.json'

interface NamedItem {
  id: string
  name: string
}

export default function WizardConfirm(): React.JSX.Element {
  const state = useWizardStore()

  const industryLabel =
    INDUSTRIES.find((i) => i.id === state.industry)?.label ?? state.industry
  const typeLabel =
    WEBSITE_TYPES.find((t) => t.id === state.websiteType)?.label ?? state.websiteType
  const styleLabel =
    (stylesData as NamedItem[]).find((s) => s.id === state.styleId)?.name ?? state.styleId
  const paletteLabel =
    (palettesData as NamedItem[]).find((p) => p.id === state.paletteId)?.name ?? state.paletteId
  const fontLabel =
    (fontsData as NamedItem[]).find((f) => f.id === state.fontId)?.name ?? state.fontId
  const pageLabels = state.selectedPages
    .map((pid) => PAGE_OPTIONS.find((p) => p.id === pid)?.label ?? pid)
    .join('、')
  const languageLabels = (state.languages ?? [])
    .map((id) => LANGUAGE_OPTIONS.find((l) => l.id === id)?.label ?? id)
    .join('、')

  const files = (state.materials as { name: string }[]) ?? []
  const urls: string[] = state.referenceUrls ?? []

  const rows = [
    ['项目名称', state.projectName],
    ['公司名称', state.companyName || '—'],
    ['域名', state.domain || '—'],
    ['行业', industryLabel],
    ['网站类型', typeLabel],
    ['页面', pageLabels],
    ['语言', languageLabels || '—'],
    ['设计风格', styleLabel],
    ['配色方案', paletteLabel],
    ['字体搭配', fontLabel],
    ['上传文件', files.length > 0 ? `${files.length} 个文件` : '无'],
    ['参考网址', urls.length > 0 ? urls.join(', ') : '无']
  ]

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">确认配置</h2>
      <p className="text-muted-foreground mb-6">
        请检查以下配置信息，确认无误后点击「开始生成」
      </p>

      <div className="rounded-xl border divide-y">
        {rows.map(([label, value]) => (
          <div key={label} className="flex px-4 py-3 text-sm">
            <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
