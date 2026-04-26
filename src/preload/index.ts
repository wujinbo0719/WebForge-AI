import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getProjects: (): Promise<unknown[]> => ipcRenderer.invoke('db:get-projects'),
  getProject: (id: string): Promise<unknown> => ipcRenderer.invoke('db:get-project', id),
  createProject: (data: {
    name: string
    industry: string
    domain?: string
    websiteType?: string
  }): Promise<unknown> => ipcRenderer.invoke('db:create-project', data),
  updateProject: (id: string, data: Record<string, unknown>): Promise<unknown> =>
    ipcRenderer.invoke('db:update-project', id, data),
  deleteProject: (id: string): Promise<void> => ipcRenderer.invoke('db:delete-project', id),
  getSetting: (key: string): Promise<string | null> => ipcRenderer.invoke('db:get-setting', key),
  setSetting: (key: string, value: string): Promise<void> =>
    ipcRenderer.invoke('db:set-setting', key, value),

  // AI methods
  testAIConnection: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('ai:test-connection'),
  fetchModels: (params: {
    provider: string
    apiKey: string
    baseUrl?: string
  }): Promise<{ success: boolean; models?: { id: string; label: string }[]; error?: string }> =>
    ipcRenderer.invoke('ai:fetch-models', params),
  parseDocuments: (
    filePaths: string[]
  ): Promise<{ success: boolean; text?: string; error?: string }> =>
    ipcRenderer.invoke('ai:parse-documents', filePaths),
  scrapeUrl: (
    url: string
  ): Promise<{ success: boolean; content?: unknown; error?: string }> =>
    ipcRenderer.invoke('ai:scrape-url', url),
  analyzeBrand: (
    materialText: string
  ): Promise<{ success: boolean; analysis?: unknown; error?: string }> =>
    ipcRenderer.invoke('ai:analyze-brand', materialText),
  generateContent: (
    context: unknown
  ): Promise<{ success: boolean; content?: unknown; error?: string }> =>
    ipcRenderer.invoke('ai:generate-content', context),
  fullPipeline: (
    params: unknown
  ): Promise<{ success: boolean; content?: unknown; error?: string }> =>
    ipcRenderer.invoke('ai:full-pipeline', params),
  aiChat: (
    params: { systemPrompt: string; userMessage: string; projectId: string }
  ): Promise<{ success: boolean; response?: string; error?: string }> =>
    ipcRenderer.invoke('ai:chat', params),
  applyDesignChanges: (
    params: { projectId: string; instruction: string; currentConfig: string }
  ): Promise<{ success: boolean; content?: unknown; error?: string }> =>
    ipcRenderer.invoke('ai:apply-design-changes', params),
  translateContent: (
    params: { content: string; targetLang: string; targetLangName: string }
  ): Promise<{ success: boolean; content?: unknown; error?: string }> =>
    ipcRenderer.invoke('ai:translate-content', params),

  // Copy snapshot dist from temp to real project
  copySnapshots: (params: {
    fromProjectId: string
    toProjectId: string
  }): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('site:copy-snapshots', params),

  // Site generation methods
  generateSite: (
    params: unknown
  ): Promise<{ success: boolean; outputDir?: string; pages?: unknown[]; error?: string }> =>
    ipcRenderer.invoke('site:generate', params),
  getOutputDir: (projectId: string): Promise<string> =>
    ipcRenderer.invoke('site:get-output-dir', projectId),
  readGeneratedPage: (
    projectId: string,
    pageFile: string
  ): Promise<{ success: boolean; html?: string; error?: string }> =>
    ipcRenderer.invoke('site:read-page', projectId, pageFile),

  // Template methods
  getTemplates: (): Promise<unknown[]> => ipcRenderer.invoke('db:get-templates'),
  getTemplate: (id: string): Promise<unknown> => ipcRenderer.invoke('db:get-template', id),
  createTemplate: (data: {
    name: string
    industry?: string
    description?: string
    config_json?: string
  }): Promise<unknown> => ipcRenderer.invoke('db:create-template', data),
  deleteTemplate: (id: string): Promise<void> => ipcRenderer.invoke('db:delete-template', id),
  exportTemplate: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('template:export', id),
  importTemplate: (): Promise<{ success: boolean; template?: unknown; error?: string }> =>
    ipcRenderer.invoke('template:import'),

  // Export project
  exportProject: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('project:export-zip', id),
  exportFullSource: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('project:export-full-source', id),

  // SSH / Deploy methods
  sshTestConnection: (config: unknown): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('ssh:test-connection', config),
  sshConnect: (config: unknown): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('ssh:connect', config),
  sshDisconnect: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('ssh:disconnect'),
  sshEnvCheck: (domain: string): Promise<{ success: boolean; results?: unknown[]; error?: string }> =>
    ipcRenderer.invoke('ssh:env-check', domain),
  sshDeploy: (params: unknown): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('ssh:deploy', params),
  uploadPageMaterials: (params: {
    projectId: string
    pageId: string
  }): Promise<{
    success: boolean
    files?: { name: string; path: string; type: 'image' | 'document'; relativePath: string }[]
    docText?: string
    imageFiles?: { name: string; relativePath: string }[]
    error?: string
  }> => ipcRenderer.invoke('page:upload-materials', params),

  exportDeployCommands: (params: {
    projectId: string
    projectName: string
    domain: string
  }): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('deploy:export-commands', params),
  sshExec: (command: string): Promise<{ success: boolean; stdout?: string; stderr?: string; code?: number; error?: string }> =>
    ipcRenderer.invoke('ssh:exec', command),
  onEnvCheckProgress: (callback: (results: unknown[]) => void): (() => void) => {
    const handler = (_event: unknown, results: unknown[]): void => callback(results)
    ipcRenderer.on('ssh:env-check-progress', handler)
    return () => ipcRenderer.removeListener('ssh:env-check-progress', handler)
  },
  onDeployProgress: (callback: (progress: unknown[]) => void): (() => void) => {
    const handler = (_event: unknown, progress: unknown[]): void => callback(progress)
    ipcRenderer.on('ssh:deploy-progress', handler)
    return () => ipcRenderer.removeListener('ssh:deploy-progress', handler)
  },

  // Smart Clone
  cloneSite: (params: {
    url: string
    projectId: string
    projectName: string
    industry: string
    depth?: 'level1' | 'level2'
  }): Promise<{ success: boolean; clonedData?: unknown; error?: string }> =>
    ipcRenderer.invoke('site:clone', params),
  onCloneProgress: (callback: (steps: unknown[]) => void): (() => void) => {
    const handler = (_event: unknown, steps: unknown[]): void => callback(steps)
    ipcRenderer.on('site:clone-progress', handler)
    return () => ipcRenderer.removeListener('site:clone-progress', handler)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
