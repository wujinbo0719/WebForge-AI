import type { SSHManager } from './ssh-manager'

export interface EnvCheckResult {
  name: string
  status: 'pass' | 'fail' | 'warning' | 'fixing'
  message: string
  autoFixable: boolean
}

export type CheckProgressCallback = (results: EnvCheckResult[]) => void

/**
 * Run all 7 environment pre-checks on the remote server.
 * Auto-fixes missing items where possible.
 */
export async function runEnvironmentChecks(
  ssh: SSHManager,
  domain: string,
  onProgress: CheckProgressCallback
): Promise<EnvCheckResult[]> {
  const results: EnvCheckResult[] = []

  function update(result: EnvCheckResult): void {
    const idx = results.findIndex((r) => r.name === result.name)
    if (idx >= 0) results[idx] = result
    else results.push(result)
    onProgress([...results])
  }

  // 1. System version check
  await checkSystemVersion(ssh, update)

  // 2. Port check
  await checkPorts(ssh, update)

  // 3. Basic software check
  await checkBasicSoftware(ssh, update)

  // 4. Docker check
  await checkDocker(ssh, update)

  // 5. DNS check
  await checkDNS(ssh, domain, update)

  // 6. Disk space check
  await checkDiskSpace(ssh, update)

  // 7. Service conflict check
  await checkServiceConflicts(ssh, update)

  return results
}

async function checkSystemVersion(
  ssh: SSHManager,
  update: (r: EnvCheckResult) => void
): Promise<void> {
  const name = '系统版本检测'
  update({ name, status: 'fixing', message: '正在检测...', autoFixable: false })

  const { stdout: distroRaw } = await ssh.exec(
    'cat /etc/os-release 2>/dev/null | grep "^ID=" | cut -d= -f2 | tr -d \'"\' || echo unknown'
  )
  const { stdout: versionRaw } = await ssh.exec(
    'cat /etc/os-release 2>/dev/null | grep "^VERSION_ID=" | cut -d= -f2 | tr -d \'"\' || echo ""'
  )
  const { stdout: prettyRaw } = await ssh.exec(
    'cat /etc/os-release 2>/dev/null | grep "^PRETTY_NAME=" | cut -d= -f2 | tr -d \'"\' || echo "Unknown OS"'
  )

  const distro = distroRaw.trim().toLowerCase()
  const version = versionRaw.trim()
  const pretty = prettyRaw.trim()

  const supported = ['ubuntu', 'debian', 'centos', 'almalinux', 'rocky', 'rhel', 'fedora', 'alinux', 'anolis']
  if (supported.includes(distro)) {
    update({ name, status: 'pass', message: pretty || `${distro} ${version}`, autoFixable: false })
  } else if (distro === 'unknown') {
    update({ name, status: 'warning', message: '无法识别操作系统，部署可能遇到问题', autoFixable: false })
  } else {
    update({ name, status: 'warning', message: `${pretty} — 未经完整测试，可能需要手动处理`, autoFixable: false })
  }
}

async function checkPorts(
  ssh: SSHManager,
  update: (r: EnvCheckResult) => void
): Promise<void> {
  const name = '端口开放检测'
  update({ name, status: 'fixing', message: '正在检测 22/80/443 端口...', autoFixable: true })

  // Check if ufw is active
  const { stdout: ufwStatus } = await ssh.exec('sudo ufw status 2>/dev/null || echo "inactive"')
  const ufwActive = ufwStatus.includes('Status: active')

  if (!ufwActive) {
    // No firewall active, ports are open by default
    update({ name, status: 'pass', message: '端口 22/80/443 可用（无防火墙限制）', autoFixable: true })
    return
  }

  // Check specific ports
  const closedPorts: number[] = []
  for (const port of [80, 443]) {
    const { stdout } = await ssh.exec(`sudo ufw status | grep "${port}" || echo "not found"`)
    if (stdout.includes('not found') || !stdout.includes('ALLOW')) {
      closedPorts.push(port)
    }
  }

  if (closedPorts.length > 0) {
    update({ name, status: 'fixing', message: `正在开放端口: ${closedPorts.join(', ')}...`, autoFixable: true })
    for (const port of closedPorts) {
      await ssh.exec(`sudo ufw allow ${port}/tcp`)
    }
    update({ name, status: 'pass', message: `端口 22/80/443 已开放`, autoFixable: true })
  } else {
    update({ name, status: 'pass', message: '端口 22/80/443 已开放', autoFixable: true })
  }
}

async function checkBasicSoftware(
  ssh: SSHManager,
  update: (r: EnvCheckResult) => void
): Promise<void> {
  const name = '基础软件检测'
  update({ name, status: 'fixing', message: '正在检测 curl/git/unzip...', autoFixable: true })

  const tools = ['curl', 'wget', 'git', 'unzip', 'tar']
  const missing: string[] = []

  for (const tool of tools) {
    const { code } = await ssh.exec(`which ${tool} 2>/dev/null`)
    if (code !== 0) missing.push(tool)
  }

  if (missing.length > 0) {
    update({ name, status: 'fixing', message: `正在安装: ${missing.join(', ')}...`, autoFixable: true })
    // Try apt first, then yum/dnf
    await ssh.exec(
      `sudo apt-get update -qq 2>/dev/null && sudo apt-get install -y -qq ${missing.join(' ')} 2>/dev/null || ` +
      `sudo yum install -y ${missing.join(' ')} 2>/dev/null || ` +
      `sudo dnf install -y ${missing.join(' ')} 2>/dev/null || true`
    )

    const stillMissing: string[] = []
    for (const tool of missing) {
      const { code } = await ssh.exec(`which ${tool} 2>/dev/null`)
      if (code !== 0) stillMissing.push(tool)
    }

    if (stillMissing.length > 0) {
      update({ name, status: 'fail', message: `安装失败: ${stillMissing.join(', ')}`, autoFixable: true })
    } else {
      update({ name, status: 'pass', message: '所有基础软件已安装', autoFixable: true })
    }
  } else {
    update({ name, status: 'pass', message: 'curl/wget/git/unzip/tar 已安装', autoFixable: true })
  }
}

async function hasComposeAvailable(ssh: SSHManager): Promise<boolean> {
  const { code: c1 } = await ssh.exec('docker compose version 2>/dev/null')
  if (c1 === 0) return true
  const { code: c2 } = await ssh.exec('docker-compose --version 2>/dev/null')
  if (c2 === 0) {
    // Standalone docker-compose exists; create symlink so `docker compose` also works
    await ssh.exec(
      'sudo mkdir -p /usr/local/lib/docker/cli-plugins 2>/dev/null; ' +
      'sudo ln -sf "$(which docker-compose)" /usr/local/lib/docker/cli-plugins/docker-compose 2>/dev/null; ' +
      'sudo mkdir -p /usr/libexec/docker/cli-plugins 2>/dev/null; ' +
      'sudo ln -sf "$(which docker-compose)" /usr/libexec/docker/cli-plugins/docker-compose 2>/dev/null; true'
    )
    return true
  }
  return false
}

async function checkDocker(
  ssh: SSHManager,
  update: (r: EnvCheckResult) => void
): Promise<void> {
  const name = 'Docker 环境检测'
  update({ name, status: 'fixing', message: '正在检测 Docker...', autoFixable: true })

  const { code: dockerCode } = await ssh.exec('docker --version 2>/dev/null')
  if (dockerCode === 0) {
    const composeOk = await hasComposeAvailable(ssh)
    if (!composeOk) {
      update({ name, status: 'fixing', message: '正在安装 Docker Compose...', autoFixable: true })
      await runDockerComposeInstallScript(ssh)
    }
    await configureDockerMirror(ssh)
    return reportDockerVersions(ssh, update, name)
  }

  // Docker not installed — write a full install script and execute it
  update({ name, status: 'fixing', message: '正在生成安装脚本并安装 Docker（可能需要几分钟）...', autoFixable: true })

  const installScript = buildDockerInstallScript()
  // Write script to remote server
  await ssh.exec(`cat > /tmp/webforge-install-docker.sh << 'WFEOF'\n${installScript}\nWFEOF`)
  await ssh.exec('chmod +x /tmp/webforge-install-docker.sh')

  // Execute with progress reporting
  update({ name, status: 'fixing', message: '正在执行安装脚本...', autoFixable: true })
  const { code, stdout, stderr } = await ssh.exec('sudo bash /tmp/webforge-install-docker.sh 2>&1')

  // Check result
  const { code: verifyCode } = await ssh.exec('docker --version 2>/dev/null')
  if (verifyCode !== 0) {
    const errLines = (stdout + '\n' + stderr).trim().split('\n')
    const lastLines = errLines.slice(-3).join(' | ')
    update({
      name,
      status: 'fail',
      message: `Docker 安装失败（exit ${code}）：${lastLines.slice(-300)}`,
      autoFixable: true
    })
    return
  }

  await configureDockerMirror(ssh)
  return reportDockerVersions(ssh, update, name)
}

function buildDockerInstallScript(): string {
  return `#!/bin/bash
# ============================================================
# WebForge AI — Docker + Docker Compose 自动安装脚本
# 自动识别系统，多镜像源递进安装，兼容国内网络环境
# ============================================================
set -e

echo "===== [1/7] 检测操作系统 ====="
if [ -f /etc/os-release ]; then
  . /etc/os-release
  DISTRO_ID="$ID"
  DISTRO_CODENAME="$VERSION_CODENAME"
  DISTRO_VERSION="$VERSION_ID"
else
  DISTRO_ID="unknown"
  DISTRO_CODENAME=""
  DISTRO_VERSION=""
fi

# Map derivative distros to their parent
case "$DISTRO_ID" in
  ubuntu) REPO_DISTRO="ubuntu" ;;
  debian) REPO_DISTRO="debian" ;;
  linuxmint|pop|elementary|zorin|neon) REPO_DISTRO="ubuntu" ;;
  centos|rhel|almalinux|rocky|anolis|alinux|opencloudos|tencentos)
    REPO_DISTRO="centos" ;;
  fedora) REPO_DISTRO="fedora" ;;
  *) REPO_DISTRO="unknown" ;;
esac

# Ensure codename exists for apt-based systems
if [ "$REPO_DISTRO" = "ubuntu" ] && [ -z "$DISTRO_CODENAME" ]; then
  case "$DISTRO_VERSION" in
    24.04*) DISTRO_CODENAME="noble" ;;
    22.04*) DISTRO_CODENAME="jammy" ;;
    20.04*) DISTRO_CODENAME="focal" ;;
    *) DISTRO_CODENAME="jammy" ;;
  esac
fi
if [ "$REPO_DISTRO" = "debian" ] && [ -z "$DISTRO_CODENAME" ]; then
  case "$DISTRO_VERSION" in
    12*) DISTRO_CODENAME="bookworm" ;;
    11*) DISTRO_CODENAME="bullseye" ;;
    *) DISTRO_CODENAME="bookworm" ;;
  esac
fi

HAS_APT=$(which apt-get 2>/dev/null && echo 1 || echo 0)
HAS_YUM=$(which yum 2>/dev/null && echo 1 || echo 0)
HAS_DNF=$(which dnf 2>/dev/null && echo 1 || echo 0)
ARCH=$(dpkg --print-architecture 2>/dev/null || uname -m)
# Normalize arch for docker repo
case "$ARCH" in
  x86_64) ARCH_DEB="amd64" ;;
  aarch64|arm64) ARCH_DEB="arm64" ;;
  *) ARCH_DEB="$ARCH" ;;
esac

echo "  系统: $DISTRO_ID $DISTRO_VERSION ($DISTRO_CODENAME)"
echo "  架构: $ARCH ($ARCH_DEB)"
echo "  仓库映射: $REPO_DISTRO"
echo ""

DOCKER_INSTALLED=0

# ============================================================
echo "===== [2/7] 方法一: 阿里云镜像源（APT）====="
if [ "$HAS_APT" = "1" ] && [ "$REPO_DISTRO" != "unknown" ] && [ "$REPO_DISTRO" != "centos" ] && [ "$REPO_DISTRO" != "fedora" ] && [ "$DOCKER_INSTALLED" = "0" ]; then
  echo "  安装前置依赖..."
  apt-get update -qq 2>/dev/null
  apt-get install -y -qq ca-certificates curl gnupg 2>/dev/null

  echo "  配置阿里云 GPG key..."
  install -m 0755 -d /etc/apt/keyrings
  MIRROR="https://mirrors.aliyun.com/docker-ce/linux/$REPO_DISTRO"

  # Test if the repo URL actually exists before using it
  echo "  测试仓库地址: $MIRROR/dists/$DISTRO_CODENAME/stable/"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$MIRROR/dists/$DISTRO_CODENAME/stable/" 2>/dev/null || echo "000")
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    curl -fsSL "$MIRROR/gpg" | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg 2>/dev/null
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$ARCH_DEB signed-by=/etc/apt/keyrings/docker.gpg] $MIRROR $DISTRO_CODENAME stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq 2>/dev/null
    if apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null; then
      DOCKER_INSTALLED=1
      echo "  ✓ 阿里云镜像安装成功"
    else
      echo "  ✗ apt install 失败，尝试下一方法"
    fi
  else
    echo "  ✗ 仓库地址返回 $HTTP_CODE，codename $DISTRO_CODENAME 不可用"

    # Try fallback codename
    FALLBACK_CODENAME="jammy"
    [ "$REPO_DISTRO" = "debian" ] && FALLBACK_CODENAME="bookworm"
    echo "  尝试回退到 $FALLBACK_CODENAME..."
    HTTP_CODE2=$(curl -s -o /dev/null -w "%{http_code}" "$MIRROR/dists/$FALLBACK_CODENAME/stable/" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE2" = "200" ] || [ "$HTTP_CODE2" = "301" ] || [ "$HTTP_CODE2" = "302" ]; then
      curl -fsSL "$MIRROR/gpg" | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg 2>/dev/null
      chmod a+r /etc/apt/keyrings/docker.gpg
      echo "deb [arch=$ARCH_DEB signed-by=/etc/apt/keyrings/docker.gpg] $MIRROR $FALLBACK_CODENAME stable" > /etc/apt/sources.list.d/docker.list
      apt-get update -qq 2>/dev/null
      if apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null; then
        DOCKER_INSTALLED=1
        echo "  ✓ 阿里云镜像（$FALLBACK_CODENAME）安装成功"
      else
        echo "  ✗ 回退 codename 也失败"
      fi
    else
      echo "  ✗ 回退 codename 也不可用（$HTTP_CODE2）"
    fi
  fi
fi

# ============================================================
echo "===== [3/7] 方法二: 阿里云镜像源（YUM/DNF）====="
if [ "$DOCKER_INSTALLED" = "0" ] && ([ "$HAS_YUM" = "1" ] || [ "$HAS_DNF" = "1" ]); then
  PM="yum"
  [ "$HAS_DNF" = "1" ] && PM="dnf"
  echo "  使用 $PM 安装..."
  $PM install -y yum-utils 2>/dev/null || true
  yum-config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo 2>/dev/null || \
  $PM config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo 2>/dev/null || true
  $PM makecache 2>/dev/null || true
  if $PM install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null; then
    DOCKER_INSTALLED=1
    echo "  ✓ YUM/DNF 安装成功"
  else
    echo "  ✗ YUM/DNF 安装失败"
  fi
fi

# ============================================================
echo "===== [4/7] 方法三: Docker 官方 APT 源 ====="
if [ "$DOCKER_INSTALLED" = "0" ] && [ "$HAS_APT" = "1" ] && [ "$REPO_DISTRO" != "unknown" ] && [ "$REPO_DISTRO" != "centos" ] && [ "$REPO_DISTRO" != "fedora" ]; then
  OFFICIAL="https://download.docker.com/linux/$REPO_DISTRO"
  CODENAME="$DISTRO_CODENAME"
  [ -z "$CODENAME" ] && CODENAME="jammy"
  HTTP_CODE3=$(curl -s -o /dev/null -w "%{http_code}" "$OFFICIAL/dists/$CODENAME/stable/" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE3" = "200" ] || [ "$HTTP_CODE3" = "301" ] || [ "$HTTP_CODE3" = "302" ]; then
    curl -fsSL "$OFFICIAL/gpg" | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg 2>/dev/null
    echo "deb [arch=$ARCH_DEB signed-by=/etc/apt/keyrings/docker.gpg] $OFFICIAL $CODENAME stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq 2>/dev/null
    if apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null; then
      DOCKER_INSTALLED=1
      echo "  ✓ Docker 官方源安装成功"
    else
      echo "  ✗ Docker 官方源 apt install 失败"
    fi
  else
    echo "  ✗ 官方源 codename $CODENAME 返回 $HTTP_CODE3"
  fi
fi

# ============================================================
echo "===== [5/7] 方法四: get.docker.com 脚本 ====="
if [ "$DOCKER_INSTALLED" = "0" ]; then
  echo "  下载安装脚本..."
  if curl -fsSL https://get.docker.com -o /tmp/get-docker.sh 2>/dev/null; then
    if sh /tmp/get-docker.sh --mirror Aliyun 2>/dev/null; then
      DOCKER_INSTALLED=1
      echo "  ✓ get.docker.com (Aliyun mirror) 安装成功"
    elif sh /tmp/get-docker.sh 2>/dev/null; then
      DOCKER_INSTALLED=1
      echo "  ✓ get.docker.com 安装成功"
    else
      echo "  ✗ get.docker.com 脚本安装失败"
    fi
    rm -f /tmp/get-docker.sh
  else
    echo "  ✗ 无法下载 get.docker.com"
  fi
fi

# ============================================================
echo "===== [6/7] 方法五: 静态二进制安装 ====="
if [ "$DOCKER_INSTALLED" = "0" ]; then
  DARCH="$(uname -m)"
  # Try a known stable version
  for DVER in "27.5.1" "27.4.1" "27.3.1" "26.1.4" "25.0.5"; do
    URL="https://download.docker.com/linux/static/stable/$DARCH/docker-$DVER.tgz"
    echo "  尝试下载 docker-$DVER ($DARCH)..."
    if curl -fsSL "$URL" -o /tmp/docker.tgz 2>/dev/null; then
      tar xzf /tmp/docker.tgz -C /tmp/
      cp /tmp/docker/* /usr/bin/ 2>/dev/null || cp /tmp/docker/* /usr/local/bin/ 2>/dev/null
      rm -rf /tmp/docker /tmp/docker.tgz

      # Create systemd service if not exists
      if [ ! -f /etc/systemd/system/docker.service ] && [ ! -f /lib/systemd/system/docker.service ]; then
        cat > /etc/systemd/system/docker.service << 'SVCEOF'
[Unit]
Description=Docker Application Container Engine
After=network-online.target
[Service]
ExecStart=/usr/bin/dockerd
ExecReload=/bin/kill -s HUP $MAINPID
Restart=on-failure
[Install]
WantedBy=multi-user.target
SVCEOF
        systemctl daemon-reload
      fi

      DOCKER_INSTALLED=1
      echo "  ✓ 二进制安装成功 (docker-$DVER)"
      break
    else
      echo "  ✗ docker-$DVER 下载失败，尝试下一版本"
    fi
  done
fi

# ============================================================
echo "===== [7/7] 启动 Docker 服务 ====="
if [ "$DOCKER_INSTALLED" = "1" ]; then
  systemctl enable docker 2>/dev/null || true
  systemctl start docker 2>/dev/null || true
  usermod -aG docker $(logname 2>/dev/null || whoami) 2>/dev/null || true
  
  # Install Docker Compose if missing
  if ! docker compose version 2>/dev/null; then
    echo "  安装 Docker Compose 插件..."
    # Try package manager first
    apt-get install -y -qq docker-compose-plugin 2>/dev/null || \
    yum install -y docker-compose-plugin 2>/dev/null || \
    dnf install -y docker-compose-plugin 2>/dev/null || true

    # If still missing, install standalone binary
    if ! docker compose version 2>/dev/null; then
      echo "  下载独立 Docker Compose 二进制..."
      COMPOSE_ARCH="$(uname -s)-$(uname -m)"
      for CVER in "v2.32.4" "v2.29.7" "v2.27.1" "v2.24.7"; do
        CURL="https://github.com/docker/compose/releases/download/$CVER/docker-compose-$COMPOSE_ARCH"
        if curl -fsSL "$CURL" -o /usr/local/bin/docker-compose 2>/dev/null; then
          chmod +x /usr/local/bin/docker-compose
          mkdir -p /usr/libexec/docker/cli-plugins 2>/dev/null || true
          ln -sf /usr/local/bin/docker-compose /usr/libexec/docker/cli-plugins/docker-compose 2>/dev/null || true
          mkdir -p /usr/local/lib/docker/cli-plugins 2>/dev/null || true
          ln -sf /usr/local/bin/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose 2>/dev/null || true
          echo "  ✓ Docker Compose $CVER 安装成功"
          break
        fi
      done
    fi
  fi

  # Configure Chinese mirror for image pulls
  mkdir -p /etc/docker
  cat > /etc/docker/daemon.json << 'DJEOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
DJEOF
  systemctl restart docker 2>/dev/null || true

  echo ""
  docker --version 2>/dev/null
  docker compose version 2>/dev/null || docker-compose version 2>/dev/null || true
  echo ""
  echo "===== 安装完成 ====="
else
  echo ""
  echo "===== 所有方法均失败 ====="
  echo "请手动安装 Docker: https://docs.docker.com/engine/install/"
  exit 1
fi`
}

async function runDockerComposeInstallScript(ssh: SSHManager): Promise<void> {
  // Method 1: package manager (fast, no network issues)
  await ssh.exec(
    'sudo apt-get update -qq 2>/dev/null; ' +
    'sudo apt-get install -y -qq docker-compose-plugin 2>/dev/null || ' +
    'sudo yum install -y docker-compose-plugin 2>/dev/null || ' +
    'sudo dnf install -y docker-compose-plugin 2>/dev/null || true'
  )

  const composeOk = await hasComposeAvailable(ssh)
  if (composeOk) return

  // Method 2: download binary from Chinese mirror first, GitHub fallback
  const downloadScript = `#!/bin/bash
COMPOSE_ARCH="$(uname -s)-$(uname -m)"
DEST="/usr/local/bin/docker-compose"

# Try multiple sources
for URL in \\
  "https://mirrors.aliyun.com/docker-toolbox/linux/compose/v2.29.7/docker-compose-$COMPOSE_ARCH" \\
  "https://get.daocloud.io/docker/compose/releases/download/v2.29.7/docker-compose-$COMPOSE_ARCH" \\
  "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-$COMPOSE_ARCH" \\
  "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-$COMPOSE_ARCH"; do
  echo "  尝试: $URL"
  if curl -fsSL --connect-timeout 10 --max-time 60 "$URL" -o "$DEST" 2>/dev/null; then
    chmod +x "$DEST"
    mkdir -p /usr/local/lib/docker/cli-plugins 2>/dev/null
    ln -sf "$DEST" /usr/local/lib/docker/cli-plugins/docker-compose 2>/dev/null
    mkdir -p /usr/libexec/docker/cli-plugins 2>/dev/null
    ln -sf "$DEST" /usr/libexec/docker/cli-plugins/docker-compose 2>/dev/null
    echo "  ✓ Docker Compose 安装成功"
    exit 0
  fi
done
echo "  ✗ 所有下载源均失败"
exit 1`

  await ssh.exec(`cat > /tmp/install-compose.sh << 'WCEOF'\n${downloadScript}\nWCEOF`)
  await ssh.exec('sudo bash /tmp/install-compose.sh 2>&1; rm -f /tmp/install-compose.sh')
}

async function configureDockerMirror(ssh: SSHManager): Promise<void> {
  await ssh.exec(
    'sudo mkdir -p /etc/docker && ' +
    'echo \'{"registry-mirrors":["https://mirror.ccs.tencentyun.com","https://docker.mirrors.ustc.edu.cn"]}\' | sudo tee /etc/docker/daemon.json > /dev/null && ' +
    'sudo systemctl restart docker 2>/dev/null || true'
  )
}

async function reportDockerVersions(
  ssh: SSHManager,
  update: (r: EnvCheckResult) => void,
  name: string
): Promise<void> {
  const { stdout: dockerVer } = await ssh.exec('docker --version 2>/dev/null')
  const { stdout: composeVer } = await ssh.exec('docker compose version 2>/dev/null || docker-compose version 2>/dev/null || echo ""')
  const dv = dockerVer.trim().split(',')[0] || 'Docker installed'
  const cv = composeVer.trim()
  update({ name, status: 'pass', message: cv ? `${dv} | ${cv}` : dv, autoFixable: true })
}

async function checkDNS(
  ssh: SSHManager,
  domain: string,
  update: (r: EnvCheckResult) => void
): Promise<void> {
  const name = '网络与DNS检测'

  if (!domain) {
    update({ name, status: 'warning', message: '未配置域名，跳过DNS检测', autoFixable: false })
    return
  }

  update({ name, status: 'fixing', message: `正在检测 ${domain} DNS解析...`, autoFixable: false })

  // Get server's public IP
  const { stdout: serverIp } = await ssh.exec('curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com')
  const ip = serverIp.trim()

  // Resolve domain
  const { stdout: dnsResult } = await ssh.exec(`dig +short ${domain} 2>/dev/null || nslookup ${domain} 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}'`)
  const resolvedIp = dnsResult.trim().split('\n').pop()?.trim()

  if (resolvedIp === ip) {
    update({ name, status: 'pass', message: `${domain} → ${ip} ✓`, autoFixable: false })
  } else if (resolvedIp) {
    update({ name, status: 'warning', message: `${domain} 解析到 ${resolvedIp}，但服务器 IP 为 ${ip}`, autoFixable: false })
  } else {
    update({ name, status: 'warning', message: `${domain} 未解析，请配置 DNS A 记录指向 ${ip}`, autoFixable: false })
  }
}

async function checkDiskSpace(
  ssh: SSHManager,
  update: (r: EnvCheckResult) => void
): Promise<void> {
  const name = '磁盘空间检测'
  update({ name, status: 'fixing', message: '正在检测磁盘空间...', autoFixable: false })

  const { stdout } = await ssh.exec("df -h /opt 2>/dev/null | tail -1 | awk '{print $4}'")
  const available = stdout.trim()

  // Parse size to GB
  let sizeGB = 0
  if (available.endsWith('G')) {
    sizeGB = parseFloat(available)
  } else if (available.endsWith('T')) {
    sizeGB = parseFloat(available) * 1024
  } else if (available.endsWith('M')) {
    sizeGB = parseFloat(available) / 1024
  }

  if (sizeGB < 1) {
    update({ name, status: 'fail', message: `可用空间不足: ${available} (需要 > 1GB)`, autoFixable: false })
  } else if (sizeGB < 5) {
    update({ name, status: 'warning', message: `可用空间: ${available}（建议 > 5GB）`, autoFixable: false })
  } else {
    update({ name, status: 'pass', message: `可用空间: ${available}`, autoFixable: false })
  }
}

async function checkServiceConflicts(
  ssh: SSHManager,
  update: (r: EnvCheckResult) => void
): Promise<void> {
  const name = '服务冲突检测'
  update({ name, status: 'fixing', message: '正在检测端口占用...', autoFixable: false })

  const conflicts: string[] = []

  // Check port 80
  const { stdout: port80 } = await ssh.exec("sudo lsof -i :80 2>/dev/null | grep LISTEN | awk '{print $1}' | head -1")
  if (port80.trim() && port80.trim() !== 'docker' && port80.trim() !== 'docker-pr') {
    conflicts.push(`80 端口被 ${port80.trim()} 占用`)
  }

  // Check port 443
  const { stdout: port443 } = await ssh.exec("sudo lsof -i :443 2>/dev/null | grep LISTEN | awk '{print $1}' | head -1")
  if (port443.trim() && port443.trim() !== 'docker' && port443.trim() !== 'docker-pr') {
    conflicts.push(`443 端口被 ${port443.trim()} 占用`)
  }

  // Check for running nginx/apache outside docker
  const { stdout: nginx } = await ssh.exec('systemctl is-active nginx 2>/dev/null')
  if (nginx.trim() === 'active') {
    conflicts.push('Nginx 服务正在运行（非 Docker）')
  }
  const { stdout: apache } = await ssh.exec('systemctl is-active apache2 2>/dev/null')
  if (apache.trim() === 'active') {
    conflicts.push('Apache 服务正在运行')
  }

  if (conflicts.length > 0) {
    update({ name, status: 'warning', message: conflicts.join('; '), autoFixable: false })
  } else {
    update({ name, status: 'pass', message: '无服务冲突', autoFixable: false })
  }
}
