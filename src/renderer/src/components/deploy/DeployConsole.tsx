import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'

interface DeployProgress {
  step: string
  status: 'pending' | 'running' | 'done' | 'error'
  message: string
}

interface DeployConsoleProps {
  projectId: string
  projectName: string
  domain: string
  cloudProvider?: string
}

const STATUS_ICON = {
  pending: <Clock className="h-5 w-5 text-muted-foreground" />,
  running: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
  done: <CheckCircle className="h-5 w-5 text-green-500" />,
  error: <XCircle className="h-5 w-5 text-red-500" />
}

export default function DeployConsole({
  projectId,
  projectName,
  domain,
  cloudProvider
}: DeployConsoleProps): React.JSX.Element {
  const [steps, setSteps] = useState<DeployProgress[]>([])
  const [deploying, setDeploying] = useState(true)
  const [finalMessage, setFinalMessage] = useState('')

  useEffect(() => {
    const cleanup = window.api.onDeployProgress((data) => {
      setSteps(data as DeployProgress[])
    })

    window.api.sshDeploy({ projectId, projectName, domain, cloudProvider }).then((result) => {
      setDeploying(false)
      if (result.success) {
        setFinalMessage('部署完成!')
      } else {
        setFinalMessage(`部署失败: ${result.error}`)
      }
    })

    return cleanup
  }, [projectId, projectName, domain, cloudProvider])

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold mb-3">部署进度</h3>
      {steps.map((step) => (
        <div
          key={step.step}
          className="flex items-start gap-3 rounded-lg border p-3"
        >
          <div className="mt-0.5">{STATUS_ICON[step.status]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{step.message}</p>
          </div>
        </div>
      ))}

      {!deploying && finalMessage && (
        <div className={`rounded-lg p-4 text-sm mt-4 ${
          finalMessage.includes('完成')
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-700'
        }`}>
          {finalMessage}
        </div>
      )}
    </div>
  )
}
