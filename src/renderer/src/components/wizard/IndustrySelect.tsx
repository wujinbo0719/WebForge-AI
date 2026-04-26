import { INDUSTRIES } from '../../../../shared/constants'
import { useWizardStore } from '@/stores/wizard-store'
import { cn } from '@/lib/utils'

export default function IndustrySelect(): React.JSX.Element {
  const { industry, setField } = useWizardStore()

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">选择行业</h2>
      <p className="text-muted-foreground mb-6">选择最符合你业务的行业类别，AI将据此推荐最佳设计风格</p>
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
        {INDUSTRIES.map((item) => (
          <button
            key={item.id}
            onClick={() => setField('industry', item.id)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all hover:shadow-md',
              industry === item.id
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border hover:border-primary/50'
            )}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
