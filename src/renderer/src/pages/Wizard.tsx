import { useWizardStore } from '@/stores/wizard-store'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Wand2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import IndustrySelect from '@/components/wizard/IndustrySelect'
import PageConfig from '@/components/wizard/PageConfig'
import StylePicker from '@/components/wizard/StylePicker'
import MaterialUpload from '@/components/wizard/MaterialUpload'
import WizardConfirm from '@/components/wizard/WizardConfirm'

const STEPS = [
  { title: '选择行业', description: '选择最贴近的行业分类' },
  { title: '配置参数', description: '设置网站基本信息与页面结构' },
  { title: '选择风格', description: '挑选设计风格、配色和字体' },
  { title: '上传资料', description: '上传公司文档或参考网站' },
  { title: '确认生成', description: '检查配置并启动 AI 生成' }
]

export default function Wizard(): React.JSX.Element {
  const { step, setStep, nextStep, prevStep, industry, projectName, styleId, paletteId, fontId, reset } =
    useWizardStore()
  const navigate = useNavigate()

  const progress = ((step + 1) / STEPS.length) * 100

  function canNext(): boolean {
    switch (step) {
      case 0:
        return industry !== ''
      case 1:
        return projectName.trim() !== ''
      case 2:
        return styleId !== '' && paletteId !== '' && fontId !== ''
      case 3:
        return true // materials are optional
      case 4:
        return true
      default:
        return false
    }
  }

  async function handleGenerate(): Promise<void> {
    // Phase 3 will implement AI generation
    // For now, create a project in the database and navigate to it
    try {
      const project = await window.api.createProject({
        name: projectName,
        industry: industry,
        domain: useWizardStore.getState().domain,
        websiteType: useWizardStore.getState().websiteType
      })
      if (project) {
        // Save config_json with all wizard data
        const state = useWizardStore.getState()
        const materialPaths = state.materials
          .filter((m: unknown) => m && typeof m === 'object' && 'path' in (m as Record<string, unknown>))
          .map((m: unknown) => (m as { path: string }).path)
        const configJson = JSON.stringify({
          companyName: state.companyName,
          languages: state.languages,
          selectedPages: state.selectedPages,
          styleId: state.styleId,
          paletteId: state.paletteId,
          fontId: state.fontId,
          referenceUrls: state.referenceUrls,
          materialPaths,
          materialDocText: state.materialDocText || undefined,
          referenceDesign: state.referenceDesign || undefined
        })
        await window.api.updateProject(project.id, { config_json: configJson })
        reset()
        navigate(`/editor/${project.id}`)
      }
    } catch (err) {
      console.error('Failed to create project:', err)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wand2 className="h-6 w-6" />
          项目创建向导
        </h1>
        <p className="text-muted-foreground mt-1">
          {STEPS[step].description}
        </p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {STEPS.map((s, i) => (
            <button
              key={s.title}
              onClick={() => {
                // Only allow clicking on completed steps or current
                if (i <= step) setStep(i)
              }}
              className={`text-xs font-medium transition-colors ${
                i === step
                  ? 'text-primary'
                  : i < step
                    ? 'text-primary/70 cursor-pointer hover:text-primary'
                    : 'text-muted-foreground'
              }`}
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {step === 0 && <IndustrySelect />}
        {step === 1 && <PageConfig />}
        {step === 2 && <StylePicker />}
        {step === 3 && <MaterialUpload />}
        {step === 4 && <WizardConfirm />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => {
            if (step === 0) {
              reset()
              navigate('/')
            } else {
              prevStep()
            }
          }}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 0 ? '返回首页' : '上一步'}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={nextStep} disabled={!canNext()}>
            下一步
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleGenerate} disabled={!canNext()}>
            <Sparkles className="h-4 w-4 mr-1" />
            开始生成
          </Button>
        )}
      </div>
    </div>
  )
}
