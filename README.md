# WebForge AI — 智能网站自动生成与部署软件

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Electron](https://img.shields.io/badge/Electron-35-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Platform: Windows · macOS · Linux](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](#)

> **一句话定位**：选行业 → 上传客户资料 → AI 生成网站 → 预览编辑 → SSH 一键部署到云主机（Docker + Nginx + 自动 HTTPS）的 Electron 桌面应用。

## 快速开始

### 用户：直接下载安装

前往 [Releases](https://github.com/alecbrrayeni6295/WebForge-AI/releases) 下载最新安装包：

- Windows: `webforge-ai-x.y.z-setup.exe`
- macOS: `webforge-ai-x.y.z.dmg`
- Linux: `webforge-ai-x.y.z.AppImage`

> 首次运行可能弹出 SmartScreen / Gatekeeper 警告，因软件未购买代码签名证书。Windows 点「更多信息 → 仍要运行」即可。

### 开发者：本地运行

```bash
git clone https://github.com/alecbrrayeni6295/WebForge-AI.git
cd WebForge-AI
npm install
npm run dev
```

### 开发者：本地打包

```bash
npm run build:win      # Windows 安装包
npm run build:mac      # macOS dmg
npm run build:linux    # Linux AppImage / deb / snap
```

### 配置 AI API Key

软件首次启动后，进入「**设置**」页填写自己的 AI 服务密钥：

- Anthropic Claude API Key（[申请地址](https://console.anthropic.com/)）
- 或 OpenAI API Key（[申请地址](https://platform.openai.com/)）
- 或任何 OpenAI 兼容端点（自填 Base URL + Key）

## 项目总结（TL;DR）

### 是什么

WebForge AI 是一款基于 **Electron** 的桌面端 **AI 网站自动生成与部署工具**。它把传统建站「设计 → 开发 → 部署」三大环节压缩成一站式流程，几分钟内即可把一份客户资料转化为可访问的线上网站。

### 解决什么问题

| 用户群体 | 痛点 | WebForge AI 提供 |
|---------|------|------------------|
| 建站工作室 / 外贸服务商 | 一台一台手工建站效率低 | 批量化、模板化、AI 内容生成 |
| 数字营销代理 | 落地页迭代慢、上线流程繁琐 | 几分钟出站 + 一键部署上线 |
| 中小企业老板 | 不懂建站、外包贵 | 上传公司资料即得官网 |
| 独立开发者 | Webflow / Framer 等 SaaS 受限于厂商 | 本地化、私有化、可掌控 |

### 核心能力一览

1. **15 大行业预设**：企业、电商、教育、医疗、金融、医药、餐饮、奢侈品、摄影、游戏、美容、房产、旅游、SaaS、自定义。
2. **多模态资料输入**：PDF / Word / TXT / 图片 / URL 爬取 / 手动表单。
3. **多 AI 调度**：内置 Claude、OpenAI 适配器，并支持任意 OpenAI 兼容端点（用户自配 API Key & Base URL）。
4. **专业级设计系统**：集成 UI/UX Pro Max（**67 风格 / 96 配色 / 57 字体组合**），按行业自动匹配（金融→Glassmorphism、奢侈品→Liquid Glass、游戏→Cyberpunk……）。
5. **响应式 HTML + Tailwind CSS** 输出：自动 SEO meta、favicon、OG 图、多页面路由。
6. **预览-编辑-确认门控**：桌面 / 平板 / 手机三视口实时预览，可视化编辑文字/图片/配色，**确认无误后才会激活部署按钮**，避免误操作。
7. **多方案对比**：AI 同时生成 2-3 套不同风格方案，左右分屏选择。
8. **一键 SSH 部署**（仅支持 **Ubuntu 20.04 / 22.04 LTS**）：
   - 七项环境预检（系统版本 / 端口 / 基础软件 / Docker / DNS / 磁盘 / 端口冲突）
   - 缺失依赖自动安装（Docker CE + Compose v2、防火墙、基础工具）
   - Docker Compose 编排（Nginx 反向代理 + Certbot）
   - **Let's Encrypt 自动 HTTPS** + DNS 配置指引
   - 内嵌终端实时显示部署日志
9. **模板管理中心**：项目可保存为 `.webforge` 格式模板，支持搜索、按行业筛选、导入导出。

### 技术栈速览

```
框架: Electron 35 + electron-vite 5
前端: React 19 + TypeScript 5.9 + Tailwind CSS 4 + shadcn/ui + Radix UI
状态: Zustand   路由: React Router v7   字体: Geist Variable   图标: lucide-react
AI:   @anthropic-ai/sdk + openai
SSH:  ssh2     文档解析: pdf-parse + mammoth     打包: archiver
存储: better-sqlite3 (项目/模板/历史本地化)
分发: electron-builder (Windows / macOS / Linux)
```

### 项目特色

- **本地化 + 私有化**：所有数据本地 SQLite，AI Key 自管，适合代理商私有部署。
- **抗「AI 默认审美」**：内置专业设计系统避免千篇一律风格。
- **真·一键部署**：环境预检 + 自动修复 + 自动 SSL，用户无需懂 Linux。
- **强制确认门控**：预览编辑 → 确认 → 才能部署，防止误上线。

---

## Context

用户需要一款 一站式AI驱动的网站生成与自动部署工具。核心需求：选择行业和参数 → AI分析客户资料 → 自动生成网站 → 预览与编辑确认 → SSH连接云主机 → 环境检测与自动修复 → Docker容器化一键部署。软件以 Electron 桌面应用形式交付，集成 UI/UX Pro Max 设计系统自动生成专业网站。

## 一、软件架构总览

```
WebForge AI (Electron 桌面应用)
├── 前端 (Renderer Process) ── React + Tailwind CSS + shadcn/ui
│   ├── 项目向导 (行业选择、参数配置、风格选取)
│   ├── 客户资料上传与AI分析面板
│   ├── 实时预览器 (iframe sandbox)
│   ├── 可视化编辑器 (拖拽布局、内容修改)
│   ├── 多方案对比视图
│   ├── SSH部署控制台
│   └── 模板管理中心
│
├── 后端 (Main Process) ── Node.js
│   ├── AI 服务调度层 (多AI切换: Claude/OpenAI/自定义)
│   ├── 网站生成引擎 (HTML + Tailwind CSS 模板系统)
│   ├── 设计系统生成器 (集成 UI/UX Pro Max 规则引擎)
│   ├── SSH 连接管理器 (node-ssh / ssh2)
│   ├── Docker 部署编排器
│   ├── 环境检测与自动修复引擎
│   ├── 文档解析器 (PDF/Word/TXT/图片)
│   └── 项目/模板存储 (SQLite)
│
└── 资源层
    ├── 行业模板库 (15+ 行业预设)
    ├── UI/UX Pro Max 数据 (67样式、96配色、57字体)
    ├── Docker 部署模板 (Nginx + Certbot + 站点配置)
    └── 本地数据库 (项目记录、模板、历史)
```

## 二、核心模块设计

### 模块1：项目创建向导

**流程：** 新建项目 → 选择行业 → 配置参数 → 选择风格 → 上传资料 → AI生成

#### 1.1 行业选择 (15大类)

| 类别 | 子行业 |
|------|--------|
| 企业/商业服务 | 企业官网、咨询公司、律师事务所、会计事务所 |
| 电商/零售 | 综合电商、品牌商城、独立站 |
| 教育/培训 | 在线课程、学校官网、培训机构 |
| 医疗/健康 | 医院/诊所、健康咨询、心理健康 |
| 金融科技 | 银行、保险、投资理财、支付 |
| 医药 | 药企官网、药品展示、医药电商 |
| 餐饮 | 餐厅、外卖、连锁品牌 |
| 奢侈品 | 高端品牌、珠宝、腕表 |
| 摄影 | 摄影师作品集、摄影工作室 |
| 游戏 | 游戏官网、游戏社区、电竞 |
| 美容/SPA | 美容院、SPA、美发 |
| 房地产 | 楼盘展示、中介平台 |
| 旅游/酒店 | 旅行社、酒店预订 |
| 科技/SaaS | SaaS产品、开发者工具、AI产品 |
| 综合/自定义 | 用户自定义行业参数 |

#### 1.2 参数配置面板

```
┌─────────────────────────────────────────────┐
│  基本信息                                    │
│  ├── 项目名称: [___________]                 │
│  ├── 公司/品牌名: [___________]              │
│  └── 域名: [___________]                     │
│                                              │
│  网站类型                                    │
│  ├── ○ 单页落地页                            │
│  ├── ○ 多页面官网                            │
│  ├── ○ 电商店铺                              │
│  └── ○ 博客/新闻站                           │
│                                              │
│  页面选择 (多页面时)                          │
│  ├── ☑ 首页 (Hero + 核心业务)                │
│  ├── ☑ 关于我们                              │
│  ├── ☑ 服务/产品                             │
│  ├── ☑ 联系我们                              │
│  ├── ☐ 新闻/博客                             │
│  ├── ☐ 团队介绍                              │
│  ├── ☐ 案例展示                              │
│  ├── ☐ 价格方案                              │
│  └── ☐ FAQ                                   │
│                                              │
│  语言                                        │
│  ├── ☑ 中文                                  │
│  ├── ☐ 英文                                  │
│  └── ☐ 中英双语                              │
└─────────────────────────────────────────────┘
```

#### 1.3 风格选取 (集成 UI/UX Pro Max)

基于选定行业，自动推荐最匹配的设计风格：

| 行业 | 推荐风格 | 备选风格 |
|------|----------|----------|
| 金融科技 | Glassmorphism | Minimalism, Dark Mode |
| 医疗健康 | Soft UI (Neumorphism) | Clean Minimal, Trust & Authority |
| 电商零售 | Bento Box Grid | Feature-Rich, Conversion-Optimized |
| 教育培训 | Claymorphism | Friendly Modern, Social Proof |
| 奢侈品 | Liquid Glass | Elegant Serif, Storytelling |
| 游戏 | Cyberpunk UI | Dark Mode OLED, Interactive Demo |
| 餐饮 | Hero-Centric | Minimal & Direct, Warm Organic |
| 摄影 | Brutalism | Minimal Gallery, Full-Bleed |
| SaaS | AI-Native UI | Glassmorphism, Feature Showcase |
| 综合 | Swiss Style | Minimalism, Clean Modern |

用户可在推荐基础上自由切换67种可用风格，每种风格附带实时预览缩略图。

### 模块2：客户资料AI分析系统

#### 2.1 资料输入方式

| 方式 | 实现技术 | 提取内容 |
|------|----------|----------|
| PDF/Word/TXT | pdf-parse / mammoth.js | 公司简介、业务描述、联系方式 |
| 图片素材 | AI视觉识别 (Claude Vision) | Logo颜色提取、图片分类标签 |
| 手动填写 | 表单组件 | 结构化公司信息 |
| URL导入 | Puppeteer 爬取 | 现有网站内容、配色、结构 |

#### 2.2 AI分析流程

```
客户资料 ──→ 文档解析器 ──→ 结构化数据
                              │
                              ▼
                    ┌──────────────────┐
                    │   AI 分析引擎     │
                    │                  │
                    │ 1. 企业信息提取   │
                    │ 2. 行业特征识别   │
                    │ 3. 品牌调性分析   │
                    │ 4. 内容文案生成   │
                    │ 5. SEO关键词建议  │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ 设计系统匹配引擎  │
                    │ (UI/UX Pro Max)  │
                    │                  │
                    │ → 风格推荐       │
                    │ → 配色方案       │
                    │ → 字体搭配       │
                    │ → 布局模式       │
                    └──────────────────┘
                              │
                              ▼
                      网站内容 + 设计系统
```

#### 2.3 AI服务调度层

```typescript
// src/main/services/ai-provider.ts

interface AIProvider {
  name: string;
  analyze(content: string, prompt: string): Promise<string>;
  generateContent(context: WebsiteContext): Promise<GeneratedContent>;
}

// 支持的AI提供商
// - Claude API (Anthropic)
// - OpenAI API (GPT-4)
// - 自定义API端点 (兼容OpenAI格式)
// 用户可在设置中切换，配置API Key和Base URL
```

### 模块3：网站生成引擎

#### 3.1 生成流程

```
设计系统 + 内容数据
        │
        ▼
┌────────────────────────────────────┐
│        网站生成引擎                 │
│                                    │
│  1. 加载行业模板骨架               │
│  2. 应用设计系统 (配色/字体/样式)   │
│  3. 注入AI生成的文案内容           │
│  4. 处理客户图片素材               │
│  5. 生成响应式HTML + Tailwind CSS   │
│  6. 生成多页面路由 (如需要)         │
│  7. 优化SEO meta标签               │
│  8. 生成 favicon 和 OG图           │
└────────────────────────────────────┘
        │
        ▼
  输出: dist/ 目录
  ├── index.html
  ├── about.html
  ├── services.html
  ├── contact.html
  ├── assets/
  │   ├── css/output.css (Tailwind编译)
  │   ├── images/
  │   └── fonts/
  └── favicon.ico
```

#### 3.2 模板系统架构

每个行业模板包含：
- `layout.html` - 页面骨架 (Header/Footer/Nav)
- `sections/` - 可复用区块 (Hero, Features, Testimonials, Pricing, CTA, etc.)
- `config.json` - 行业默认配置 (推荐风格、配色、布局)

### 模块4：预览与可视化编辑（生成后确认阶段）

> **重要流程变更：** 网站生成完成后，用户必须先在预览与编辑阶段充分确认页面效果，满意后才可进入部署阶段。部署入口仅在用户明确确认页面无误后才会激活。

#### 4.1 实时预览器

- 使用 Electron BrowserView / iframe sandbox 渲染生成的HTML
- 支持桌面/平板/手机三种视口切换 (1440px / 768px / 375px)
- 修改参数后实时热更新预览

#### 4.2 可视化编辑器

- 点击页面区块高亮选中
- 侧边栏编辑面板：修改文字、替换图片、调整颜色
- 拖拽调整区块顺序
- 新增/删除区块
- 编辑操作实时反映到预览

#### 4.3 多方案对比

- AI同时生成 2-3 套不同风格方案
- 左右分屏或Tab切换对比
- 用户选择最满意方案或混合搭配

#### 4.4 确认与导出

```
┌─────────────────────────────────────────────┐
│  页面确认                                    │
│                                              │
│  用户在预览/编辑阶段反复调整，直到满意为止    │
│                                              │
│  [↓ 导出本地] — 将 dist/ 打包下载到本地      │
│                                              │
│  [✓ 确认无误，进入部署] — 激活SSH部署流程     │
│                                              │
│  ※ 部署按钮仅在用户点击"确认无误"后才可用    │
└─────────────────────────────────────────────┘
```

### 模块5：SSH部署系统

> **系统要求：** 仅支持 **Ubuntu 20.04 LTS** 和 **Ubuntu 22.04 LTS** 云主机。连接后会首先进行全面的环境检测，缺少的依赖和服务将自动安装与配置。

#### 5.1 连接配置面板

```
┌─────────────────────────────────────────────┐
│  云主机连接信息                               │
│                                              │
│  主机地址: [___________] 端口: [22____]       │
│                                              │
│  认证方式:                                    │
│  ○ 密码认证                                  │
│    用户名: [___________]                     │
│    密码:   [***********]                     │
│                                              │
│  ○ 密钥认证                                  │
│    用户名: [___________]                     │
│    私钥文件: [选择文件...]                    │
│    密钥密码: [___________] (可选)             │
│                                              │
│  域名: [www.example.com]                     │
│                                              │
│  系统要求: Ubuntu 20.04 / 22.04 LTS          │
│                                              │
│  [测试连接]  [一键部署 →]                     │
└─────────────────────────────────────────────┘
```

#### 5.2 环境预检与自动修复

连接云主机后，在执行任何部署操作之前，系统会自动进行全面的环境预检。所有检测项必须通过后才会继续部署流程，缺少的项目将自动安装与配置。

```
┌──────────────────────────────────────────────────────────┐
│  环境预检清单                                             │
│                                                          │
│  1. 系统版本检测                                         │
│     ├── 检查是否为 Ubuntu 20.04 或 22.04 LTS             │
│     └── 不支持的系统版本 → 终止部署并提示用户             │
│                                                          │
│  2. 端口开放检测                                         │
│     ├── 22   (SSH)     — 已连接即视为开放                │
│     ├── 80   (HTTP)    — 检测防火墙/安全组规则            │
│     ├── 443  (HTTPS)   — 检测防火墙/安全组规则            │
│     └── 未开放端口 → 尝试通过 ufw 自动开放               │
│                                                          │
│  3. 基础软件检测与安装                                    │
│     ├── curl / wget                                      │
│     ├── git                                              │
│     ├── unzip / tar                                      │
│     └── 缺少 → apt-get 自动安装                          │
│                                                          │
│  4. Docker 环境检测                                      │
│     ├── Docker Engine 是否安装                            │
│     ├── Docker Compose (v2 plugin) 是否安装               │
│     ├── Docker 服务是否运行 (systemctl status docker)     │
│     ├── 当前用户是否在 docker 组                          │
│     └── 缺少 → 自动安装 Docker CE + Compose 插件         │
│                                                          │
│  5. 网络与DNS检测                                        │
│     ├── 域名DNS是否已解析到该主机IP                       │
│     ├── 80/443端口外部可访问性测试                        │
│     └── 未解析 → 输出DNS配置指引，提示用户先完成解析      │
│                                                          │
│  6. 磁盘空间检测                                         │
│     ├── 检查 /opt 或部署目标分区可用空间                  │
│     └── 空间不足 (< 1GB) → 警告用户                      │
│                                                          │
│  7. 现有服务冲突检测                                      │
│     ├── 80/443 端口是否已被其他进程占用                   │
│     ├── 是否存在已运行的 Nginx/Apache 实例                │
│     └── 冲突 → 提示用户确认是否停止冲突服务               │
│                                                          │
│  检测结果展示:                                            │
│  ✅ 系统版本: Ubuntu 22.04 LTS                           │
│  ✅ 端口 22/80/443: 已开放                               │
│  ⚠️  Docker: 未安装 → 正在自动安装...                     │
│  ✅ Docker Compose: v2.21.0                              │
│  ✅ 磁盘空间: 45GB 可用                                  │
│  ❌ 域名DNS: 未解析 → 请先配置DNS A记录指向 x.x.x.x      │
│                                                          │
│  [全部通过后自动继续部署]  [查看详细日志]                  │
└──────────────────────────────────────────────────────────┘
```

#### 5.3 自动部署流程

```
用户在预览阶段确认页面无误
     │
     ▼
[进入部署] 按钮 (确认后激活)
     │
     ▼
1. SSH连接 ──→ 测试连通性
     │
     ▼
2. 系统版本验证 ──→ 必须为 Ubuntu 20.04 / 22.04 LTS
     │               不符合 → 终止并提示
     ▼
3. 环境预检 ──→ 执行全部7项检测 (见 5.2)
     │           缺少项 → 自动安装/配置
     │           无法自动修复项 → 提示用户手动处理
     │           全部通过 → 继续
     ▼
4. 上传文件 ──→ SFTP上传 dist/ 目录和Docker配置
     │          目标: /opt/webforge/{project-name}/
     ▼
5. Docker部署 ──→ 生成并上传以下文件:
     │
     │  docker-compose.yml:
     │    - nginx (反向代理 + 静态文件)
     │    - certbot (SSL自动续期)
     │
     │  nginx.conf:
     │    - server_name 自动填入域名
     │    - 静态文件服务配置
     │    - gzip压缩
     │    - 安全头部
     │
     ▼
6. SSL配置 ──→ Certbot自动申请Let's Encrypt证书
     │          自动配置HTTPS重定向
     ▼
7. 域名配置 ──→ 输出DNS解析指引
     │          配置Nginx server_name
     ▼
8. 验证 ──→ 检查网站可访问性
     │       显示部署成功 + 访问URL
     ▼
[部署完成] ✓
```

#### 5.4 部署日志终端

- 软件内嵌终端面板，实时显示部署日志
- 每个步骤显示状态：⏳ 进行中 / ✅ 完成 / ❌ 失败
- 环境预检阶段逐项显示检测与安装进度
- 失败时显示错误信息和修复建议

### 模块6：模板管理中心

- 保存当前项目为模板 (含设计系统 + 布局 + 内容结构)
- 模板列表/搜索/按行业筛选
- 从模板快速创建新项目
- 导入/导出模板文件 (.webforge 格式)

## 三、技术选型

| 层级 | 技术 | 用途 |
|------|------|------|
| 框架 | Electron + Vite | 桌面应用壳 + 快速构建 |
| 前端UI | React 18 + TypeScript | 应用界面 |
| 样式 | Tailwind CSS + shadcn/ui | 软件自身UI组件 |
| 状态管理 | Zustand | 全局状态 |
| SSH | ssh2 (Node.js) | SSH/SFTP连接 |
| 文档解析 | pdf-parse + mammoth | PDF/Word解析 |
| 网页爬取 | Puppeteer (bundled) | URL导入 |
| AI接口 | @anthropic-ai/sdk + openai | 多AI调度 |
| 数据库 | better-sqlite3 | 本地项目/模板存储 |
| 代码编辑 | Monaco Editor | 代码微调 |
| 预览 | Electron BrowserView | 实时预览 |
| 图片处理 | sharp | 图片压缩/格式转换 |

## 四、目录结构

```
webforge-ai/
├── package.json
├── electron-builder.yml          # 打包配置
├── vite.config.ts
├── tsconfig.json
│
├── src/
│   ├── main/                     # Electron 主进程
│   │   ├── index.ts              # 入口
│   │   ├── ipc/                  # IPC通信处理
│   │   │   ├── project.ts        # 项目管理IPC
│   │   │   ├── ai.ts             # AI服务IPC
│   │   │   ├── ssh.ts            # SSH连接IPC
│   │   │   └── deploy.ts         # 部署IPC
│   │   ├── services/
│   │   │   ├── ai-provider.ts    # AI服务调度
│   │   │   ├── ai-providers/
│   │   │   │   ├── claude.ts
│   │   │   │   ├── openai.ts
│   │   │   │   └── custom.ts
│   │   │   ├── site-generator.ts # 网站生成引擎
│   │   │   ├── design-system.ts  # 设计系统生成器
│   │   │   ├── ssh-manager.ts    # SSH连接管理
│   │   │   ├── env-checker.ts    # 环境预检引擎
│   │   │   ├── deployer.ts       # Docker部署编排
│   │   │   ├── doc-parser.ts     # 文档解析
│   │   │   ├── url-scraper.ts    # URL爬取
│   │   │   └── template-store.ts # 模板存储
│   │   └── database/
│   │       ├── index.ts          # SQLite初始化
│   │       └── migrations/
│   │
│   ├── renderer/                 # Electron 渲染进程 (React)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx          # 首页/项目列表
│   │   │   ├── Wizard.tsx        # 项目创建向导
│   │   │   ├── Editor.tsx        # 编辑器+预览
│   │   │   ├── Deploy.tsx        # 部署面板
│   │   │   ├── Templates.tsx     # 模板管理
│   │   │   └── Settings.tsx      # 设置 (AI/主题)
│   │   ├── components/
│   │   │   ├── wizard/
│   │   │   │   ├── IndustrySelect.tsx
│   │   │   │   ├── StylePicker.tsx
│   │   │   │   ├── PageConfig.tsx
│   │   │   │   └── MaterialUpload.tsx
│   │   │   ├── editor/
│   │   │   │   ├── Preview.tsx
│   │   │   │   ├── VisualEditor.tsx
│   │   │   │   ├── SectionList.tsx
│   │   │   │   └── PropertyPanel.tsx
│   │   │   ├── deploy/
│   │   │   │   ├── SSHConfig.tsx
│   │   │   │   ├── EnvChecker.tsx    # 环境预检面板
│   │   │   │   ├── DeployConsole.tsx
│   │   │   │   └── DeployStatus.tsx
│   │   │   └── shared/
│   │   │       ├── AIStatusBar.tsx
│   │   │       └── CompareView.tsx
│   │   ├── stores/
│   │   │   ├── project-store.ts
│   │   │   ├── ai-store.ts
│   │   │   └── deploy-store.ts
│   │   └── styles/
│   │       └── globals.css
│   │
│   ├── shared/                   # 共享类型
│   │   ├── types.ts
│   │   └── constants.ts
│   │
│   └── preload/
│       └── index.ts              # 预加载脚本
│
├── templates/                    # 网站模板库
│   ├── industries/
│   │   ├── enterprise/           # 企业官网模板
│   │   │   ├── layout.html
│   │   │   ├── sections/
│   │   │   └── config.json
│   │   ├── ecommerce/
│   │   ├── education/
│   │   ├── healthcare/
│   │   ├── fintech/
│   │   ├── restaurant/
│   │   ├── luxury/
│   │   ├── photography/
│   │   ├── gaming/
│   │   ├── beauty/
│   │   ├── realestate/
│   │   ├── travel/
│   │   ├── saas/
│   │   ├── pharma/
│   │   └── general/
│   ├── sections/                 # 通用区块库
│   │   ├── hero/
│   │   ├── features/
│   │   ├── testimonials/
│   │   ├── pricing/
│   │   ├── team/
│   │   ├── contact/
│   │   ├── faq/
│   │   ├── blog-list/
│   │   ├── gallery/
│   │   └── cta/
│   └── deploy/                   # 部署模板
│       ├── docker-compose.yml
│       ├── nginx.conf.template
│       ├── certbot-init.sh
│       └── env-check.sh          # 环境预检脚本
│
├── data/                         # UI/UX Pro Max 数据
│   ├── styles.json               # 67种设计风格
│   ├── palettes.json             # 96种配色方案
│   ├── fonts.json                # 57种字体搭配
│   ├── rules.json                # 100条行业推理规则
│   └── guidelines.json           # 99条UX指南
│
└── resources/                    # Electron 资源
    ├── icon.png
    └── splash.png
```

## 五、完整用户操作流程

```
┌──────────────────────────────────────────────────────────────┐
│                    WebForge AI 操作流程                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ① 启动软件 → 首页(项目列表)                                 │
│       │                                                      │
│       ▼                                                      │
│  ② [新建项目] → 项目创建向导                                  │
│       │                                                      │
│       ├── Step 1: 选择行业 (15大类)                           │
│       ├── Step 2: 填写基本信息 (名称/域名)                    │
│       ├── Step 3: 选择网站类型 + 页面                         │
│       ├── Step 4: 上传客户资料 (文档/图片/URL)                │
│       └── Step 5: 选择风格 (AI推荐 + 手动切换)               │
│       │                                                      │
│       ▼                                                      │
│  ③ AI分析 → 解析资料 → 生成设计系统 → 生成内容               │
│       │                                                      │
│       ▼                                                      │
│  ④ 预览 & 编辑 (必须确认后才能部署)                           │
│       ├── 多方案对比 (2-3套方案)                              │
│       ├── 选择方案                                           │
│       ├── 可视化编辑 (拖拽/修改文字/换图)                     │
│       ├── 实时预览 (桌面/平板/手机)                           │
│       ├── 反复调整直到满意                                    │
│       └── [✓ 确认无误]                                       │
│       │                                                      │
│       ▼                                                      │
│  ⑤ 确认后选择 → [导出本地] 或 [部署到云]                      │
│       │                                                      │
│       ├── 导出: 下载 dist/ 压缩包                             │
│       │                                                      │
│       └── 部署:                                              │
│            ├── Step 1: 输入SSH信息 (IP/端口/密码或密钥)       │
│            ├── Step 2: 输入域名                              │
│            ├── Step 3: [测试连接]                             │
│            ├── Step 4: 环境预检 (自动执行)                    │
│            │    ├── 验证系统版本 (Ubuntu 20.04/22.04)         │
│            │    ├── 检测端口开放 (22/80/443)                  │
│            │    ├── 检测基础软件 (curl/git/unzip)             │
│            │    ├── 检测Docker + Docker Compose               │
│            │    ├── 检测DNS解析                               │
│            │    ├── 检测磁盘空间                              │
│            │    ├── 检测服务冲突                              │
│            │    └── 缺少项 → 自动安装/配置                    │
│            ├── Step 5: [一键部署] (预检通过后激活)             │
│            │    ├── 上传网站文件                              │
│            │    ├── 启动Docker容器 (Nginx + Certbot)          │
│            │    ├── 自动配置SSL证书                           │
│            │    └── 验证网站可访问                            │
│            └── Step 6: 显示部署结果 + 访问URL                 │
│       │                                                      │
│       ▼                                                      │
│  ⑥ 可选: 保存为模板 → 模板管理中心                           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 六、实施阶段规划

### Phase 1: 基础框架 (核心骨架)
- Electron + Vite + React + TypeScript 项目初始化
- 应用布局、路由、状态管理基础搭建
- SQLite 数据库初始化
- 基础UI组件 (shadcn/ui集成)

### Phase 2: 项目向导 + 设计系统
- 行业选择组件 (15类)
- 参数配置面板
- 集成UI/UX Pro Max 数据 (样式/配色/字体/规则)
- 风格选取与预览

### Phase 3: AI分析 + 内容生成
- AI Provider 抽象层 (Claude/OpenAI/自定义)
- 文档解析器 (PDF/Word/TXT)
- 客户资料AI分析流程
- 网站文案内容生成
- URL爬取导入

### Phase 4: 网站生成引擎
- 行业模板系统 (15个行业模板)
- 通用区块库 (Hero/Features/Testimonials 等)
- HTML + Tailwind CSS 代码生成
- 多页面路由生成
- SEO优化

### Phase 5: 预览 + 编辑器 + 确认流程
- 实时预览器 (多设备视口)
- 可视化编辑器 (拖拽/修改)
- 多方案对比视图
- 页面确认机制 (确认后才可进入部署)
- 本地导出功能 (dist/ 压缩包下载)

### Phase 6: SSH部署系统
- SSH连接管理 (密码/密钥)
- 系统版本验证 (仅支持 Ubuntu 20.04 / 22.04 LTS)
- 环境预检引擎 (7项全面检测)
- 自动安装缺失依赖 (Docker/Compose/基础软件/防火墙规则)
- Docker Compose + Nginx配置生成
- SFTP文件上传
- Let's Encrypt SSL自动配置
- 部署日志终端

### Phase 7: 模板管理 + 打包
- 模板保存/加载/导出
- Electron应用打包 (Windows exe)
- 设置页面 (AI配置/主题)

## 七、验证方案

- **向导流程测试:** 完整走完 行业选择 → 参数配置 → 风格选择 → 资料上传 全流程
- **AI生成测试:** 上传示例PDF文档，验证AI分析→内容生成→设计系统匹配
- **网站生成测试:** 生成不同行业(企业/电商/教育)的网站，检查HTML/CSS质量
- **预览确认测试:** 验证编辑→预览→确认→解锁部署 的完整流程
- **环境预检测试:** 在全新Ubuntu 20.04/22.04云主机上验证预检与自动安装流程
- **部署测试:** 完整部署到云主机，验证Docker容器启动、SSL证书申请、网站可访问性

## 八、当前实现状况

> 仓库目录扫描快照（仅供参考，文件大小可侧面反映完成度）

### 主进程 services (`src/main/services/`)

| 模块 | 文件 | 大小 | 功能 |
|------|------|------|------|
| AI 调度层 | `ai-provider.ts` + `ai-providers/` | 18 KB | 多 AI Provider 抽象（Claude / OpenAI / 自定义） |
| AI 类型 | `ai-types.ts` | 2.3 KB | 共享类型定义 |
| 网站生成引擎 | `site-generator.ts` | 55 KB | 核心生成主流程 |
| 区块渲染器 | `section-renderer.ts` | 73 KB | Hero / Features / Testimonials 等区块库 |
| 设计系统生成器 | `design-system.ts` | 24 KB | UI/UX Pro Max 规则引擎 |
| 网站克隆器 | `site-cloner.ts` | 40 KB | URL 导入 / 现有站点抓取 |
| URL 爬取 | `url-scraper.ts` | 5.7 KB | Puppeteer 抓取适配 |
| 环境预检 | `env-checker.ts` | 26 KB | 七项云主机检测与自动修复 |
| 部署编排 | `deployer.ts` | 24 KB | Docker Compose / Nginx / Certbot 部署 |
| SSH 管理器 | `ssh-manager.ts` | 5.6 KB | ssh2 连接管理 / SFTP |
| 文档解析 | `doc-parser.ts` | 1.7 KB | PDF / Word / TXT 解析入口 |
| 导出器 | `exporter.ts` | 8.8 KB | 本地 dist 打包导出 |

### IPC 层 (`src/main/ipc/`)

| 文件 | 大小 | 用途 |
|------|------|------|
| `ai.ts` | 27 KB | AI 相关 IPC 通道（最重） |
| `deploy.ts` | 8.6 KB | 部署 IPC |
| `template.ts` | 3.7 KB | 模板管理 IPC |
| `project.ts` | 2.8 KB | 项目管理 IPC |
| `settings.ts` | 0.6 KB | 设置 IPC |

### 渲染进程 (`src/renderer/src/`)

```
App.tsx · main.tsx · env.d.ts
├── pages/        # 页面（Home / Wizard / Editor / Deploy / Templates / Settings）
├── components/   # 业务与通用组件
├── layouts/      # 布局
├── stores/       # Zustand 全局状态
├── hooks/        # 自定义 Hooks
├── lib/          # 工具
├── styles/       # Tailwind / 全局样式
└── assets/       # 静态资源
```

### 共享层 (`src/shared/`)

- `constants.ts`（8.8 KB）— 行业、风格、配色、字体等枚举
- `types.ts`（0.9 KB）— 跨进程共享类型

### 资源 (`templates/`、`resources/`、`data/`)

- `templates/` — 行业模板库
- `resources/` — UI/UX Pro Max 设计系统数据 / Docker 部署模板
- `data/` — 本地 SQLite 数据库及辅助数据

### 总体评估

- **后端服务层完整度高**（多个核心服务文件 20-70 KB 规模），AI 调度、网站生成、设计系统、克隆、环境预检、部署编排均已落地。
- **IPC 通道齐备**，前后端通信骨架已搭好。
- **前端目录结构标准化**（pages / components / stores / layouts / hooks / lib），按 React 19 + Tailwind 4 现代栈组织。
- 项目处于**功能基本完整、可演进**的产品级状态，适合在此基础上做行业模板扩充、AI Prompt 调优与部署稳定性打磨。

