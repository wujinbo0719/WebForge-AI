import { BrowserWindow, app } from 'electron'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { net } from 'electron'

export interface ClonedSection {
  tag: string
  type: string
  heading: string
  subheading: string
  content: string
  items: { title: string; description: string; icon: string; image: string }[]
  images: string[]
  bgImage: string
  bgColor: string
  textColor: string
  fonts: string[]
  hasAnimation: boolean
}

export interface ClonedSubPage {
  url: string
  title: string
  sections: ClonedSection[]
}

export interface SnapshotPage {
  id: string
  title: string
  url: string
  html: string
}

export interface ClonedPage {
  url: string
  title: string
  description: string
  screenshot?: string
  sections: ClonedSection[]
  subPages: ClonedSubPage[]
  snapshotPages: SnapshotPage[]
  navLinks: { label: string; href: string }[]
  colors: string[]
  fonts: string[]
  designTokens: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    bgColor: string
    textColor: string
    fontHeading: string
    fontBody: string
    borderRadius: string
  }
  imageUrls: string[]
}

export interface CloneProgress {
  step: string
  status: 'pending' | 'running' | 'done' | 'error'
  detail?: string
}

type ProgressCallback = (steps: CloneProgress[]) => void

const CLONE_STEPS: CloneProgress[] = [
  { step: '加载目标网页', status: 'pending' },
  { step: '滚动页面加载完整内容', status: 'pending' },
  { step: '截取页面截图', status: 'pending' },
  { step: '深度提取页面结构', status: 'pending' },
  { step: '分析设计令牌', status: 'pending' },
  { step: '抓取子页面', status: 'pending' },
  { step: '下载页面资源', status: 'pending' },
  { step: 'AI 智能分析', status: 'pending' }
]

function updateStep(
  steps: CloneProgress[],
  index: number,
  status: CloneProgress['status'],
  detail?: string
): CloneProgress[] {
  return steps.map((s, i) =>
    i === index ? { ...s, status, detail: detail ?? s.detail } : s
  )
}

export type CloneDepth = 'level1' | 'level2'

export async function cloneSite(
  url: string,
  projectId: string,
  onProgress: ProgressCallback,
  depth: CloneDepth = 'level1'
): Promise<ClonedPage> {
  const steps = [...CLONE_STEPS]
  onProgress(steps)

  const outputDir = join(app.getPath('userData'), 'projects', projectId, 'clone-assets')
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true })

  onProgress(updateStep(steps, 0, 'running', '正在加载网页...'))
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    webPreferences: {
      offscreen: true,
      nodeIntegration: false,
      contextIsolation: true,
      javascript: true,
      webSecurity: false
    }
  })

  try {
    // Step 1: Load page (with timeout protection)
    await Promise.race([
      win.loadURL(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error('homepage load timeout')), 20000))
    ]).catch(() => { /* timeout — page may still be partially loaded, continue */ })
    await new Promise((r) => setTimeout(r, 3000))
    steps[0] = { ...steps[0], status: 'done' }
    onProgress([...steps])

    // Step 2: Scroll to trigger lazy loading
    onProgress(updateStep(steps, 1, 'running', '正在滚动页面加载所有内容...'))
    await win.webContents.executeJavaScript(getScrollScript())
    steps[1] = { ...steps[1], status: 'done' }
    onProgress([...steps])

    // Step 3: Extract page structure FIRST (before snapshot modifies DOM)
    onProgress(updateStep(steps, 2, 'running', '正在提取页面结构...'))
    const extracted = await win.webContents.executeJavaScript(getExtractionScript())
    steps[2] = { ...steps[2], status: 'done', detail: `发现 ${extracted.sections?.length ?? 0} 个区块, ${(extracted.bodyLinks?.length ?? 0) + (extracted.navLinks?.length ?? 0)} 个链接` }
    onProgress([...steps])

    // Step 4: Capture full HTML snapshot (this modifies DOM — must be after extract)
    onProgress(updateStep(steps, 3, 'running', '正在捕获页面快照...'))
    const homeSnapshot = await Promise.race([
      win.webContents.executeJavaScript(getSnapshotScript()),
      new Promise<string>((resolve) => setTimeout(() => resolve(''), 30000))
    ])
    let screenshotPath = ''
    try {
      const img = await win.webContents.capturePage()
      screenshotPath = join(outputDir, 'screenshot.png')
      writeFileSync(screenshotPath, img.toPNG())
    } catch { /* skip */ }
    steps[3] = { ...steps[3], status: 'done' }
    onProgress([...steps])

    // Step 5: Design tokens
    onProgress(updateStep(steps, 4, 'running', '正在提取设计令牌...'))
    const tokens = await win.webContents.executeJavaScript(getDesignTokenScript())
    steps[4] = { ...steps[4], status: 'done', detail: `${tokens.colors?.length ?? 0} 种颜色, ${tokens.fonts?.length ?? 0} 种字体` }
    onProgress([...steps])

    // Step 6: Crawl sub-pages + capture snapshots
    onProgress(updateStep(steps, 5, 'running', '正在抓取子页面...'))
    const subPages: ClonedSubPage[] = []
    const snapshotPages: SnapshotPage[] = []
    const baseObj = new URL(url)
    const currentFullUrl = baseObj.href

    // Home page snapshot
    snapshotPages.push({
      id: 'home',
      title: extracted.title || 'Home',
      url,
      html: homeSnapshot || ''
    })

    // Collect ALL same-domain links from homepage (nav + body)
    const allHomeLinks = [...(extracted.navLinks ?? []), ...(extracted.bodyLinks ?? [])] as { href: string; label: string }[]

    function normalizeUrl(u: string): string {
      try { const o = new URL(u); return (o.origin + o.pathname).replace(/\/$/, '') } catch { return u.replace(/\/$/, '') }
    }

    function resolveLink(href: string, refUrl: string): { label: string; fullUrl: string; norm: string } | null {
      try {
        const resolved = new URL(href, refUrl)
        if (resolved.hostname !== baseObj.hostname) return null
        const full = resolved.origin + resolved.pathname
        const norm = normalizeUrl(full)
        return { label: '', fullUrl: full, norm }
      } catch { return null }
    }

    const visitedNorm = new Set<string>([normalizeUrl(currentFullUrl)])

    const urlToFile = new Map<string, string>()
    urlToFile.set(currentFullUrl, 'index.html')
    urlToFile.set(normalizeUrl(currentFullUrl), 'index.html')

    let pageCounter = 0
    function makePageId(label: string): string {
      pageCounter++
      const base = label.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '-').replace(/-+/g, '-').slice(0, 25)
      return base ? `${base}-${pageCounter}` : `page-${pageCounter}`
    }

    // Deduplicate homepage links
    const l1Candidates: { label: string; fullUrl: string; norm: string }[] = []
    const l1Seen = new Set<string>()
    for (const n of allHomeLinks) {
      const r = resolveLink(n.href, url)
      if (!r || visitedNorm.has(r.norm) || l1Seen.has(r.norm)) continue
      l1Seen.add(r.norm)
      l1Candidates.push({ label: n.label || r.fullUrl.split('/').pop() || '', fullUrl: r.fullUrl, norm: r.norm })
    }

    let failCount = 0

    async function capturePage(pageUrl: string, label: string): Promise<{ bodyLinks: { href: string; label: string }[] }> {
      const norm = normalizeUrl(pageUrl)
      if (visitedNorm.has(norm)) return { bodyLinks: [] }
      visitedNorm.add(norm)

      try {
        onProgress(updateStep(steps, 5, 'running', `正在抓取: ${label} (已完成 ${snapshotPages.length}, 失败 ${failCount})...`))

        // Navigate with timeout — loadURL can hang indefinitely
        try {
          await Promise.race([
            win.loadURL(pageUrl),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
          ])
        } catch (navErr) {
          const msg = (navErr as Error).message
          if (msg !== 'timeout') console.log(`[clone] loadURL 失败: ${pageUrl} -> ${msg}`)
          else console.log(`[clone] 加载超时: ${pageUrl}`)
          failCount++
          // Try to stop the pending navigation
          try { win.webContents.stop() } catch { /* ignore */ }
          return { bodyLinks: [] }
        }

        // Wait for dynamic content to render
        await new Promise((r) => setTimeout(r, 2000))

        // Scroll to load lazy content (timeout 10s)
        try {
          await Promise.race([
            win.webContents.executeJavaScript(getScrollScript(true)),
            new Promise((r) => setTimeout(r, 10000))
          ])
        } catch { /* scroll failed, continue */ }

        // Extract structure first (timeout 10s)
        let ext: { title?: string; bodyLinks?: { href: string; label: string }[]; navLinks?: { href: string; label: string }[]; imageUrls?: string[] }
        try {
          ext = await Promise.race([
            win.webContents.executeJavaScript(getExtractionScript()),
            new Promise<Record<string, never>>((r) => setTimeout(() => r({}), 10000))
          ])
        } catch {
          ext = {}
        }

        // Then capture snapshot (with timeout — fetch CSS can hang)
        let snap = ''
        try {
          snap = await Promise.race([
            win.webContents.executeJavaScript(getSnapshotScript()),
            new Promise<string>((resolve) => setTimeout(() => resolve(''), 30000))
          ])
        } catch {
          console.log(`[clone] 快照失败: ${pageUrl}`)
        }

        const pid = makePageId(label)
        const filename = `${pid}.html`

        if (snap && snap.length > 200) {
          snapshotPages.push({ id: pid, title: ext.title || label, url: pageUrl, html: snap })
          urlToFile.set(pageUrl, filename)
          urlToFile.set(norm, filename)
          urlToFile.set(norm + '/', filename)
          try {
            const pn = new URL(pageUrl).pathname
            if (pn && pn !== '/') {
              urlToFile.set(pn, filename)
              urlToFile.set(pn.replace(/\/$/, ''), filename)
            }
          } catch { /* skip */ }
          console.log(`[clone] 成功: ${pageUrl} -> ${filename} (${snap.length} bytes)`)
        } else {
          console.log(`[clone] 快照太小或为空: ${pageUrl} (${snap.length} bytes)`)
          failCount++
        }

        return { bodyLinks: [...(ext.bodyLinks ?? []), ...(ext.navLinks ?? [])] as { href: string; label: string }[] }
      } catch (err) {
        console.log(`[clone] 抓取异常: ${pageUrl} -> ${(err as Error).message}`)
        failCount++
        return { bodyLinks: [] }
      }
    }

    // BFS queue: start with all homepage links
    const queue = [...l1Candidates]
    let queueIdx = 0

    console.log(`[clone] 首页提取到 navLinks=${extracted.navLinks?.length ?? 0}, bodyLinks=${extracted.bodyLinks?.length ?? 0}, 去重后候选=${l1Candidates.length}`)
    if (l1Candidates.length > 0) {
      console.log(`[clone] 前5个候选: ${l1Candidates.slice(0, 5).map(c => `${c.label}(${c.fullUrl})`).join(' | ')}`)
    }
    if (l1Candidates.length === 0 && (extracted.bodyLinks?.length ?? 0) > 0) {
      console.log(`[clone] 警告: bodyLinks有 ${extracted.bodyLinks.length} 个但候选为0! 前3个href: ${extracted.bodyLinks.slice(0, 3).map((b: {href:string}) => b.href).join(' | ')}`)
    }

    onProgress(updateStep(steps, 5, 'running', `发现 ${l1Candidates.length} 个子页面链接，开始抓取...`))

    console.log(`[clone] 开始BFS循环, 队列长度=${queue.length}`)
    while (queueIdx < queue.length) {
      const link = queue[queueIdx++]
      console.log(`[clone] 循环 ${queueIdx}/${queue.length}: ${link.label} (${link.fullUrl})`)
      const { bodyLinks } = await capturePage(link.fullUrl, link.label)

      // In level2 mode, add newly discovered links to the queue (do NOT mark as visited yet)
      if (depth === 'level2' && bodyLinks.length > 0) {
        let added = 0
        const queuedNorms = new Set(queue.map(q => q.norm))
        for (const n of bodyLinks) {
          const r = resolveLink(n.href, link.fullUrl)
          if (!r || queuedNorms.has(r.norm) || visitedNorm.has(r.norm)) continue
          queue.push({ label: n.label || r.fullUrl.split('/').pop() || '', fullUrl: r.fullUrl, norm: r.norm })
          queuedNorms.add(r.norm)
          added++
        }
        if (added > 0) console.log(`[clone] ${link.label} -> 新增 ${added} 个二级链接`)
      }

      onProgress(updateStep(steps, 5, 'running', `已抓取 ${snapshotPages.length} 个页面，队列剩余 ${queue.length - queueIdx}...`))
    }

    console.log(`[clone] 抓取完成: ${snapshotPages.length} 个快照, ${urlToFile.size} 个URL映射`)

    // Build comprehensive lookup for URL → local file
    // Normalize URLs: strip trailing slash, query, hash for matching
    const linkLookup = new Map<string, string>()
    for (const [originalUrl, localFile] of urlToFile.entries()) {
      try {
        const u = new URL(originalUrl)
        const variants = [
          u.href,
          u.origin + u.pathname,
          u.origin + u.pathname.replace(/\/$/, ''),
          u.origin + u.pathname + '/',
          u.pathname,
          u.pathname.replace(/\/$/, ''),
        ]
        for (const v of variants) {
          if (v && v !== '/' && v !== '') linkLookup.set(v, localFile)
        }
      } catch { /* skip */ }
    }

    // Rewrite all href="..." in every snapshot
    let totalRewrites = 0
    for (const sp of snapshotPages) {
      sp.html = sp.html.replace(/href=(["'])([^"']+)\1/g, (_match, quote, href) => {
        // Skip anchors, js, mail, tel
        if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
          return _match
        }

        // Try to match against our lookup
        let localFile: string | undefined

        // Direct match
        localFile = linkLookup.get(href)
        if (!localFile) localFile = linkLookup.get(href.replace(/\/$/, ''))
        if (!localFile) localFile = linkLookup.get(href + '/')

        // Try pathname match for absolute URLs
        if (!localFile) {
          try {
            const u = new URL(href)
            if (u.hostname === baseObj.hostname) {
              localFile = linkLookup.get(u.pathname) || linkLookup.get(u.pathname.replace(/\/$/, ''))
            }
          } catch { /* not a valid URL */ }
        }

        if (localFile) {
          // Don't rewrite self-links
          const selfFile = sp.id === 'home' ? 'index.html' : `${sp.id}.html`
          if (localFile === selfFile) return _match
          totalRewrites++
          return `href=${quote}${localFile}${quote}`
        }

        return _match
      })
    }

    steps[5] = { ...steps[5], status: 'done', detail: `抓取了 ${snapshotPages.length} 个页面，重写了 ${totalRewrites} 个链接` }
    onProgress([...steps])

    // Step 7: Download images
    onProgress(updateStep(steps, 6, 'running', '正在下载资源...'))
    const allImageUrls: string[] = [...new Set((extracted.imageUrls ?? []) as string[])].slice(0, 80)
    const downloadedImages: string[] = []
    for (const imgUrl of allImageUrls) {
      try {
        const resolved = resolveUrl(imgUrl, url)
        const filename = sanitizeFilename(basename(new URL(resolved).pathname) || `img_${downloadedImages.length}.png`)
        if (downloadedImages.includes(filename)) continue
        const localPath = join(outputDir, filename)
        await downloadFile(resolved, localPath)
        downloadedImages.push(filename)
        if (downloadedImages.length % 10 === 0) {
          onProgress(updateStep(steps, 6, 'running', `已下载 ${downloadedImages.length} 个资源...`))
        }
      } catch { /* skip */ }
    }
    steps[6] = { ...steps[6], status: 'done', detail: `下载了 ${downloadedImages.length} 个资源` }
    onProgress([...steps])

    steps[7] = { ...steps[7], status: 'pending' }
    onProgress([...steps])

    return {
      url,
      title: extracted.title ?? '',
      description: extracted.description ?? '',
      screenshot: screenshotPath,
      sections: extracted.sections ?? [],
      subPages,
      snapshotPages,
      navLinks: extracted.navLinks ?? [],
      colors: tokens.colors ?? [],
      fonts: tokens.fonts ?? [],
      designTokens: tokens.designTokens ?? {
        primaryColor: '#3b82f6', secondaryColor: '#1e40af', accentColor: '#8b5cf6',
        bgColor: '#ffffff', textColor: '#1a1a2e',
        fontHeading: 'system-ui', fontBody: 'system-ui', borderRadius: '8px'
      },
      imageUrls: downloadedImages
    }
  } finally {
    win.destroy()
  }
}

function getSnapshotScript(): string {
  return `(async function() {
    try {
      const base = document.baseURI;
      const origin = new URL(base).origin;

      function absUrl(u, refBase) {
        if (!u || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('#')) return u;
        if (u.startsWith('//')) return location.protocol + u;
        if (u.startsWith('http')) return u;
        try { return new URL(u, refBase || base).href; } catch { return u; }
      }

      // 1. Resolve URLs in DOM elements
      document.querySelectorAll('[src],[data-src],[data-original],[poster],[href]').forEach(el => {
        ['src','data-src','data-original','poster'].forEach(a => {
          const v = el.getAttribute(a);
          if (v) el.setAttribute(a, absUrl(v));
        });
        if (el.tagName === 'A') {
          const h = el.getAttribute('href');
          if (h && !h.startsWith('#') && !h.startsWith('javascript:') && !h.startsWith('mailto:') && !h.startsWith('tel:')) {
            el.setAttribute('href', absUrl(h));
          }
        }
      });
      document.querySelectorAll('[style]').forEach(el => {
        const s = el.getAttribute('style');
        if (s && s.includes('url(')) {
          el.setAttribute('style', s.replace(/url\\((['"]?)([^'"\\)]+)\\1\\)/g, (m,q,u) => 'url(' + q + absUrl(u) + q + ')'));
        }
      });
      document.querySelectorAll('[srcset]').forEach(el => {
        const ss = el.getAttribute('srcset');
        if (ss) el.setAttribute('srcset', ss.split(',').map(s => { const p=s.trim().split(/\\s+/); p[0]=absUrl(p[0]); return p.join(' '); }).join(', '));
      });

      // 2. Download ALL external CSS with per-request timeout
      const cssTexts = [];
      const linkEls = document.querySelectorAll('link[rel="stylesheet"]');
      for (const link of linkEls) {
        const href = absUrl(link.getAttribute('href'));
        if (!href) continue;
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 5000);
          const r = await fetch(href, { signal: ctrl.signal });
          clearTimeout(timer);
          if (r.ok) {
            let t = await r.text();
            t = t.replace(/url\\((['"]?)([^'"\\)]+)\\1\\)/g, (m,q,u) => 'url(' + q + absUrl(u, href) + q + ')');
            cssTexts.push('/* ' + href.split('/').pop() + ' */\\n' + t);
          }
        } catch {}
      }

      // 3. Inline <style> blocks + CSSOM JS-injected styles
      document.querySelectorAll('style').forEach(s => {
        let t = s.textContent || '';
        if (t.trim()) {
          t = t.replace(/url\\((['"]?)([^'"\\)]+)\\1\\)/g, (m,q,u) => 'url(' + q + absUrl(u) + q + ')');
          cssTexts.push(t);
        }
      });
      for (const sheet of document.styleSheets) {
        try {
          if (!sheet.href && sheet.ownerNode && sheet.ownerNode.tagName !== 'STYLE') {
            const rules = []; for (const r of sheet.cssRules) rules.push(r.cssText);
            if (rules.length) cssTexts.push(rules.join('\\n'));
          }
        } catch {}
      }

      // 4. Collect <script> tags for dynamic content (animations, carousels, etc.)
      const scripts = [];
      document.querySelectorAll('script').forEach(s => {
        const src = s.getAttribute('src');
        if (src) {
          const absSrc = absUrl(src);
          // Skip analytics/tracking scripts
          if (/analytics|gtag|google-analytics|baidu.*hm\\.js|cnzz|hotjar|facebook|twitter/i.test(absSrc)) return;
          scripts.push('<script src="' + absSrc + '"><\\/script>');
        } else {
          const code = s.textContent || '';
          if (code.trim() && !/gtag|analytics|hm\\.src|cnzz/i.test(code)) {
            scripts.push('<script>' + code + '<\\/script>');
          }
        }
      });

      // 5. Build self-contained HTML
      const body = document.body.outerHTML;
      return '<!-- webforge-snapshot -->\\n<!DOCTYPE html>\\n<html lang="' + (document.documentElement.lang || 'zh-CN') + '">\\n<head>\\n'
        + '<meta charset="UTF-8">\\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\\n'
        + '<title>' + (document.title || '').replace(/</g,'&lt;') + '</title>\\n'
        + '<style>\\n' + cssTexts.join('\\n') + '\\n</style>\\n'
        + '</head>\\n'
        + body + '\\n'
        + scripts.join('\\n') + '\\n'
        + '</html>';
    } catch (e) {
      return '';
    }
  })()`
}

function getScrollScript(fast = false): string {
  const delay = fast ? 250 : 400
  const endPause = fast ? 600 : 1200
  return `(async function() {
    const step = Math.max(300, window.innerHeight * 0.7);
    const getMax = () => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    let y = 0;
    let prevMax = 0;
    for (let pass = 0; pass < 3; pass++) {
      const max = getMax();
      if (max === prevMax && pass > 0) break;
      prevMax = max;
      while (y < max) {
        y += step;
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, ${delay}));
      }
      await new Promise(r => setTimeout(r, 500));
    }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, ${endPause}));
  })()`
}

function getExtractionScript(): string {
  return `(function() {
    const title = document.title || '';
    const metaDesc = document.querySelector('meta[name="description"]');
    const description = metaDesc ? metaDesc.getAttribute('content') || '' : '';

    // ── Nav links: scan everywhere, not just nav/header ──
    const navLinks = [];
    const navSeen = new Set();
    const allAnchors = document.querySelectorAll(
      'nav a, header a, footer a, aside a, .navbar a, .navigation a, .menu a, ' +
      '[role="navigation"] a, .nav a, .header a, .footer a, .sidebar a, ' +
      '[class*="menu"] a, [class*="nav"] a'
    );
    allAnchors.forEach(a => {
      const label = (a.textContent || '').trim().replace(/\\s+/g, ' ');
      const href = a.getAttribute('href') || '';
      const key = label + '|' + href;
      if (label && label.length > 0 && label.length < 80 && !navSeen.has(key)
          && !/^(javascript:|#|tel:|mailto:)/.test(href)
          && href.length > 0) {
        navSeen.add(key);
        navLinks.push({ label, href });
      }
    });

    // ── Section detection: multi-strategy ──
    const sections = [];
    const processedEls = new Set();

    // Strategy 1: semantic elements
    let candidates = document.querySelectorAll(
      'section, article, header, footer, [role="main"] > *, [role="banner"], ' +
      'main > *, .hero, .banner, .features, .services, .about, .contact, ' +
      '.testimonials, .pricing, .faq, .team, .gallery, .cta, .footer-section, ' +
      '[class*="section"], [class*="block"], [class*="module"], [class*="panel"]'
    );

    // Strategy 2: if too few, go deeper
    if (candidates.length < 3) {
      candidates = document.querySelectorAll(
        'body > *, body > div > *, #app > *, #app > div > *, #root > *, #root > div > *, ' +
        '.wrapper > *, .page > *, .content > *, #content > *, .main > *, ' +
        '.wrapper > div > *, .page > div > *, #__next > *, #__next > div > *'
      );
    }

    candidates.forEach((el, idx) => {
      if (processedEls.has(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.height < 30 || rect.width < 150) return;
      processedEls.add(el);

      const cs = getComputedStyle(el);
      const heading = el.querySelector('h1, h2, h3, [class*="heading"], [class*="title"]:not(a):not(title)');
      let subheading = el.querySelector('.subtitle, .subheading, .sub-title, .lead, .tagline, [class*="subtitle"], [class*="subhead"], [class*="slogan"]');
      if (!subheading && heading) {
        const next = heading.nextElementSibling;
        if (next && (next.tagName === 'P' || next.tagName === 'SPAN' || next.tagName === 'DIV')) subheading = next;
      }

      // Text content
      const contentTexts = [];
      el.querySelectorAll('p, li, dd, blockquote, .text, [class*="desc"], [class*="content"], [class*="intro"], [class*="summary"]').forEach(p => {
        const t = (p.textContent || '').trim().replace(/\\s+/g, ' ');
        if (t && t.length > 3 && t.length < 1000 && !contentTexts.includes(t)) contentTexts.push(t);
      });

      // Items/cards — very broad selectors
      const items = [];
      const itemSeen = new Set();
      el.querySelectorAll(
        '.card, .feature, .service, .item, .col, .grid-item, .list-item, ' +
        '.benefit, .advantage, .team-member, .member, .plan, .package, ' +
        '.testimonial, .review, .project, .work, .portfolio-item, .product, ' +
        '[class*="card"], [class*="feature"], [class*="item"], [class*="col-"], ' +
        '[class*="service"], [class*="benefit"], [class*="member"], [class*="plan"], ' +
        '[class*="testimonial"], [class*="review"], [class*="product"], [class*="grid-"]'
      ).forEach(card => {
        if (itemSeen.has(card)) return;
        itemSeen.add(card);
        const cRect = card.getBoundingClientRect();
        if (cRect.height < 20 || cRect.width < 60) return;

        const cardTitle = card.querySelector('h2, h3, h4, h5, h6, .title, .name, [class*="title"], [class*="name"]:not(input)');
        const cardDesc = card.querySelector('p, .description, .desc, .text, .excerpt, .summary, [class*="desc"], [class*="text"], [class*="intro"]');
        const cardImg = card.querySelector('img, picture img, figure img');
        const cardBg = getComputedStyle(card).backgroundImage;

        let cardImage = '';
        if (cardImg) {
          cardImage = cardImg.getAttribute('src') || cardImg.getAttribute('data-src') || '';
          if (cardImage && !cardImage.startsWith('data:') && !cardImage.startsWith('http')) {
            try { cardImage = new URL(cardImage, document.baseURI).href; } catch {}
          }
          if (cardImage.startsWith('data:')) cardImage = '';
        }
        if (!cardImage && cardBg && cardBg !== 'none') {
          const m = cardBg.match(/url\\(['"]?([^'"\\)]+)['"]?\\)/);
          if (m && m[1] && !m[1].startsWith('data:')) {
            try { cardImage = new URL(m[1], document.baseURI).href; } catch { cardImage = m[1]; }
          }
        }

        const titleText = cardTitle ? (cardTitle.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 150) : '';
        const descText = cardDesc ? (cardDesc.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 500) : '';

        if (titleText || descText || cardImage) {
          items.push({ title: titleText, description: descText, icon: '', image: cardImage });
        }
      });

      // Images: <img>, <picture>, data-src, CSS bg
      const images = [];
      const imgSeen = new Set();
      el.querySelectorAll('img, picture source').forEach(imgEl => {
        const src = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-original') || (imgEl.getAttribute('srcset') || '').split(' ')[0] || '';
        if (src && !src.startsWith('data:') && src.length > 5 && !imgSeen.has(src)) {
          imgSeen.add(src);
          try { images.push(new URL(src, document.baseURI).href); } catch { images.push(src); }
        }
      });
      [el, ...Array.from(el.querySelectorAll('div, figure, span, a, li')).slice(0, 50)].forEach(bgEl => {
        try {
          const bgStyle = getComputedStyle(bgEl).backgroundImage;
          if (bgStyle && bgStyle !== 'none') {
            for (const m of bgStyle.matchAll(/url\\(['"]?([^'"\\)]+)['"]?\\)/g)) {
              if (m[1] && !m[1].startsWith('data:') && !imgSeen.has(m[1])) {
                imgSeen.add(m[1]);
                try { images.push(new URL(m[1], document.baseURI).href); } catch { images.push(m[1]); }
              }
            }
          }
        } catch {}
      });

      // Section type detection
      const classStr = ((el.className || '') + ' ' + (el.id || '') + ' ' + (el.getAttribute('data-section') || '')).toLowerCase();
      const headingText = (heading ? heading.textContent || '' : '').toLowerCase();
      let type = 'content';

      if (idx === 0 || /hero|banner|jumbotron|masthead|splash|intro-section|main-visual|slider|swiper|carousel/.test(classStr)) type = 'hero';
      else if (/feature|advantage|benefit|highlight|why-us|why-choose|strength/.test(classStr) || /优势|特色|特点|why|核心/.test(headingText)) type = 'features';
      else if (/service|product|offering|solution|what-we|业务/.test(classStr) || /服务|产品|方案|解决|业务|布局/.test(headingText)) type = 'services';
      else if (/about|company|intro|who-we|story|history|mission/.test(classStr) || /关于|公司|简介|介绍/.test(headingText)) type = 'about';
      else if (/contact|form|get-in-touch|reach|inquiry/.test(classStr) || /联系|咨询|留言/.test(headingText)) type = 'contact';
      else if (/testimonial|review|quote|feedback|client-say|customer/.test(classStr) || /评价|客户|反馈|见证/.test(headingText)) type = 'testimonials';
      else if (/pric|plan|package|cost|subscription/.test(classStr) || /价格|套餐|方案|订阅/.test(headingText)) type = 'pricing';
      else if (/faq|question|accordion|qa|help/.test(classStr) || /常见问题|FAQ|问答|帮助/.test(headingText)) type = 'faq';
      else if (/team|member|staff|people|expert|founder/.test(classStr) || /团队|成员|专家|创始/.test(headingText)) type = 'team';
      else if (/gallery|portfolio|showcase|work|case|project/.test(classStr) || /案例|作品|展示|项目/.test(headingText)) type = 'gallery';
      else if (/cta|call-to-action|action|subscribe|signup|register/.test(classStr)) type = 'cta';
      else if (/blog|post|article|news|insight|resource/.test(classStr) || /新闻|文章|资讯|博客|动态|活动/.test(headingText)) type = 'blog-list';
      else if (/footer|foot/.test(classStr)) type = 'contact';
      else if (items.length >= 3) type = 'features';

      const hasAnimation = /animate|aos|wow|motion|gsap|lottie|framer|reveal|parallax|swiper|slide|fade/.test(classStr)
        || (cs.animation && cs.animation !== 'none')
        || (cs.transition && !/^(all 0s|none 0s)/.test(cs.transition));

      let bgImage = '';
      const bgStyleVal = cs.backgroundImage;
      if (bgStyleVal && bgStyleVal !== 'none') {
        const bgMatch = bgStyleVal.match(/url\\(['"]?([^'"\\)]+)['"]?\\)/);
        if (bgMatch && bgMatch[1] && !bgMatch[1].startsWith('data:')) {
          try { bgImage = new URL(bgMatch[1], document.baseURI).href; } catch { bgImage = bgMatch[1]; }
        }
      }

      sections.push({
        tag: el.tagName,
        type,
        heading: heading ? (heading.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 200) : '',
        subheading: subheading ? (subheading.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 300) : '',
        content: contentTexts.slice(0, 15).join('\\n'),
        items: items.slice(0, 15),
        images: [...new Set(images)].slice(0, 12),
        bgImage,
        bgColor: cs.backgroundColor || '',
        textColor: cs.color || '',
        fonts: [cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim()].filter(Boolean),
        hasAnimation
      });
    });

    // Global images
    const imageUrls = [];
    const gImgSeen = new Set();
    document.querySelectorAll('img, picture source').forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-original') || (img.getAttribute('srcset') || '').split(' ')[0] || '';
      if (src && !src.startsWith('data:') && src.length > 5 && !gImgSeen.has(src)) {
        gImgSeen.add(src);
        try { imageUrls.push(new URL(src, document.baseURI).href); } catch { imageUrls.push(src); }
      }
    });
    document.querySelectorAll('*').forEach(el => {
      try {
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg !== 'none') {
          for (const m of bg.matchAll(/url\\(['"]?([^'"\\)]+)['"]?\\)/g)) {
            if (m[1] && !m[1].startsWith('data:') && !gImgSeen.has(m[1])) {
              gImgSeen.add(m[1]);
              try { imageUrls.push(new URL(m[1], document.baseURI).href); } catch { imageUrls.push(m[1]); }
            }
          }
        }
      } catch {}
    });

    // Collect ALL internal links from the entire page
    const bodyLinks = [];
    const blSeen = new Set();
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('data:')) return;
      if (blSeen.has(href)) return;
      blSeen.add(href);
      const label = (a.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80)
        || a.getAttribute('title') || a.getAttribute('aria-label')
        || href.split('/').filter(Boolean).pop() || '';
      bodyLinks.push({ label, href });
    });

    return {
      title, description,
      sections: sections.filter(s => s.heading || s.content || s.items.length > 0 || s.images.length > 0 || s.bgImage),
      navLinks: navLinks.slice(0, 30),
      bodyLinks: bodyLinks.slice(0, 100),
      imageUrls: imageUrls.slice(0, 80)
    };
  })()`
}

function getDesignTokenScript(): string {
  return `(function() {
    const colorCounts = {};
    const fonts = new Set();
    document.querySelectorAll('body, header, nav, main, footer, section, div, h1, h2, h3, h4, p, a, button, span, li, .btn, .card').forEach(el => {
      try {
        const cs = getComputedStyle(el);
        const c = cs.color;
        const bg = cs.backgroundColor;
        if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') colorCounts[c] = (colorCounts[c] || 0) + 1;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') colorCounts[bg] = (colorCounts[bg] || 0) + 1;
        const font = cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
        if (font && font !== 'inherit') fonts.add(font);
      } catch {}
    });

    function rgbToHex(rgb) {
      if (!rgb || rgb === 'transparent') return null;
      const m = rgb.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
      if (!m) return rgb.startsWith('#') ? rgb : null;
      return '#' + [m[1],m[2],m[3]].map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
    }
    function isNeutral(hex) {
      if (!hex) return true;
      const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
      return (Math.max(r,g,b) - Math.min(r,g,b)) < 30;
    }

    const hexColors = Object.entries(colorCounts).map(([c, count]) => ({ hex: rgbToHex(c), count })).filter(c => c.hex).sort((a, b) => b.count - a.count);
    let primaryColor = '#3b82f6', secondaryColor = '#1e40af', accentColor = '#8b5cf6';
    let bgColor = '#ffffff', textColor = '#1a1a2e', fontHeading = 'system-ui', fontBody = 'system-ui', borderRadius = '8px';

    const nonNeutral = hexColors.filter(c => !isNeutral(c.hex));
    if (nonNeutral.length >= 1) primaryColor = nonNeutral[0].hex;
    if (nonNeutral.length >= 2) secondaryColor = nonNeutral[1].hex;
    if (nonNeutral.length >= 3) accentColor = nonNeutral[2].hex;

    const body = document.body;
    if (body) {
      const bcs = getComputedStyle(body);
      const bg = rgbToHex(bcs.backgroundColor); if (bg) bgColor = bg;
      const txt = rgbToHex(bcs.color); if (txt) textColor = txt;
      fontBody = bcs.fontFamily.split(',')[0].replace(/['"]/g, '').trim() || fontBody;
    }
    const h1 = document.querySelector('h1, h2');
    if (h1) fontHeading = getComputedStyle(h1).fontFamily.split(',')[0].replace(/['"]/g, '').trim() || fontHeading;

    const btn = document.querySelector('a[class*="btn"], button[class*="btn"], .btn, button:not([type="hidden"])');
    if (btn) {
      borderRadius = getComputedStyle(btn).borderRadius || borderRadius;
      const bc = rgbToHex(getComputedStyle(btn).backgroundColor);
      if (bc && !isNeutral(bc)) primaryColor = bc;
    }

    return {
      colors: hexColors.map(c => c.hex).filter(Boolean).slice(0, 20),
      fonts: [...fonts].slice(0, 10),
      designTokens: { primaryColor, secondaryColor, accentColor, bgColor, textColor, fontHeading, fontBody, borderRadius }
    };
  })()`
}

function resolveUrl(imgUrl: string, baseUrl: string): string {
  try { return new URL(imgUrl, baseUrl).href } catch { return imgUrl }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_').slice(0, 80) || 'image.png'
}

function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('download timeout')), 20000)
    try {
      const request = net.request(url)
      const chunks: Buffer[] = []
      request.on('response', (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
          const loc = response.headers['location']
          if (loc) {
            clearTimeout(timeout)
            const resolved = Array.isArray(loc) ? loc[0] : loc
            const full = resolved.startsWith('http') ? resolved : new URL(resolved, url).href
            downloadFile(full, destPath).then(resolve).catch(reject)
            return
          }
        }
        response.on('data', (chunk) => chunks.push(chunk as Buffer))
        response.on('end', () => {
          clearTimeout(timeout)
          try {
            const buf = Buffer.concat(chunks)
            if (buf.length > 100) { writeFileSync(destPath, buf); resolve() }
            else reject(new Error('file too small'))
          } catch (e) { reject(e) }
        })
        response.on('error', (err) => { clearTimeout(timeout); reject(err) })
      })
      request.on('error', (err) => { clearTimeout(timeout); reject(err) })
      request.end()
    } catch (e) { clearTimeout(timeout); reject(e) }
  })
}
