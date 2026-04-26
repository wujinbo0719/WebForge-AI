import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  Search,
  Upload,
  Download,
  Trash2,
  Plus,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useTemplateStore, type Template } from '@/stores/template-store'
import { INDUSTRIES } from '../../../shared/constants'

export default function Templates(): React.JSX.Element {
  const navigate = useNavigate()
  const { templates, setTemplates, addTemplate, removeTemplate } = useTemplateStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIndustry, setSelectedIndustry] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates(): Promise<void> {
    const result = await window.api.getTemplates()
    setTemplates(result as Template[])
    setLoading(false)
  }

  async function handleImport(): Promise<void> {
    const result = await window.api.importTemplate()
    if (result.success && result.template) {
      addTemplate(result.template as Template)
    } else if (result.error && result.error !== '已取消') {
      alert(result.error)
    }
  }

  async function handleExport(id: string): Promise<void> {
    const result = await window.api.exportTemplate(id)
    if (!result.success && result.error && result.error !== '已取消') {
      alert(result.error)
    }
  }

  async function handleDelete(id: string, name: string): Promise<void> {
    if (!confirm(`确定要删除模板"${name}"吗？此操作不可撤销。`)) return
    await window.api.deleteTemplate(id)
    removeTemplate(id)
  }

  async function handleCreateFromTemplate(template: Template): Promise<void> {
    const config = template.config_json ? JSON.parse(template.config_json) : {}
    const project = await window.api.createProject({
      name: `${template.name} - 新项目`,
      industry: template.industry || 'general',
      domain: config.domain,
      websiteType: config.websiteType
    })
    const p = project as { id: string }
    if (template.config_json) {
      await window.api.updateProject(p.id, { config_json: template.config_json })
    }
    navigate(`/editor/${p.id}`)
  }

  const industryLabel = (id: string): string => {
    const found = INDUSTRIES.find((i) => i.id === id)
    return found ? found.label : id || '未分类'
  }

  const filtered = templates.filter((t) => {
    const matchSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchIndustry = !selectedIndustry || t.industry === selectedIndustry
    return matchSearch && matchIndustry
  })

  const usedIndustries = [...new Set(templates.map((t) => t.industry).filter(Boolean))] as string[]

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-6 w-6" />
            模板管理中心
          </h1>
          <p className="text-muted-foreground mt-1">浏览、管理和导入网站模板</p>
        </div>
        <Button onClick={handleImport}>
          <Upload className="h-4 w-4 mr-1" />
          导入模板
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索模板名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          <Button
            variant={!selectedIndustry ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedIndustry('')}
          >
            全部
          </Button>
          {usedIndustries.map((ind) => (
            <Button
              key={ind}
              variant={selectedIndustry === ind ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedIndustry(ind)}
            >
              {industryLabel(ind)}
            </Button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>{templates.length === 0 ? '暂无模板，可以从项目中保存模板或导入模板文件' : '没有匹配的模板'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <Card key={template.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs mr-2">
                        {industryLabel(template.industry || '')}
                      </span>
                      {template.created_at && (
                        <span className="text-xs">
                          {new Date(template.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {template.description}
                  </p>
                )}
              </CardHeader>
              <div className="px-6 pb-4 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleCreateFromTemplate(template)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  创建项目
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(template.id)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  导出
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(template.id, template.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
