import { Client, type ConnectConfig } from 'ssh2'
import { readFileSync, createReadStream, existsSync } from 'fs'
import { join } from 'path'
import { readdirSync } from 'fs'

export interface SSHConfig {
  host: string
  port: number
  username: string
  authMethod: 'password' | 'key'
  password?: string
  privateKeyPath?: string
  passphrase?: string
}

export class SSHManager {
  private client: Client
  private connected = false

  constructor() {
    this.client = new Client()
  }

  async connect(config: SSHConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const connectConfig: ConnectConfig = {
        host: config.host,
        port: config.port,
        username: config.username,
        readyTimeout: 10000
      }

      if (config.authMethod === 'password') {
        connectConfig.password = config.password
      } else {
        if (!config.privateKeyPath) throw new Error('未指定私钥文件路径')
        connectConfig.privateKey = readFileSync(config.privateKeyPath)
        if (config.passphrase) connectConfig.passphrase = config.passphrase
      }

      this.client.on('ready', () => {
        this.connected = true
        resolve()
      })
      this.client.on('error', (err) => {
        reject(new Error(`SSH 连接失败: ${err.message}`))
      })
      this.client.connect(connectConfig)
    })
  }

  async exec(command: string): Promise<{ stdout: string; stderr: string; code: number }> {
    if (!this.connected) throw new Error('SSH 未连接')
    return new Promise((resolve, reject) => {
      this.client.exec(command, (err, stream) => {
        if (err) return reject(err)
        let stdout = ''
        let stderr = ''
        stream.on('close', (code: number) => {
          resolve({ stdout, stderr, code: code ?? 0 })
        })
        stream.on('data', (data: Buffer) => {
          stdout += data.toString()
        })
        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString()
        })
      })
    })
  }

  async uploadDirectory(localDir: string, remoteDir: string): Promise<void> {
    if (!this.connected) throw new Error('SSH 未连接')
    if (!existsSync(localDir)) {
      throw new Error(`本地目录不存在: ${localDir}`)
    }

    // Collect all subdirectories first, then create them via sudo mkdir + chown
    const subDirs = this.collectSubDirs(localDir, '')
    const allDirs = [remoteDir, ...subDirs.map((d) => `${remoteDir}/${d}`)]
    const mkdirCmd = allDirs.map((d) => `"${d}"`).join(' ')
    await this.exec(`sudo mkdir -p ${mkdirCmd} 2>/dev/null || mkdir -p ${mkdirCmd} 2>/dev/null || true`)
    // chown to current SSH user so SFTP can write without sudo
    const { stdout: whoami } = await this.exec('whoami')
    const user = whoami.trim() || 'root'
    await this.exec(`sudo chown -R ${user}:${user} ${remoteDir} 2>/dev/null || true`)

    return new Promise((resolve, reject) => {
      this.client.sftp(async (err, sftp) => {
        if (err) return reject(new Error(`SFTP 会话建立失败: ${err.message}`))
        try {
          await this.uploadDirRecursive(sftp, localDir, remoteDir)
          resolve()
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  private collectSubDirs(localDir: string, prefix: string): string[] {
    const dirs: string[] = []
    try {
      const entries = readdirSync(localDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const rel = prefix ? `${prefix}/${entry.name}` : entry.name
          dirs.push(rel)
          dirs.push(...this.collectSubDirs(join(localDir, entry.name), rel))
        }
      }
    } catch { /* ignore */ }
    return dirs
  }

  private async uploadDirRecursive(
    sftp: unknown,
    localDir: string,
    remoteDir: string
  ): Promise<void> {
    if (!existsSync(localDir)) return

    let entries
    try {
      entries = readdirSync(localDir, { withFileTypes: true })
    } catch {
      return
    }

    const errors: string[] = []
    for (const entry of entries) {
      const localPath = join(localDir, entry.name)
      const remotePath = `${remoteDir}/${entry.name}`

      if (!existsSync(localPath)) continue

      if (entry.isDirectory()) {
        await this.uploadDirRecursive(sftp, localPath, remotePath)
      } else {
        try {
          await this.uploadFile(sftp, localPath, remotePath)
        } catch (e) {
          errors.push(`${entry.name}: ${(e as Error).message}`)
        }
      }
    }
    if (errors.length > 0 && errors.length === entries.filter((e) => !e.isDirectory()).length) {
      throw new Error(`所有文件上传失败: ${errors[0]}`)
    }
  }

  private uploadFile(sftp: unknown, localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!existsSync(localPath)) return resolve()
      const sftpClient = sftp as { createWriteStream: (path: string) => NodeJS.WritableStream }
      const readStream = createReadStream(localPath)
      const writeStream = sftpClient.createWriteStream(remotePath)
      readStream.on('error', (err) => reject(new Error(`读取失败 ${localPath}: ${err.message}`)))
      writeStream.on('error', (err) => reject(new Error(`写入失败 ${remotePath}: ${(err as Error).message}`)))
      writeStream.on('close', () => resolve())
      readStream.pipe(writeStream)
    })
  }

  disconnect(): void {
    if (this.connected) {
      this.client.end()
      this.connected = false
    }
  }

  isConnected(): boolean {
    return this.connected
  }
}
