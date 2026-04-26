import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SectionData } from './PropertyPanel'

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
  'blog-list': '博客列表'
}

interface SectionListProps {
  sections: SectionData[]
  selectedIndex: number | null
  onSelect: (index: number) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

export default function SectionList({
  sections,
  selectedIndex,
  onSelect,
  onReorder
}: SectionListProps): React.JSX.Element {
  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        <p className="px-2 py-1 text-xs font-medium text-muted-foreground">页面区块</p>
        {sections.map((section, index) => (
          <button
            key={`${section.type}-${index}`}
            onClick={() => onSelect(index)}
            className={cn(
              'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
              selectedIndex === index
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'hover:bg-muted/50 border border-transparent'
            )}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 cursor-grab" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {SECTION_LABELS[section.type] ?? section.type}
              </p>
              <p className="text-xs text-muted-foreground truncate">{section.heading}</p>
            </div>
            {index > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onReorder(index, index - 1)
                }}
              >
                ↑
              </Button>
            )}
            {index < sections.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onReorder(index, index + 1)
                }}
              >
                ↓
              </Button>
            )}
          </button>
        ))}
      </div>
    </ScrollArea>
  )
}
