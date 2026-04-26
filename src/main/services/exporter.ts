import path from 'path'
import { app, dialog, BrowserWindow } from 'electron'
import archiver from 'archiver'
import { createWriteStream, existsSync } from 'fs'
import { getDatabase } from '../database'

interface ProjectRow {
  id: string
  name: string
  industry: string
  domain?: string
  website_type: string
  status: string
  config_json?: string
  created_at: string
  updated_at: string
}

export async function exportProjectAsZip(projectId: string): Promise<{ success: boolean; error?: string }> {
  const outputDir = path.join(app.getPath('userData'), 'projects', projectId, 'dist')

  if (!existsSync(outputDir)) {
    return { success: false, error: '项目尚未生成网站文件' }
  }

  const win = BrowserWindow.getFocusedWindow()
  if (!win) return { success: false, error: '无法获取窗口' }

  const result = await dialog.showSaveDialog(win, {
    title: '导出网站',
    defaultPath: `website-${projectId.slice(0, 8)}.zip`,
    filters: [{ name: 'ZIP 压缩包', extensions: ['zip'] }]
  })

  if (result.canceled || !result.filePath) {
    return { success: false, error: '已取消' }
  }

  return new Promise((resolve) => {
    const output = createWriteStream(result.filePath!)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {
      resolve({ success: true })
    })

    archive.on('error', (err) => {
      resolve({ success: false, error: `压缩失败: ${err.message}` })
    })

    archive.pipe(output)
    archive.directory(outputDir, false)
    archive.finalize()
  })
}

export async function exportProjectFullSource(projectId: string): Promise<{ success: boolean; error?: string }> {
  const distDir = path.join(app.getPath('userData'), 'projects', projectId, 'dist')

  if (!existsSync(distDir)) {
    return { success: false, error: '项目尚未生成网站文件' }
  }

  const db = getDatabase()
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as ProjectRow | undefined
  if (!project) {
    return { success: false, error: '项目不存在' }
  }

  const win = BrowserWindow.getFocusedWindow()
  if (!win) return { success: false, error: '无法获取窗口' }

  const safeName = project.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, '_')
  const result = await dialog.showSaveDialog(win, {
    title: '导出完整源代码包',
    defaultPath: `${safeName}-source.zip`,
    filters: [{ name: 'ZIP 压缩包', extensions: ['zip'] }]
  })

  if (result.canceled || !result.filePath) {
    return { success: false, error: '已取消' }
  }

  const config = project.config_json ? JSON.parse(project.config_json) : {}

  const readme = generateProjectReadme(project, config)
  const packageJson = generatePackageJson(project)
  const dockerCompose = generateDockerComposeTemplate(project)
  const nginxConf = generateNginxTemplate(project)
  const deployScript = generateDeployScript(project)

  return new Promise((resolve) => {
    const output = createWriteStream(result.filePath!)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {
      resolve({ success: true })
    })

    archive.on('error', (err) => {
      resolve({ success: false, error: `压缩失败: ${err.message}` })
    })

    archive.pipe(output)

    archive.directory(distDir, 'dist')

    archive.append(readme, { name: 'README.md' })
    archive.append(packageJson, { name: 'package.json' })
    archive.append(JSON.stringify(config, null, 2), { name: 'webforge-config.json' })
    archive.append(dockerCompose, { name: 'deploy/docker-compose.yml' })
    archive.append(nginxConf, { name: 'deploy/nginx.conf' })
    archive.append(deployScript, { name: 'deploy/deploy.sh' })

    archive.finalize()
  })
}

function generateProjectReadme(project: ProjectRow, config: Record<string, unknown>): string {
  const domain = project.domain || 'your-domain.com'
  return `# ${project.name}

> 由 WebForge AI 自动生成的网站项目

## 项目信息

| 属性 | 值 |
|------|------|
| 行业 | ${project.industry} |
| 网站类型 | ${project.website_type} |
| 域名 | ${domain} |
| 语言 | ${Array.isArray(config.languages) ? (config.languages as string[]).join(', ') : 'zh-CN'} |
| 创建时间 | ${project.created_at} |

## 目录结构

\`\`\`
├── dist/                  # 网站静态文件（可直接部署）
│   ├── index.html         # 首页
│   ├── assets/            # CSS / 图片等资源
│   └── favicon.svg        # 网站图标
├── deploy/                # 部署配置模板
│   ├── docker-compose.yml # Docker Compose 配置
│   ├── nginx.conf         # Nginx 配置
│   └── deploy.sh          # 一键部署脚本
├── webforge-config.json   # WebForge AI 项目配置
├── package.json           # 项目描述
└── README.md              # 本文件
\`\`\`

## 本地预览

直接在浏览器中打开 \`dist/index.html\`，或使用任意静态文件服务器：

\`\`\`bash
npx serve dist
\`\`\`

## 部署到服务器

### 方式一：使用 Docker（推荐）

\`\`\`bash
cd deploy
chmod +x deploy.sh
./deploy.sh
\`\`\`

### 方式二：手动部署

1. 将 \`dist/\` 目录上传到服务器
2. 配置 Nginx 指向该目录
3. 使用 Certbot 申请 SSL 证书

## 技术说明

- 纯静态 HTML + Tailwind CSS，无需构建工具
- 使用 CDN 版本的 Tailwind CSS
- 响应式设计，适配桌面端、平板和手机
- 内置 SEO meta 标签优化
`
}

function generatePackageJson(project: ProjectRow): string {
  return JSON.stringify({
    name: project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    version: '1.0.0',
    description: `${project.name} - Generated by WebForge AI`,
    scripts: {
      serve: 'npx serve dist',
      preview: 'npx serve dist -l 3000'
    },
    keywords: [project.industry, 'website', 'webforge-ai'],
    license: 'UNLICENSED',
    private: true
  }, null, 2)
}

function generateDockerComposeTemplate(project: ProjectRow): string {
  const domain = project.domain || 'your-domain.com'
  return `version: "3.8"

services:
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ../dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
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
  certbot-certs:

# 域名: ${domain}
# 使用方法: docker compose up -d
`
}

function generateNginxTemplate(project: ProjectRow): string {
  const domain = project.domain || 'your-domain.com'
  return `server {
    listen 80;
    listen [::]:80;
    server_name ${domain};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /usr/share/nginx/html;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
`
}

function generateDeployScript(project: ProjectRow): string {
  const domain = project.domain || 'your-domain.com'
  return `#!/bin/bash
# WebForge AI 一键部署脚本
# 项目: ${project.name}
# 域名: ${domain}

set -e

echo "=============================="
echo "  WebForge AI 部署脚本"
echo "  项目: ${project.name}"
echo "=============================="

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "正在安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

if ! docker compose version &> /dev/null; then
    echo "错误: 需要 Docker Compose v2"
    exit 1
fi

echo "启动容器..."
docker compose up -d

echo ""
echo "部署完成!"
echo "HTTP:  http://${domain}"
echo ""
echo "如需申请 SSL 证书，请运行:"
echo "docker compose exec certbot certbot certonly --webroot --webroot-path=/var/www/certbot -d ${domain} --non-interactive --agree-tos --email admin@${domain}"
`
}
