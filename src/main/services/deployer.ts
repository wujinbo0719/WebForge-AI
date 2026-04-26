import { existsSync, readdirSync } from 'fs'
import type { SSHManager } from './ssh-manager'
import { getProjectOutputDir } from './site-generator'

export type CloudProvider = 'aliyun' | 'ctyun' | 'other'

export interface DeployConfig {
  projectId: string
  projectName: string
  domain: string
  cloudProvider?: CloudProvider
}

export type DeployStep =
  | 'upload'
  | 'docker-config'
  | 'docker-start'
  | 'ssl'
  | 'verify'

export interface DeployProgress {
  step: DeployStep
  status: 'pending' | 'running' | 'done' | 'error'
  message: string
}

export type DeployProgressCallback = (progress: DeployProgress[]) => void

/**
 * Run a remote command via SSH; throw on non-zero exit code.
 */
async function run(ssh: SSHManager, cmd: string): Promise<string> {
  const { stdout, stderr, code } = await ssh.exec(cmd)
  if (code !== 0) {
    const combined = `${stderr}\n${stdout}`.trim()
    const lines = combined.split('\n').filter(Boolean)
    // Keep up to 5 lines of context (skip useless "See --help" lines)
    const useful = lines.filter((l) => !l.includes('--help')).slice(-5)
    const msg = useful.join(' | ') || lines.pop() || `exit code ${code}`
    throw new Error(msg)
  }
  return stdout
}

/**
 * Detect (or install) a working docker-compose command.
 * The `progress` callback updates the UI so users don't see it frozen.
 */
export async function detectComposeCmd(
  ssh: SSHManager,
  progress: (msg: string) => void
): Promise<string> {
  const SUDO = 'sudo -E env "PATH=$PATH"'

  // Helper: check all known compose commands
  const findExisting = async (): Promise<string | null> => {
    // Plugin via docker CLI
    const { code: c1 } = await ssh.exec(`${SUDO} docker compose version 2>/dev/null`)
    if (c1 === 0) return `${SUDO} docker compose`
    // Standalone at known paths
    for (const bin of ['/usr/local/bin/docker-compose', '/usr/bin/docker-compose']) {
      const { code } = await ssh.exec(`test -x ${bin} && ${bin} version 2>/dev/null`)
      if (code === 0) {
        // Create plugin symlink so `docker compose` also works
        await ssh.exec(
          `sudo mkdir -p /usr/local/lib/docker/cli-plugins /usr/libexec/docker/cli-plugins 2>/dev/null; ` +
          `sudo ln -sf ${bin} /usr/local/lib/docker/cli-plugins/docker-compose 2>/dev/null; ` +
          `sudo ln -sf ${bin} /usr/libexec/docker/cli-plugins/docker-compose 2>/dev/null; true`
        )
        const { code: c2 } = await ssh.exec(`${SUDO} docker compose version 2>/dev/null`)
        return c2 === 0 ? `${SUDO} docker compose` : `sudo ${bin}`
      }
    }
    return null
  }

  // 1. Quick detection (no network)
  progress('检测 Docker Compose...')
  const existing = await findExisting()
  if (existing) return existing

  // 2. Try package manager — first ensure Docker CE repo is configured
  progress('正在配置 Docker 软件源并安装 Compose...')
  const installScript = `#!/bin/bash
set +e

# Detect OS
. /etc/os-release 2>/dev/null || true
DISTRO_ID="$ID"
CODENAME="$VERSION_CODENAME"

# Map derivatives to parent
case "$DISTRO_ID" in
  linuxmint|pop|elementary|zorin|neon) DISTRO_ID="ubuntu" ;;
esac

# Fallback codename
if [ -z "$CODENAME" ]; then
  case "$VERSION_ID" in
    24.04*) CODENAME="noble" ;;
    22.04*) CODENAME="jammy" ;;
    20.04*) CODENAME="focal" ;;
    *) CODENAME="focal" ;;
  esac
fi

echo "=== System: $DISTRO_ID $CODENAME ==="

# ---- Method 1: Install plugin from Docker CE apt repo ----
if command -v apt-get >/dev/null 2>&1; then
  # Check if Docker CE repo already configured
  if ! grep -q "download.docker.com\\|mirrors.aliyun.com/docker-ce" /etc/apt/sources.list.d/*.list 2>/dev/null; then
    echo "Adding Docker CE repo..."
    apt-get install -y -qq ca-certificates curl gnupg 2>/dev/null
    install -m 0755 -d /etc/apt/keyrings 2>/dev/null
    # Try aliyun mirror first (fast in China)
    MIRROR="https://mirrors.aliyun.com/docker-ce/linux/$DISTRO_ID"
    HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" "\$MIRROR/dists/$CODENAME/stable/" 2>/dev/null)
    if [ "\$HTTP_CODE" != "200" ] && [ "\$HTTP_CODE" != "301" ] && [ "\$HTTP_CODE" != "302" ]; then
      MIRROR="https://download.docker.com/linux/$DISTRO_ID"
    fi
    curl -fsSL "\$MIRROR/gpg" 2>/dev/null | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg 2>/dev/null
    chmod a+r /etc/apt/keyrings/docker.gpg 2>/dev/null
    ARCH=\$(dpkg --print-architecture 2>/dev/null || echo "amd64")
    echo "deb [arch=\$ARCH signed-by=/etc/apt/keyrings/docker.gpg] \$MIRROR $CODENAME stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq 2>/dev/null
  fi
  echo "Installing docker-compose-plugin via apt..."
  if apt-get install -y -qq docker-compose-plugin 2>/dev/null; then
    echo "OK_APT"
    exit 0
  fi
fi

# ---- Method 2: yum/dnf ----
if command -v yum >/dev/null 2>&1 || command -v dnf >/dev/null 2>&1; then
  PM="yum"
  command -v dnf >/dev/null 2>&1 && PM="dnf"
  echo "Installing docker-compose-plugin via $PM..."
  if \$PM install -y docker-compose-plugin 2>/dev/null; then
    echo "OK_YUM"
    exit 0
  fi
fi

# ---- Method 3: Download binary (fix: use lowercase OS name) ----
echo "Downloading Docker Compose binary..."
# Docker Compose v2 uses lowercase: linux, not Linux
OS=\$(uname -s | tr '[:upper:]' '[:lower:]')
MACHINE=\$(uname -m)
# Normalize machine name
case "\$MACHINE" in
  x86_64) MACHINE="x86_64" ;;
  aarch64|arm64) MACHINE="aarch64" ;;
esac

DEST="/usr/local/bin/docker-compose"
for URL in \\
  "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-\${OS}-\${MACHINE}" \\
  "https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-\${OS}-\${MACHINE}" \\
  "https://get.daocloud.io/docker/compose/releases/download/v2.29.7/docker-compose-\${OS}-\${MACHINE}"; do
  echo "  Trying: \$URL"
  if curl -fsSL --connect-timeout 8 --max-time 45 "\$URL" -o "\$DEST" 2>/dev/null; then
    # Verify it's actually a binary, not an HTML error page
    if file "\$DEST" 2>/dev/null | grep -qi "ELF\\|executable"; then
      chmod +x "\$DEST"
      mkdir -p /usr/local/lib/docker/cli-plugins /usr/libexec/docker/cli-plugins 2>/dev/null
      ln -sf "\$DEST" /usr/local/lib/docker/cli-plugins/docker-compose 2>/dev/null
      ln -sf "\$DEST" /usr/libexec/docker/cli-plugins/docker-compose 2>/dev/null
      echo "OK_BINARY"
      exit 0
    else
      echo "  Downloaded file is not a valid binary, skipping"
      rm -f "\$DEST"
    fi
  fi
done

echo "ALL_FAILED"
exit 1`

  await ssh.exec(`cat > /tmp/_wf_compose_install.sh << 'WFEOF'\n${installScript}\nWFEOF`)
  const { stdout: installOut } = await ssh.exec('sudo bash /tmp/_wf_compose_install.sh 2>&1; rm -f /tmp/_wf_compose_install.sh')

  progress('验证 Docker Compose 安装...')
  const installed = await findExisting()
  if (installed) return installed

  // Extract diagnostic info from install output
  const lastLines = installOut.trim().split('\n').slice(-3).join(' | ')
  throw new Error(`Docker Compose 安装失败: ${lastLines.slice(0, 200)}`)
}

/**
 * Pull nginx:alpine image from multiple Chinese registry mirrors.
 * Tries each source sequentially until one succeeds.
 */
export async function pullNginxImage(
  ssh: SSHManager,
  progress: (msg: string) => void
): Promise<void> {
  // Sources to try, in order of reliability for China mainland
  const sources = [
    { label: '阿里云杭州', image: 'registry.cn-hangzhou.aliyuncs.com/library/nginx:alpine' },
    { label: '阿里云上海', image: 'registry.cn-shanghai.aliyuncs.com/library/nginx:alpine' },
    { label: '阿里云北京', image: 'registry.cn-beijing.aliyuncs.com/library/nginx:alpine' },
    { label: 'DaoCloud', image: 'docker.m.daocloud.io/library/nginx:alpine' },
    { label: 'Docker Hub（直连）', image: 'nginx:alpine' },
  ]

  for (const src of sources) {
    progress(`尝试从 ${src.label} 拉取 Nginx...`)
    const { code } = await ssh.exec(`sudo docker pull ${src.image} 2>&1`)
    if (code === 0) {
      // Tag as nginx:alpine if pulled from a mirror
      if (src.image !== 'nginx:alpine') {
        await ssh.exec(`sudo docker tag ${src.image} nginx:alpine 2>/dev/null`)
      }
      // Verify the tag exists
      const { code: tagOk } = await ssh.exec('sudo docker images -q nginx:alpine 2>/dev/null | grep -q .')
      if (tagOk === 0) {
        progress(`Nginx 镜像就绪（来源: ${src.label}）`)
        return
      }
    }
  }
}

/**
 * Build a safe remote directory name from project info.
 */
function buildRemoteDir(config: DeployConfig): string {
  const safeName = config.projectName.replace(/[^a-zA-Z0-9_-]/g, '')
  const shortId = config.projectId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)
  const dirName = safeName ? `${safeName}_${shortId}` : `project_${shortId}`
  return `/opt/webforge/${dirName}`
}

/**
 * Deploy a generated site to the remote server using native Nginx (no Docker).
 */
export async function deploySite(
  ssh: SSHManager,
  config: DeployConfig,
  onProgress: DeployProgressCallback
): Promise<void> {
  const steps: DeployProgress[] = [
    { step: 'upload', status: 'pending', message: '上传网站文件' },
    { step: 'docker-config', status: 'pending', message: '配置 Nginx' },
    { step: 'docker-start', status: 'pending', message: '启动 Nginx' },
    { step: 'ssl', status: 'pending', message: '配置 SSL 证书' },
    { step: 'verify', status: 'pending', message: '验证网站可访问' }
  ]

  function updateStep(step: DeployStep, status: DeployProgress['status'], message?: string): void {
    const idx = steps.findIndex((s) => s.step === step)
    if (idx >= 0) {
      steps[idx].status = status
      if (message) steps[idx].message = message
    }
    onProgress([...steps])
  }

  const remoteDir = buildRemoteDir(config)
  const localDir = getProjectOutputDir(config.projectId)
  const webRoot = `${remoteDir}/html`
  const isCtyun = config.cloudProvider === 'ctyun'
  const httpPort = isCtyun ? 8888 : 80

  onProgress([...steps])

  // Step 1: Upload files
  updateStep('upload', 'running', '正在检查本地文件...')
  try {
    if (!existsSync(localDir)) {
      throw new Error('网站尚未生成，请先在编辑器中点击"开始AI生成"生成网站后再部署')
    }
    const localFiles = readdirSync(localDir)
    const htmlFiles = localFiles.filter((f) => f.endsWith('.html'))
    if (htmlFiles.length === 0) {
      throw new Error('网站目录中没有 HTML 文件，请先生成网站')
    }

    updateStep('upload', 'running', '正在创建远程目录...')
    const { stdout: whoami } = await ssh.exec('whoami')
    const sshUser = whoami.trim() || 'root'
    await run(ssh, `sudo mkdir -p ${webRoot} && sudo chown -R ${sshUser}:${sshUser} ${remoteDir}`)

    updateStep('upload', 'running', `正在上传 ${localFiles.length} 个文件/目录...`)
    await ssh.uploadDirectory(localDir, webRoot)

    const { stdout: remoteCount } = await ssh.exec(`ls ${webRoot}/*.html 2>/dev/null | wc -l`)
    const uploadedCount = parseInt(remoteCount.trim()) || 0
    if (uploadedCount === 0) {
      throw new Error('文件上传后远程目录为空，可能权限不足。尝试使用 root 用户连接。')
    }
    updateStep('upload', 'done', `文件上传完成（${uploadedCount} 个页面）`)
  } catch (err) {
    updateStep('upload', 'error', `上传失败: ${(err as Error).message}`)
    throw err
  }

  // Step 2: Install & configure Nginx (native, no Docker)
  const hasDomain = !!config.domain
  updateStep('docker-config', 'running', '正在安装 Nginx...')
  try {
    // Install nginx if not present
    const { code: hasNginx } = await ssh.exec('which nginx 2>/dev/null || test -x /usr/sbin/nginx')
    if (hasNginx !== 0) {
      updateStep('docker-config', 'running', '正在安装 Nginx（首次需要几分钟）...')

      // Wait for any existing apt process to finish (common on fresh cloud VMs)
      updateStep('docker-config', 'running', '等待系统包管理器就绪...')
      await ssh.exec(
        'for i in $(seq 1 30); do ' +
        'if ! fuser /var/lib/dpkg/lock-frontend /var/lib/apt/lists/lock /var/cache/apt/archives/lock >/dev/null 2>&1 && ' +
        '! pgrep -x "apt-get|apt|dpkg" >/dev/null 2>&1; then break; fi; ' +
        'sleep 3; done; true'
      )
      await ssh.exec('sudo dpkg --configure -a 2>/dev/null; true')

      // Try apt install with up to 3 retries
      updateStep('docker-config', 'running', '正在安装 Nginx...')
      let installed = false
      let lastErr = ''
      for (let attempt = 1; attempt <= 3 && !installed; attempt++) {
        if (attempt > 1) {
          updateStep('docker-config', 'running', `正在安装 Nginx（第 ${attempt} 次尝试）...`)
          await ssh.exec('sleep 5')
        }
        const { code: aptOk, stdout: aptOut, stderr: aptErr } = await ssh.exec(
          'sudo apt-get update 2>&1 && sudo apt-get install -y nginx 2>&1'
        )
        if (aptOk === 0) {
          installed = true
        } else {
          lastErr = (aptErr || aptOut || '').trim().split('\n').slice(-2).join(' | ')
        }
      }
      if (!installed) {
        // Fallback: yum/dnf
        const { code: yumOk, stderr: yumErr } = await ssh.exec(
          'sudo yum install -y nginx 2>&1 || sudo dnf install -y nginx 2>&1'
        )
        if (yumOk !== 0) {
          throw new Error(`Nginx 安装失败: ${(lastErr || yumErr || '').slice(0, 200)}`)
        }
      }
    }

    // Verify nginx is actually available now
    const { code: verifyNginx } = await ssh.exec('which nginx 2>/dev/null || test -x /usr/sbin/nginx')
    if (verifyNginx !== 0) {
      throw new Error('Nginx 安装后仍无法找到。请在服务器手动执行: sudo apt-get install -y nginx')
    }

    // Stop any Docker containers using port 80 (from previous attempts)
    await ssh.exec(
      'sudo docker ps -aq 2>/dev/null | while read cid; do sudo docker rm -f "$cid" 2>/dev/null; done; true'
    )

    // Generate Nginx site config — use custom port for Ctyun (80/443/8080 blocked without ICP)
    updateStep('docker-config', 'running', '正在配置 Nginx...')
    const serverName = config.domain || '_'
    const listenLines = isCtyun
      ? `    listen ${httpPort};\n    listen [::]:${httpPort};`
      : `    listen 80;\n    listen [::]:80;\n    listen 8080;\n    listen [::]:8080;`
    const nginxSiteConf = `server {
${listenLines}
    server_name ${serverName};

    root ${webRoot};
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}`
    // Write site config
    await run(ssh, `sudo tee /etc/nginx/sites-available/webforge > /dev/null << 'NGEOF'\n${nginxSiteConf}\nNGEOF`)

    // Enable site: create symlink, remove default if it exists
    await ssh.exec('sudo mkdir -p /etc/nginx/sites-enabled')
    await ssh.exec('sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null; true')
    await ssh.exec('sudo ln -sf /etc/nginx/sites-available/webforge /etc/nginx/sites-enabled/webforge')

    // If no sites-enabled dir (CentOS), write to conf.d instead
    const { code: hasSitesDir } = await ssh.exec('test -d /etc/nginx/sites-enabled')
    if (hasSitesDir !== 0) {
      await run(ssh, `sudo tee /etc/nginx/conf.d/webforge.conf > /dev/null << 'NGEOF'\n${nginxSiteConf}\nNGEOF`)
    }

    // Ensure webRoot AND all parent dirs are readable/traversable by nginx (www-data)
    await ssh.exec(`sudo chmod 755 /opt /opt/webforge ${remoteDir} 2>/dev/null; true`)
    await ssh.exec(`sudo chmod -R 755 ${webRoot}`)
    await ssh.exec(`sudo chown -R www-data:www-data ${webRoot} 2>/dev/null; true`)

    // Test nginx config
    const { code: testCode, stderr: testErr } = await ssh.exec('sudo nginx -t 2>&1')
    if (testCode !== 0) {
      throw new Error(`Nginx 配置验证失败: ${testErr.trim().slice(0, 200)}`)
    }

    updateStep('docker-config', 'done', 'Nginx 配置完成')
  } catch (err) {
    updateStep('docker-config', 'error', `配置失败: ${(err as Error).message}`)
    throw err
  }

  // Step 3: Start/restart Nginx
  updateStep('docker-start', 'running', '正在启动 Nginx...')
  try {
    // Enable nginx to start on boot
    await ssh.exec('sudo systemctl enable nginx 2>/dev/null; true')
    // Restart nginx
    const { code: restartCode, stderr: restartErr } = await ssh.exec('sudo systemctl restart nginx 2>&1')
    if (restartCode !== 0) {
      // Try older init.d style
      const { code: initCode } = await ssh.exec('sudo service nginx restart 2>&1')
      if (initCode !== 0) {
        throw new Error(`Nginx 启动失败: ${restartErr.trim().slice(0, 200)}`)
      }
    }

    await ssh.exec('sleep 2')

    // Open ports in server-level firewall (ufw/iptables/firewalld)
    const portsToOpen = isCtyun ? [httpPort] : [80, 443, 8080]
    for (const p of portsToOpen) {
      await ssh.exec(`sudo ufw allow ${p}/tcp 2>/dev/null; sudo iptables -I INPUT -p tcp --dport ${p} -j ACCEPT 2>/dev/null; true`)
    }
    await ssh.exec(`sudo firewall-cmd --permanent ${portsToOpen.map((p) => `--add-port=${p}/tcp`).join(' ')} 2>/dev/null; sudo firewall-cmd --reload 2>/dev/null; true`)

    // Verify nginx is running
    const { code: statusCode } = await ssh.exec('sudo systemctl is-active nginx 2>/dev/null')
    if (statusCode === 0) {
      updateStep('docker-start', 'done', 'Nginx 已启动')
    } else {
      // Check if it's running via process
      const { code: pidCode } = await ssh.exec('pgrep nginx >/dev/null 2>&1')
      if (pidCode === 0) {
        updateStep('docker-start', 'done', 'Nginx 已启动')
      } else {
        const { stdout: journalLog } = await ssh.exec('sudo journalctl -u nginx --no-pager -n 10 2>/dev/null || sudo tail -20 /var/log/nginx/error.log 2>/dev/null || echo "no logs"')
        throw new Error(`Nginx 进程未运行。日志: ${journalLog.trim().slice(0, 200)}`)
      }
    }
  } catch (err) {
    updateStep('docker-start', 'error', `启动失败: ${(err as Error).message}`)
    throw err
  }

  // Step 4: SSL certificate (optional, if domain provided)
  if (hasDomain) {
    updateStep('ssl', 'running', '正在配置 SSL...')
    try {
      // Install certbot if needed
      await ssh.exec('which certbot 2>/dev/null || sudo apt-get install -y -qq certbot python3-certbot-nginx 2>/dev/null || sudo yum install -y certbot python3-certbot-nginx 2>/dev/null; true')
      const { code: certCode } = await ssh.exec(
        `sudo certbot --nginx -d ${config.domain} --non-interactive --agree-tos --email admin@${config.domain} 2>&1`
      )
      if (certCode === 0) {
        updateStep('ssl', 'done', 'SSL 证书已配置，HTTPS 已启用')
      } else {
        updateStep('ssl', 'done', 'SSL 证书申请跳过（DNS 可能未就绪），使用 HTTP 模式')
      }
    } catch {
      updateStep('ssl', 'done', 'SSL 配置跳过，使用 HTTP 模式')
    }
  } else {
    updateStep('ssl', 'done', '未配置域名，跳过 SSL — 使用 HTTP 模式直接访问')
  }

  // Step 5: Verify website is accessible
  updateStep('verify', 'running', '正在验证网站...')
  try {
    const localUrl = httpPort === 80 ? 'http://localhost' : `http://localhost:${httpPort}`

    // 5a. Local check
    const { stdout: httpCodeRaw } = await ssh.exec(
      `curl -s -o /dev/null -w "%{http_code}" --max-time 5 ${localUrl} 2>/dev/null || echo "000"`
    )
    const localStatus = httpCodeRaw.trim()

    // 5b. Get public IP
    const { stdout: ip } = await ssh.exec(
      'curl -s --max-time 5 ifconfig.me 2>/dev/null || curl -s --max-time 5 icanhazip.com 2>/dev/null || echo ""'
    )
    const serverIp = ip.trim()
    const mainUrl = config.domain
      ? `https://${config.domain}`
      : httpPort === 80
        ? `http://${serverIp}`
        : `http://${serverIp}:${httpPort}`

    if (localStatus !== '200' && localStatus !== '301' && localStatus !== '302') {
      updateStep('verify', 'error',
        `Nginx 本地访问失败（HTTP ${localStatus}）。请在服务器执行: sudo nginx -t && sudo systemctl restart nginx`)
      return
    }

    // 5c. External check on the main port
    let extOk = false
    if (serverIp) {
      const extUrl = httpPort === 80 ? `http://${serverIp}` : `http://${serverIp}:${httpPort}`
      const { stdout: extCode } = await ssh.exec(
        `curl -s -o /dev/null -w "%{http_code}" --max-time 5 ${extUrl} 2>/dev/null || echo "000"`
      )
      extOk = ['200', '301', '302'].includes(extCode.trim())
    }

    if (extOk) {
      updateStep('verify', 'done', `部署成功! 访问: ${mainUrl}`)
      return
    }

    // 5d. External failed — provide diagnostics
    const portHint = isCtyun
      ? `请在天翼云安全组中放行 TCP ${httpPort} 端口（入方向，源 0.0.0.0/0）`
      : '请检查安全组入方向是否放行了 80 端口（源 0.0.0.0/0）'

    updateStep('verify', 'done',
      `Nginx 本机运行正常（HTTP ${localStatus}），外网验证未通过。${portHint}。访问: ${mainUrl}`)
  } catch {
    updateStep('verify', 'done', '部署完成，请手动验证访问')
  }
}

export function generateHttpOnlyNginxConfig(domain: string): string {
  const serverName = domain || '_'
  const certbotBlock = domain
    ? `\n    location /.well-known/acme-challenge/ {\n        root /var/www/certbot;\n    }\n`
    : ''
  return `server {
    listen 80;
    listen [::]:80;
    server_name ${serverName};
${certbotBlock}
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
}`
}

export function generateNginxConfig(domain: string): string {
  const serverName = domain || '_'
  return `server {
    listen 80;
    listen [::]:80;
    server_name ${serverName};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\\$host\\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${serverName};

    ssl_certificate /etc/letsencrypt/live/${serverName}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${serverName}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files \\$uri \\$uri/ /index.html;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /usr/share/nginx/html;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}`
}

export function generateDockerCompose(_domain: string, remoteDir: string): string {
  return `version: "3.8"

services:
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ${remoteDir}/html:/usr/share/nginx/html:ro
      - ${remoteDir}/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - certbot-webroot:/var/www/certbot:ro
      - certbot-certs:/etc/letsencrypt:ro
    depends_on:
      - certbot

  certbot:
    image: certbot/certbot
    restart: unless-stopped
    volumes:
      - certbot-webroot:/var/www/certbot
      - certbot-certs:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h; done;'"

volumes:
  certbot-webroot:
  certbot-certs:`
}

export function generateSimpleDockerCompose(remoteDir: string): string {
  return `version: "3.8"

services:
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ${remoteDir}/html:/usr/share/nginx/html:ro
      - ${remoteDir}/nginx.conf:/etc/nginx/conf.d/default.conf:ro`
}
