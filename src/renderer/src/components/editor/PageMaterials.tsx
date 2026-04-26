import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Upload, FileText, Image, Trash2, Loader2, Wand2 } from 'lucide-react'

interface UploadedFile {
  name: string
  type: 'image' | 'document'
  relativePath: string
}

interface PageMaterialsProps {
  pageId: string
  pageTitle: string
  projectId: string
  materials: Record<string, { files: UploadedFile[]; docText?: string }>
  onMaterialsChange: (pageId: string, files: UploadedFile[], docText?: string) => void
  onAutoAssign: (pageId: string) => void | Promise<void>
}

export default function PageMaterials({
  pageId,
  pageTitle,
  projectId,
  materials,
  onMaterialsChange,
  onAutoAssign
}: PageMaterialsProps): React.JSX.Element {
  const [uploading, setUploading] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const pageMat = materials[pageId]
  const files = pageMat?.files ?? []
  const images = files.filter((f) => f.type === 'image')
  const docs = files.filter((f) => f.type === 'document')

  async function handleUpload(): Promise<void> {
    setUploading(true)
    try {
      const result = await window.api.uploadPageMaterials({ projectId, pageId })
      if (result.success && result.files && result.files.length > 0) {
        const newFiles: UploadedFile[] = result.files.map((f) => ({
          name: f.name,
          type: f.type,
          relativePath: f.relativePath
        }))
        const merged = [...files, ...newFiles]
        const mergedDocText = [pageMat?.docText, result.docText].filter(Boolean).join('\n\n')
        onMaterialsChange(pageId, merged, mergedDocText || undefined)
      }
    } catch (err) {
      alert(`上传失败: ${(err as Error).message}`)
    }
    setUploading(false)
  }

  function handleRemove(idx: number): void {
    const updated = files.filter((_, i) => i !== idx)
    onMaterialsChange(pageId, updated, pageMat?.docText)
  }

  return (
    <div className="border-b">
      <div className="px-3 py-2 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          <Upload className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium truncate">
            {pageTitle} — 页面资料
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {files.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1 text-primary"
              disabled={assigning}
              onClick={async () => {
                setAssigning(true)
                try {
                  await onAutoAssign(pageId)
                } finally {
                  setAssigning(false)
                }
              }}
              title="AI 智能分配资料到区块"
            >
              {assigning ? (
                <><Loader2 className="h-3 w-3 animate-spin" />AI分析中...</>
              ) : (
                <><Wand2 className="h-3 w-3" />分配</>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            上传
          </Button>
        </div>
      </div>

      {files.length > 0 && (
        <ScrollArea className="max-h-32">
          <div className="px-3 py-1.5 space-y-1">
            {images.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {images.map((img, idx) => {
                  const realIdx = files.indexOf(img)
                  return (
                    <div key={idx} className="relative group w-10 h-10 rounded border overflow-hidden shrink-0">
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Image className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <button
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        onClick={() => handleRemove(realIdx)}
                      >
                        <Trash2 className="h-3 w-3 text-white" />
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center truncate px-0.5">
                        {img.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
            {docs.map((doc, idx) => {
              const realIdx = files.indexOf(doc)
              return (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground group">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate flex-1">{doc.name}</span>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => handleRemove(realIdx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}

      {files.length === 0 && (
        <div className="px-3 py-3 text-center">
          <p className="text-xs text-muted-foreground">暂无资料，点击上传添加文档和图片</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            支持 txt/doc/docx/pdf/pptx/jpg/png/bmp 等
          </p>
        </div>
      )}
    </div>
  )
}
