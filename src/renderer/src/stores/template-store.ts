import { create } from 'zustand'

interface Template {
  id: string
  name: string
  industry: string | null
  description: string | null
  config_json: string | null
  created_at: string
}

interface TemplateStore {
  templates: Template[]
  setTemplates: (templates: Template[]) => void
  addTemplate: (template: Template) => void
  removeTemplate: (id: string) => void
}

export const useTemplateStore = create<TemplateStore>((set) => ({
  templates: [],
  setTemplates: (templates) => set({ templates }),
  addTemplate: (template) =>
    set((state) => ({ templates: [template, ...state.templates] })),
  removeTemplate: (id) =>
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }))
}))

export type { Template }
