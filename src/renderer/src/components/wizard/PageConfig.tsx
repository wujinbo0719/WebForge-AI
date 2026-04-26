import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { useWizardStore } from '@/stores/wizard-store'
import { WEBSITE_TYPES, PAGE_OPTIONS, LANGUAGE_OPTIONS } from '../../../../shared/constants'

export default function PageConfig(): React.JSX.Element {
  const { projectName, companyName, domain, websiteType, selectedPages, languages, setField } =
    useWizardStore()

  const togglePage = (pageId: string): void => {
    const pages = selectedPages.includes(pageId)
      ? selectedPages.filter((p) => p !== pageId)
      : [...selectedPages, pageId]
    setField('selectedPages', pages)
  }

  const toggleLanguage = (langId: string): void => {
    const langs = languages.includes(langId)
      ? languages.filter((l) => l !== langId)
      : [...languages, langId]
    if (langs.length === 0) return
    setField('languages', langs)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">配置参数</h2>
        <p className="text-muted-foreground mb-6">填写基本信息并选择网站类型和页面</p>
      </div>

      {/* 基本信息 */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="font-medium">基本信息</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="projectName">项目名称 *</Label>
            <Input
              id="projectName"
              placeholder="我的网站项目"
              value={projectName}
              onChange={(e) => setField('projectName', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">公司/品牌名</Label>
            <Input
              id="companyName"
              placeholder="XX科技有限公司"
              value={companyName}
              onChange={(e) => setField('companyName', e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="domain">域名</Label>
            <Input
              id="domain"
              placeholder="www.example.com"
              value={domain}
              onChange={(e) => setField('domain', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 网站类型 */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="font-medium">网站类型</h3>
        <RadioGroup
          value={websiteType}
          onValueChange={(v) => setField('websiteType', v as typeof websiteType)}
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {WEBSITE_TYPES.map((type) => (
              <label
                key={type.id}
                className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value={type.id} />
                <span className="text-sm">{type.label}</span>
              </label>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* 页面选择 */}
      {websiteType !== 'single-page' && (
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-medium">页面选择</h3>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {PAGE_OPTIONS.map((page) => (
              <label
                key={page.id}
                className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/50"
              >
                <Checkbox
                  checked={selectedPages.includes(page.id)}
                  onCheckedChange={() => togglePage(page.id)}
                />
                <span className="text-sm">{page.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 语言 */}
      <div className="space-y-4 rounded-lg border p-4">
        <h3 className="font-medium">网站语言（可多选，首个为主语言）</h3>
        <p className="text-xs text-muted-foreground">选择多种语言后，生成的网站将在右上角显示语言切换器。翻译由 AI 完成以确保准确性。</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {LANGUAGE_OPTIONS.map((lang) => (
            <label
              key={lang.id}
              className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/50"
            >
              <Checkbox
                checked={languages.includes(lang.id)}
                onCheckedChange={() => toggleLanguage(lang.id)}
              />
              <span className="text-lg">{lang.flag}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{lang.label}</span>
                <span className="text-xs text-muted-foreground">{lang.nativeName}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
