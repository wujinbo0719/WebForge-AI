import { Home, Wand2, LayoutGrid, Settings, Copy } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

const navItems = [
  { to: '/', label: '项目', icon: Home },
  { to: '/wizard', label: '创建向导', icon: Wand2 },
  { to: '/clone', label: '智能拷贝', icon: Copy },
  { to: '/templates', label: '模板中心', icon: LayoutGrid },
  { to: '/settings', label: '设置', icon: Settings }
]

export default function MainLayout(): React.JSX.Element {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col border-r bg-sidebar">
        <div className="flex h-14 items-center px-4">
          <Wand2 className="mr-2 h-5 w-5 text-primary" />
          <span className="text-lg font-bold">WebForge AI</span>
        </div>
        <Separator />
        <ScrollArea className="flex-1">
          <nav className="flex flex-col gap-1 p-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>
        <Separator />
        <div className="p-3 text-xs text-muted-foreground">v1.0.0</div>
      </aside>

      {/* Main Content */}
      <main className="relative flex-1 min-w-0">
        <div className="absolute inset-0 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
