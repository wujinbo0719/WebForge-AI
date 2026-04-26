export interface WebsiteContext {
  industry: string
  companyName: string
  projectName: string
  languages: string[]
  websiteType: string
  selectedPages: string[]
  styleId: string
  paletteId: string
  fontId: string
  materials: string
  referenceUrls: string[]
}

export interface GeneratedContent {
  pages: PageContent[]
  seoMeta: SEOMeta
  brandAnalysis: BrandAnalysis
  translations?: Record<string, GeneratedContent>
}

export interface PageContent {
  id: string
  title: string
  sections: SectionContent[]
}

export interface SectionContent {
  type: string
  heading: string
  subheading?: string
  content: string
  items?: SectionItem[]
  fontFamily?: string
  fontSize?: string
  fontWeight?: string
  color?: string
  subheadingColor?: string
  contentColor?: string
  image?: string
  imageSize?: string
  images?: string[]
  bgColor?: string
  bgImage?: string
  // AI-decided design fields
  layoutHint?: 'centered' | 'split' | 'fullwidth' | 'bento' | 'alternating' | 'timeline' | 'masonry' | 'minimal' | 'numbered'
  animation?: 'fade-up' | 'fade-left' | 'fade-right' | 'zoom-in' | 'flip-up' | 'slide-up' | 'none'
  bgPattern?: 'none' | 'gradient' | 'dots' | 'grid' | 'waves' | 'blob' | 'dark' | 'accent'
  sectionStyle?: 'card' | 'flat' | 'bordered' | 'elevated' | 'glass' | 'outlined'
  columns?: 2 | 3 | 4
  showDivider?: boolean
  stats?: { value: string; label: string }[]
}

export interface SectionItem {
  title: string
  description: string
  icon?: string
  image?: string
  bgColor?: string
  link?: string
  fontFamily?: string
  fontSize?: string
  fontWeight?: string
  color?: string
  value?: string
  subtitle?: string
}

export interface SEOMeta {
  title: string
  description: string
  keywords: string[]
  ogTitle: string
  ogDescription: string
}

export interface BrandAnalysis {
  companyName: string
  industry: string
  tone: string // professional, friendly, luxury, playful, etc.
  keyServices: string[]
  uniqueSellingPoints: string[]
  targetAudience: string
  contactInfo: {
    phone?: string
    email?: string
    address?: string
    website?: string
  }
}

export interface AIProvider {
  name: string
  analyze(content: string, prompt: string): Promise<string>
  generateContent(context: WebsiteContext): Promise<GeneratedContent>
}
