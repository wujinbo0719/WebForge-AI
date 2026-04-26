import { net } from 'electron'

/**
 * Scrape a URL and extract its text content and meta information.
 * Uses Electron's net module to avoid bundling Puppeteer.
 */
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  const html = await fetchHtml(url)
  return extractContent(html, url)
}

export interface ScrapedDesign {
  colors: string[]
  fonts: string[]
  hasAnimations: boolean
  hasParallax: boolean
  hasSlider: boolean
  hasVideo: boolean
  layoutStyle: string
  cssFramework: string
}

export interface ScrapedContent {
  url: string
  title: string
  description: string
  headings: string[]
  bodyText: string
  links: string[]
  design: ScrapedDesign
}

function fetchHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = net.request(url)
    let data = ''

    request.on('response', (response) => {
      // Follow redirects
      if (response.statusCode >= 300 && response.statusCode < 400) {
        const location = response.headers['location']
        if (location) {
          const redirectUrl = Array.isArray(location) ? location[0] : location
          fetchHtml(redirectUrl).then(resolve).catch(reject)
          return
        }
      }

      response.on('data', (chunk) => {
        data += chunk.toString()
      })
      response.on('end', () => resolve(data))
      response.on('error', reject)
    })

    request.on('error', reject)
    request.end()
  })
}

function extractContent(html: string, url: string): ScrapedContent {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : ''

  // Extract meta description
  const descMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i
  )
  const description = descMatch ? decodeEntities(descMatch[1].trim()) : ''

  // Extract headings
  const headings: string[] = []
  const headingRegex = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi
  let match: RegExpExecArray | null
  while ((match = headingRegex.exec(html)) !== null) {
    const text = stripTags(match[1]).trim()
    if (text) headings.push(text)
  }

  // Extract body text (remove scripts, styles, and tags)
  let bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
  bodyText = stripTags(bodyText)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000) // Limit to 5000 chars

  // Extract internal links
  const links: string[] = []
  const linkRegex = /href=["'](https?:\/\/[^"']+)["']/gi
  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const linkUrl = new URL(match[1])
      const baseUrl = new URL(url)
      if (linkUrl.hostname === baseUrl.hostname) {
        links.push(match[1])
      }
    } catch {
      // ignore invalid URLs
    }
  }

  const design = extractDesign(html)

  return {
    url,
    title,
    description,
    headings: headings.slice(0, 20),
    bodyText,
    links: [...new Set(links)].slice(0, 20),
    design
  }
}

function extractDesign(html: string): ScrapedDesign {
  const colors: string[] = []
  // Extract hex colors from inline styles and CSS
  const hexMatches = html.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
  const rgbMatches = html.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/gi) ?? []
  const uniqueColors = [...new Set([...hexMatches.filter((c) => c.length >= 4), ...rgbMatches])]
  colors.push(...uniqueColors.slice(0, 10))

  // Extract font families
  const fonts: string[] = []
  const fontMatches = html.match(/font-family\s*:\s*([^;}"]+)/gi) ?? []
  for (const fm of fontMatches) {
    const val = fm.replace(/font-family\s*:\s*/i, '').trim().replace(/['"]/g, '').split(',')[0].trim()
    if (val && !fonts.includes(val) && val.length < 40) fonts.push(val)
  }

  // Detect animations/effects
  const lowerHtml = html.toLowerCase()
  const hasAnimations = /animation|@keyframes|animate__|transition.*transform|\.aos-|wow\.js|gsap|framer-motion/i.test(html)
  const hasParallax = /parallax|data-speed|rellax|jarallax/i.test(html)
  const hasSlider = /swiper|slick|carousel|owl-carousel|splide|glide/i.test(html)
  const hasVideo = /<video|youtube\.com\/embed|vimeo\.com/i.test(html)

  // Detect CSS framework
  let cssFramework = 'custom'
  if (lowerHtml.includes('tailwind') || lowerHtml.includes('tailwindcss')) cssFramework = 'tailwind'
  else if (lowerHtml.includes('bootstrap')) cssFramework = 'bootstrap'
  else if (lowerHtml.includes('ant-design') || lowerHtml.includes('antd')) cssFramework = 'antd'
  else if (lowerHtml.includes('element-ui') || lowerHtml.includes('element-plus')) cssFramework = 'element'
  else if (lowerHtml.includes('material-ui') || lowerHtml.includes('mui')) cssFramework = 'material'

  // Detect layout style
  let layoutStyle = 'standard'
  if (/display\s*:\s*grid|grid-template/i.test(html)) layoutStyle = 'grid'
  if (/display\s*:\s*flex/i.test(html)) layoutStyle = layoutStyle === 'grid' ? 'grid+flex' : 'flex'
  if (lowerHtml.includes('masonry')) layoutStyle = 'masonry'

  return { colors, fonts: fonts.slice(0, 5), hasAnimations, hasParallax, hasSlider, hasVideo, layoutStyle, cssFramework }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ')
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
}
