import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, CheckCircle, XCircle, Plug } from 'lucide-react'

interface SSHConfigPanelProps {
  onConnected: () => void
}

export default function SSHConfigPanel({ onConnected }: SSHConfigPanelProps): React.JSX.Element {
  const [host, setHost] = useState('')
  const [port, setPort] = useState('22')
  const [username, setUsername] = useState('root')
  const [authMethod, setAuthMethod] = useState<'password' | 'key'>('password')
  const [password, setPassword] = useState('')
  const [privateKeyPath, setPrivateKeyPath] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleTest(): Promise<void> {
    setTesting(true)
    setTestResult(null)

    const config = {
      host,
      port: parseInt(port),
      username,
      authMethod,
      password: authMethod === 'password' ? password : undefined,
      privateKeyPath: authMethod === 'key' ? privateKeyPath : undefined,
      passphrase: authMethod === 'key' ? passphrase : undefined
    }

    const result = await window.api.sshTestConnection(config)
    setTestResult({
      success: result.success,
      message: result.success ? '连接成功' : result.error ?? '连接失败'
    })
    setTesting(false)
  }

  async function handleConnect(): Promise<void> {
    setTesting(true)
    const config = {
      host,
      port: parseInt(port),
      username,
      authMethod,
      password: authMethod === 'password' ? password : undefined,
      privateKeyPath: authMethod === 'key' ? privateKeyPath : undefined,
      passphrase: authMethod === 'key' ? passphrase : undefined
    }

    const result = await window.api.sshConnect(config)
    if (result.success) {
      onConnected()
    } else {
      setTestResult({ success: false, message: result.error ?? '连接失败' })
    }
    setTesting(false)
  }

  const canConnect = host.trim() !== '' && username.trim() !== '' &&
    (authMethod === 'password' ? password !== '' : privateKeyPath !== '')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Label className="mb-1 block text-sm">主机地址</Label>
          <Input
            placeholder="192.168.1.100 或 example.com"
            value={host}
            onChange={(e) => setHost(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-1 block text-sm">端口</Label>
          <Input
            placeholder="22"
            value={port}
            onChange={(e) => setPort(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label className="mb-2 block text-sm">认证方式</Label>
        <RadioGroup
          value={authMethod}
          onValueChange={(v) => setAuthMethod(v as 'password' | 'key')}
          className="flex gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="password" id="auth-pw" />
            <Label htmlFor="auth-pw" className="text-sm">密码认证</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="key" id="auth-key" />
            <Label htmlFor="auth-key" className="text-sm">密钥认证</Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="mb-1 block text-sm">用户名</Label>
        <Input value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>

      {authMethod === 'password' ? (
        <div>
          <Label className="mb-1 block text-sm">密码</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      ) : (
        <>
          <div>
            <Label className="mb-1 block text-sm">私钥文件路径</Label>
            <Input
              placeholder="C:\Users\xxx\.ssh\id_rsa"
              value={privateKeyPath}
              onChange={(e) => setPrivateKeyPath(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-1 block text-sm">密钥密码（可选）</Label>
            <Input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
          </div>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        系统要求: Ubuntu 20.04 / 22.04 LTS
      </p>

      {/* Test result */}
      {testResult && (
        <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
          testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {testResult.message}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleTest} disabled={!canConnect || testing}>
          {testing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          测试连接
        </Button>
        <Button onClick={handleConnect} disabled={!canConnect || testing}>
          <Plug className="h-4 w-4 mr-1" />
          连接并继续
        </Button>
      </div>
    </div>
  )
}
