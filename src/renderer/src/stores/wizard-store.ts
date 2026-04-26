import { create } from 'zustand'
import type { IndustryId } from '../../../shared/constants'

export interface WizardState {
  step: number
  projectName: string
  companyName: string
  domain: string
  industry: IndustryId | ''
  websiteType: 'single-page' | 'multi-page' | 'ecommerce' | 'blog'
  selectedPages: string[]
  languages: string[]
  styleId: string
  paletteId: string
  fontId: string
  materials: unknown[]
  materialDocText: string
  referenceUrls: string[]
  referenceDesign: string

  setStep: (step: number) => void
  nextStep: () => void
  prevStep: () => void
  setField: <K extends keyof WizardState>(key: K, value: WizardState[K]) => void
  reset: () => void
}

const initialState = {
  step: 0,
  projectName: '',
  companyName: '',
  domain: '',
  industry: '' as const,
  websiteType: 'multi-page' as const,
  selectedPages: ['home', 'about', 'services', 'contact'],
  languages: ['zh-CN'] as string[],
  styleId: '',
  paletteId: '',
  fontId: '',
  materials: [] as unknown[],
  materialDocText: '',
  referenceUrls: [] as string[],
  referenceDesign: ''
}

export const useWizardStore = create<WizardState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: s.step + 1 })),
  prevStep: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  setField: (key, value) => set({ [key]: value }),
  reset: () => set(initialState)
}))
