import { ipcMain, BrowserWindow, dialog } from 'electron'
import { writeFileSync } from 'fs'
import { SSHManager, type SSHConfig } from '../services/ssh-manager'
import { runEnvironmentChecks } from '../services/env-checker'
import { deploySite, type CloudProvider } from '../services/deployer'

let sshManager: SSHManager | null = null

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows()
  return windows[0] ?? null
}

export function registerDeployHandlers(): void {
  // Test SSH connection
  ipcMain.handle('ssh:test-connection', async (_event, config: SSHConfig) => {
    try {
      const ssh = new SSHManager()
      await ssh.connect(config)
      const { stdout } = await ssh.exec('echo "connected"')
      ssh.disconnect()
      return { success: true, message: stdout.trim() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Connect SSH (persistent)
  ipcMain.handle('ssh:connect', async (_event, config: SSHConfig) => {
    try {
      if (sshManager) {
        sshManager.disconnect()
      }
      sshManager = new SSHManager()
      await sshManager.connect(config)
      return { success: true }
    } catch (err) {
      sshManager = null
      return { success: false, error: (err as Error).message }
    }
  })

  // Disconnect SSH
  ipcMain.handle('ssh:disconnect', () => {
    if (sshManager) {
      sshManager.disconnect()
      sshManager = null
    }
    return { success: true }
  })

  // Run environment checks
  ipcMain.handle('ssh:env-check', async (_event, domain: string) => {
    if (!sshManager) {
      return { success: false, error: 'SSH 未连接' }
    }
    try {
      const win = getMainWindow()
      const results = await runEnvironmentChecks(sshManager, domain, (progress) => {
        // Send progress to renderer
        win?.webContents.send('ssh:env-check-progress', progress)
      })
      return { success: true, results }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Deploy site
  ipcMain.handle('ssh:deploy', async (_event, params: {
    projectId: string
    projectName: string
    domain: string
    cloudProvider?: string
  }) => {
    if (!sshManager) {
      return { success: false, error: 'SSH 未连接' }
    }
    try {
      const win = getMainWindow()
      const validProviders: ReadonlyArray<CloudProvider> = ['aliyun', 'ctyun', 'other']
      const cloudProvider: CloudProvider | undefined =
        params.cloudProvider && (validProviders as readonly string[]).includes(params.cloudProvider)
          ? (params.cloudProvider as CloudProvider)
          : undefined
      await deploySite(
        sshManager,
        { ...params, cloudProvider },
        (progress) => {
          win?.webContents.send('ssh:deploy-progress', progress)
        }
      )
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Execute arbitrary command (for deploy console)
  ipcMain.handle('ssh:exec', async (_event, command: string) => {
    if (!sshManager) {
      return { success: false, error: 'SSH 未连接' }
    }
    try {
      const result = await sshManager.exec(command)
      return { success: true, ...result }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // Export all deploy commands as a shell script
  ipcMain.handle('deploy:export-commands', async (_event, params: {
    projectId: string
    projectName: string
    domain: string
  }) => {
    try {
      const win = getMainWindow()
      if (!win) return { success: false, error: '无法获取窗口' }

      const safeName = params.projectName.replace(/[^a-zA-Z0-9_-]/g, '')
      const shortId = params.projectId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
      const dirName = safeName ? `${safeName}_${shortId}` : `project_${shortId}`
      const remoteDir = `/opt/webforge/${dirName}`
      const domain = params.domain || ''

      const script = generateDeployScript(dirName, remoteDir, domain)

      const result = await dialog.showSaveDialog(win, {
        title: '导出云端部署命令',
        defaultPath: `webforge-deploy-${dirName}.sh`,
        filters: [
          { name: 'Shell 脚本', extensions: ['sh'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: '已取消' }
      }

      writeFileSync(result.filePath, script, 'utf-8')
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}

function generateDeployScript(projectName: string, remoteDir: string, domain: string): string {
  const hasDomain = !!domain
  const serverName = domain || '_'
  const webRoot = `${remoteDir}/html`

  return `#!/bin/bash
# ============================================================
# WebForge AI — 部署命令参考
# 生成时间: ${new Date().toLocaleString('zh-CN')}
# ============================================================
#
# 【主机信息】
#   项目名称: ${projectName}
#   远程目录: ${remoteDir}
#   网站根目录: ${webRoot}
#   ${hasDomain ? `绑定域名: ${domain}` : '访问方式: 通过服务器 IP 直接访问（无域名）'}
#
# 【使用说明】
#   以下命令请在云主机上以 root 用户依次执行
#   或将此脚本上传后执行: chmod +x deploy.sh && sudo ./deploy.sh
# ============================================================

set -e

# ---- 第一步：安装 Nginx（如已安装会跳过）----
if ! command -v nginx &> /dev/null; then
    apt-get update -y            # 更新软件源
    apt-get install -y nginx     # 安装 Nginx
    systemctl enable nginx       # 设置开机自启
fi
systemctl start nginx            # 启动 Nginx 服务

# ---- 第二步：创建网站目录 ----
mkdir -p ${webRoot}              # 创建网站文件存放目录
chmod 755 /opt /opt/webforge ${remoteDir}  # 设置目录权限

# ---- 第三步：上传网站文件 ----
# 请在本地电脑执行以下命令将网站文件上传到服务器：
#   scp -r ./dist/* root@<服务器IP>:${webRoot}/
# 或者使用软件的"部署到云端"功能自动上传

# ---- 第四步：配置 Nginx ----
cat > /etc/nginx/sites-available/${projectName}.conf << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name ${serverName};

    root ${webRoot};
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;  # 支持单页应用路由
    }

    # 开启 Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # 静态资源缓存 30 天
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINX_EOF

# 启用站点配置
ln -sf /etc/nginx/sites-available/${projectName}.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default  # 移除默认站点（避免冲突）

# ---- 第五步：设置文件权限并重启 Nginx ----
chown -R www-data:www-data ${webRoot}  # 让 Nginx 有权读取文件
nginx -t                               # 检查配置是否正确
systemctl reload nginx                  # 重新加载 Nginx 配置

${hasDomain ? `# ---- 第六步：申请 SSL 证书（需要域名已解析到此服务器）----
apt-get install -y certbot python3-certbot-nginx  # 安装 Certbot
certbot --nginx -d ${domain} --non-interactive --agree-tos --email admin@${domain} || echo "SSL 证书申请失败，请确认域名已解析到此服务器"
` : `# 如果后续申请了域名，可执行以下命令启用 HTTPS：
#   apt-get install -y certbot python3-certbot-nginx
#   certbot --nginx -d 你的域名 --non-interactive --agree-tos --email 你的邮箱
`}
# ---- 开放防火墙端口 ----
ufw allow 80/tcp 2>/dev/null; ufw allow 443/tcp 2>/dev/null  # UFW 防火墙
iptables -I INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null     # iptables
iptables -I INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null

echo ""
echo "============================================================"
echo " 部署完成！"
echo ""
echo " 访问地址: ${hasDomain ? `https://${domain}` : 'http://<服务器IP>'}"
echo " 网站目录: ${webRoot}"
echo ""
echo " 常用命令："
echo "   查看 Nginx 状态:  systemctl status nginx"
echo "   重启 Nginx:       systemctl reload nginx"
echo "   查看访问日志:     tail -f /var/log/nginx/access.log"
echo "   查看错误日志:     tail -f /var/log/nginx/error.log"
echo "   更新网站文件后:   chown -R www-data:www-data ${webRoot} && systemctl reload nginx"
echo "============================================================"
`
}
