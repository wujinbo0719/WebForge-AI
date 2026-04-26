import { create } from 'zustand'

export interface Project {
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

interface ProjectStore {
  projects: Project[]
  currentProject: Project | null
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  currentProject: null,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project })
}))
