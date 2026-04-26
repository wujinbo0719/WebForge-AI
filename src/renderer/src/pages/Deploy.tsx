import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Upload, ArrowLeft, Globe, CheckCircle, FileDown, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import SSHConfigPanel from '@/components/deploy/SSHConfig'
import EnvChecker from '@/components/deploy/EnvChecker'
import DeployConsole from '@/components/deploy/DeployConsole'

type DeployStage = 'ssh-config' | 'env-check' | 'deploy' | 'done'

export default function Deploy(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [stage, setStage] = useState<DeployStage>('ssh-config')
  const [domain, setDomain] = useState('')
  const [noDomain, setNoDomain] = useState(false)
  const [cloudProvider, setCloudProvider] = useState<string>('other')
  const [connected, setConnected] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [envPassed, setEnvPassed] = useState(false)
  const [deployDone, setDeployDone] = useState(false)

  useEffect(() => {
    if (!id) return
    window.api.getProject(id).then((project) => {
      if (project) {
        const p = project as { name: string; domain?: string }
        setProjectName(p.name)
        if (p.domain) setDomain(p.domain)
      }
    })
  }, [id])

  function handleConnected(): void {
    setConnected(true)
  }

  function handleStartEnvCheck(): void {
    if (!noDomain && !domain.trim()) return
    setStage('env-check')
  }

  const effectiveDomain = noDomain ? '' : domain.trim()

  function handleEnvCheckComplete(allPassed: boolean): void {
    setEnvPassed(allPassed)
  }

  function handleStartDeploy(): void {
    setStage('deploy')
  }

  // Listen for deploy completion to update project status
  useEffect(() => {
    if (stage !== 'deploy' || !id) return
    const cleanup = window.api.onDeployProgress((data) => {
      const steps = data as { step: string; status: string }[]
      const allDone = steps.length > 0 && steps.every((s) => s.status === 'done')
      if (allDone) {
        setDeployDone(true)
        setStage('done')
        window.api.updateProject(id, { status: 'deployed' })
      }
    })
    return cleanup
  }, [stage, id])

  // Step indicator
  const steps = [
    { label: 'SSH 连接', done: connected },
    { label: '环境预检', done: envPassed },
    { label: '部署', done: deployDone }
  ]
  const currentStep = stage === 'ssh-config' ? 0 : stage === 'env-check' ? 1 : 2

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="h-6 w-6" />
          SSH 部署
        </h1>
        <p className="text-muted-foreground mt-1">{projectName || `项目 ID: ${id}`}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((step, idx) => (
          <div key={step.label} className="flex items-center gap-2">
            {idx > 0 && <Separator className="w-8" />}
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                idx < currentStep || step.done
                  ? 'bg-green-100 text-green-700'
                  : idx === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {step.done && <CheckCircle className="h-3 w-3" />}
              {step.label}
            </div>
          </div>
        ))}
      </div>

      {/* Stage: SSH Config */}
      {stage === 'ssh-config' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>云主机连接信息</CardTitle>
              <CardDescription>输入 SSH 连接信息以连接到云主机</CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              <SSHConfigPanel onConnected={handleConnected} />
            </div>
          </Card>

          {connected && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  云平台选择
                </CardTitle>
                <CardDescription>选择你的云服务商，不同平台端口策略不同</CardDescription>
              </CardHeader>
              <div className="px-6 pb-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'aliyun', name: '阿里云/腾讯云' },
                    { id: 'ctyun', name: '天翼云' },
                    { id: 'other', name: '其他' }
                  ].map((cp) => (
                    <button
                      key={cp.id}
                      onClick={() => setCloudProvider(cp.id)}
                      className={`rounded-lg border-2 p-3 text-sm font-medium transition-colors ${
                        cloudProvider === cp.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      {cp.name}
                    </button>
                  ))}
                </div>
                {cloudProvider === 'ctyun' && (
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠ 天翼云 80/443/8080 端口需 ICP 备案，未备案将使用 8888 端口部署，请在安全组中放行 TCP 8888
                  </p>
                )}
              </div>
            </Card>
          )}

          {connected && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  域名配置
                </CardTitle>
                <CardDescription>输入要部署到的域名，或使用 IP 直接访问</CardDescription>
              </CardHeader>
              <div className="px-6 pb-6 space-y-4">
                <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <Checkbox
                    checked={noDomain}
                    onCheckedChange={(checked) => {
                      setNoDomain(checked === true)
                      if (checked) setDomain('')
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">暂未申请域名</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      将使用服务器 IP 直接部署（仅 HTTP），适合开发测试阶段
                    </p>
                  </div>
                </label>

                {!noDomain && (
                  <div className="space-y-2">
                    <Label htmlFor="domain">域名</Label>
                    <Input
                      id="domain"
                      placeholder="www.example.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      请确保域名的 DNS A 记录已指向目标服务器 IP
                    </p>
                  </div>
                )}

                <Button onClick={handleStartEnvCheck} disabled={!noDomain && !domain.trim()}>
                  开始环境预检
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Stage: Env Check */}
      {stage === 'env-check' && (
        <Card>
          <CardHeader>
            <CardTitle>环境预检</CardTitle>
            <CardDescription>正在检测服务器环境，缺少的依赖将自动安装</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <EnvChecker domain={effectiveDomain} onComplete={handleEnvCheckComplete} />
            {envPassed && (
              <div className="mt-4">
                <Button onClick={handleStartDeploy}>
                  开始一键部署
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Stage: Deploy */}
      {stage === 'deploy' && id && (
        <Card>
          <CardHeader>
            <CardTitle>部署进度</CardTitle>
            <CardDescription>
              {effectiveDomain ? `正在将网站部署到 ${effectiveDomain}` : '正在将网站部署到服务器（IP 直接访问）'}
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <DeployConsole
              projectId={id}
              projectName={projectName}
              domain={effectiveDomain}
              cloudProvider={cloudProvider}
            />
          </div>
        </Card>
      )}

      {/* Stage: Done */}
      {stage === 'done' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              部署完成
            </CardTitle>
            <CardDescription>网站已成功部署</CardDescription>
          </CardHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
              <p className="font-medium">网站访问地址：</p>
              {effectiveDomain ? (
                <p className="mt-1">https://{effectiveDomain}</p>
              ) : (
                <p className="mt-1">
                  http://服务器IP{cloudProvider === 'ctyun' ? ':8888' : ''}（请在部署日志中查看具体地址）
                </p>
              )}
              {!effectiveDomain && (
                <p className="mt-2 text-xs text-green-600">
                  提示：当域名申请完成后，可将 DNS A 记录指向服务器 IP，再重新部署以启用 HTTPS
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/')}>
                返回首页
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!id) return
                  const result = await window.api.exportDeployCommands({
                    projectId: id,
                    projectName,
                    domain: effectiveDomain
                  })
                  if (!result.success && result.error && result.error !== '已取消') {
                    alert(result.error)
                  }
                }}
              >
                <FileDown className="h-4 w-4 mr-1" />
                导出云端命令
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await window.api.sshDisconnect()
                  navigate('/')
                }}
              >
                断开连接并返回
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
