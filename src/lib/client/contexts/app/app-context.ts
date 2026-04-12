import { createContext, useContext } from 'react'

export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

export const TOAST_POSITIONS = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'top-center',
  'bottom-center',
] as const
export type ToastPosition = (typeof TOAST_POSITIONS)[number]

export type AppContextType = {
  theme: Theme
  toggleTheme: () => Theme
  setTheme: (_theme: Theme) => void

  toastPosition: ToastPosition
  setToastPosition: (_toastPosition: ToastPosition) => void
}

export const AppContext = createContext<AppContextType | undefined>(undefined)

export const useAppContext = () => {
  const ctx = useContext(AppContext)
  if (!ctx)
    throw new Error('useAppContext can only be used within App Provider')
  return ctx
}
