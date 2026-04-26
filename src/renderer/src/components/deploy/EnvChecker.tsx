import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react'

interface EnvCheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning' | 'fixing'
  message: string
  autoFixable: boolean
}

interface EnvCheckerProps {
  domain: string
  onComplete: (allPassed: boolean) => void
}

const STATUS_ICON = {
  pass: <CheckCircle className="h-5 w-5 text-green-500" />,
  fail: <XCircle className="h-5 w-5 text-red-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  fixing: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
}

export default function EnvChecker({ domain, onComplete }: EnvCheckerProps): React.JSX.Element {
  const [results, setResults] = useState<EnvCheckResult[]>([])
  const [running, setRunning] = useState(true)

  useEffect(() => {
    // Listen for progress updates
    const cleanup = window.api.onEnvCheckProgress((data) => {
      setResults(data as EnvCheckResult[])
    })

    // Start env check
    window.api.sshEnvCheck(domain).then((result) => {
      if (result.success && result.results) {
        setResults(result.results as EnvCheckResult[])
      }
      setRunning(false)

      // Check if all passed (no 'fail' status)
      const finalResults = (result.results ?? []) as EnvCheckResult[]
      const allPassed = finalResults.every((r) => r.status !== 'fail')
      onComplete(allPassed)
    })

    return cleanup
  }, [domain])

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold mb-3">环境预检清单</h3>
      {results.length === 0 && running && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          正在初始化环境检测...
        </div>
      )}
      {results.map((result) => (
        <div
          key={result.name}
          className="flex items-start gap-3 rounded-lg border p-3"
        >
          <div className="mt-0.5">{STATUS_ICON[result.status]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{result.name}</p>
            <p className="text-xs text-muted-foreground">{result.message}</p>
          </div>
        </div>
      ))}
      {!running && results.length > 0 && (
        <>
          <div className={`rounded-lg p-3 text-sm mt-4 ${
            results.every((r) => r.status !== 'fail')
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}>
            {results.every((r) => r.status !== 'fail')
              ? '所有检测已通过，可以继续部署'
              : '部分检测未通过，请先解决问题'}
          </div>
          {results.some((r) => r.status === 'fail') && (
            <button
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
              onClick={() => {
                setResults([])
                setRunning(true)
                window.api.sshEnvCheck(domain).then((result) => {
                  if (result.success && result.results) {
                    setResults(result.results as EnvCheckResult[])
                  }
                  setRunning(false)
                  const finalResults = (result.results ?? []) as EnvCheckResult[]
                  const allPassed = finalResults.every((r) => r.status !== 'fail')
                  onComplete(allPassed)
                })
              }}
            >
              重新检测
            </button>
          )}
        </>
      )}
    </div>
  )
}
