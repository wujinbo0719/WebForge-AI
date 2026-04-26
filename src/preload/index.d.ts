import { ElectronAPI } from '@electron-toolkit/preload'
import { Project } from '../shared/types'

export interface WebForgeAPI {
  // Project CRUD
  getProjects: () => Promise<Project[]>
  getProject: (id: string) => Promise<Project | null>
  createProject: (data: {
    name: string
    industry: string
    domain?: string
    websiteType?: string
  }) => Promise<Project>
  updateProject: (id: string, data: Record<string, unknown>) => Promise<Project>
  deleteProject: (id: string) => Promise<void>

  // Settings
  getSetting: (key: string) => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<void>

  // AI methods
  testAIConnection: () => Promise<{ success: boolean; error?: string }>
  fetchModels: (params: {
    provider: string
    apiKey: string
    baseUrl?: string
  }) => Promise<{ success: boolean; models?: { id: string; label: string }[]; error?: string }>
  parseDocuments: (filePaths: string[]) => Promise<{ success: boolean; text?: string; error?: string }>
  scrapeUrl: (url: string) => Promise<{ success: boolean; content?: unknown; error?: string }>
  analyzeBrand: (materialText: string) => Promise<{ success: boolean; analysis?: unknown; error?: string }>
  generateContent: (context: unknown) => Promise<{ success: boolean; content?: unknown; error?: string }>
  fullPipeline: (params: unknown) => Promise<{ success: boolean; content?: unknown; error?: string }>
  aiChat: (params: { systemPrompt: string; userMessage: string; projectId: string }) => Promise<{ success: boolean; response?: string; error?: string }>
  applyDesignChanges: (params: { projectId: string; instruction: string; currentConfig: string }) => Promise<{ success: boolean; content?: unknown; error?: string }>
  translateContent: (params: { content: string; targetLang: string; targetLangName: string }) => Promise<{ success: boolean; content?: unknown; error?: string }>

  // Copy snapshot dist from temp to real project
  copySnapshots: (params: {
    fromProjectId: string
    toProjectId: string
  }) => Promise<{ success: boolean; error?: string }>

  // Site generation
  generateSite: (params: unknown) => Promise<{ success: boolean; outputDir?: string; pages?: unknown[]; error?: string }>
  getOutputDir: (projectId: string) => Promise<string>
  readGeneratedPage: (projectId: string, pageFile: string) => Promise<{ success: boolean; html?: string; error?: string }>

  // Templates
  getTemplates: () => Promise<unknown[]>
  getTemplate: (id: string) => Promise<unknown | null>
  createTemplate: (data: {
    name: string
    industry?: string
    description?: string
    config_json?: string
  }) => Promise<unknown>
  deleteTemplate: (id: string) => Promise<void>
  exportTemplate: (id: string) => Promise<{ success: boolean; error?: string }>
  importTemplate: () => Promise<{ success: boolean; template?: unknown; error?: string }>

  // Page materials upload
  uploadPageMaterials: (params: { projectId: string; pageId: string }) => Promise<{
    success: boolean
    files?: { name: string; path: string; type: 'image' | 'document'; relativePath: string }[]
    docText?: string
    imageFiles?: { name: string; relativePath: string }[]
    error?: string
  }>

  // Export project
  exportProject: (id: string) => Promise<{ success: boolean; error?: string }>
  exportFullSource: (id: string) => Promise<{ success: boolean; error?: string }>

  // SSH / Deploy
  sshTestConnection: (config: unknown) => Promise<{ success: boolean; error?: string }>
  sshConnect: (config: unknown) => Promise<{ success: boolean; error?: string }>
  sshDisconnect: () => Promise<{ success: boolean }>
  sshEnvCheck: (domain: string) => Promise<{ success: boolean; results?: unknown[]; error?: string }>
  sshDeploy: (params: unknown) => Promise<{ success: boolean; error?: string }>
  exportDeployCommands: (params: { projectId: string; projectName: string; domain: string }) => Promise<{ success: boolean; error?: string }>
  sshExec: (command: string) => Promise<{ success: boolean; stdout?: string; stderr?: string; code?: number; error?: string }>
  onEnvCheckProgress: (callback: (results: unknown[]) => void) => () => void
  onDeployProgress: (callback: (progress: unknown[]) => void) => () => void

  // Smart Clone
  cloneSite: (params: {
    url: string
    projectId: string
    projectName: string
    industry: string
    depth?: 'level1' | 'level2'
  }) => Promise<{ success: boolean; clonedData?: unknown; error?: string }>
  onCloneProgress: (callback: (steps: unknown[]) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: WebForgeAPI
  }
}
