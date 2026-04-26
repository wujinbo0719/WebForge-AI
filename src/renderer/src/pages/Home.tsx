import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, FolderOpen, Trash2, Copy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '@/stores/project-store'
import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'

export default function Home(): React.JSX.Element {
  const navigate = useNavigate()
  const { projects, setProjects } = useProjectStore()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    window.api.getProjects().then(setProjects)
  }, [setProjects])

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return
    try {
      await window.api.deleteProject(deleteTarget.id)
      setProjects(projects.filter((p) => p.id !== deleteTarget.id))
    } catch (err) {
      alert(`删除失败: ${(err as Error).message}`)
    }
    setDeleteTarget(null)
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">项目列表</h1>
          <p className="text-muted-foreground mt-1">管理你的网站项目</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/clone')}>
            <Copy className="mr-2 h-4 w-4" />
            智能拷贝
          </Button>
          <Button onClick={() => navigate('/wizard')}>
            <Plus className="mr-2 h-4 w-4" />
            新建项目
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <CardHeader className="items-center">
            <CardTitle>还没有项目</CardTitle>
            <CardDescription>点击「新建项目」开始创建你的第一个网站</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group relative cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate(`/editor/${project.id}`)}
            >
              <CardHeader className="pr-12 relative">
                <CardTitle className="text-base truncate pr-2">{project.name}</CardTitle>
                <CardDescription>{project.industry}</CardDescription>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget({ id: project.id, name: project.name })
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除项目</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除项目「{deleteTarget?.name}」吗？此操作不可撤销，项目的所有数据和已生成的网站文件都将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
