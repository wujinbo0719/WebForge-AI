export interface Project {
  id: string
  name: string
  industry: string
  domain?: string
  website_type: 'single-page' | 'multi-page' | 'ecommerce' | 'blog'
  status: 'draft' | 'generated' | 'confirmed' | 'deployed'
  config_json?: string
  created_at: string
  updated_at: string
}

export interface AIProviderConfig {
  provider: 'claude' | 'openai' | 'deepseek' | 'zhipu' | 'kimi' | 'minimax' | 'siliconflow' | 'custom'
  apiKey: string
  baseUrl?: string
  model?: string
}

export interface SSHConfig {
  host: string
  port: number
  username: string
  authMethod: 'password' | 'key'
  password?: string
  privateKeyPath?: string
  passphrase?: string
}

export interface DeployConfig {
  sshConfig: SSHConfig
  domain: string
  projectName: string
}

export interface EnvCheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning' | 'fixing'
  message: string
  autoFixable: boolean
}
