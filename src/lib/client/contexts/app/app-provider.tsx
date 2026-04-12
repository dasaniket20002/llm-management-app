import { useCallback, useEffect, useState } from 'react'
import { AppContext, THEMES, TOAST_POSITIONS } from './app-context'
import type { Theme, ToastPosition } from './app-context'

const LOCAL_KEYS = {
  theme: 'theme',
  toastPosition: 'toastPosition',
} as const

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const stored = window.localStorage.getItem(LOCAL_KEYS.theme) as Theme
  if (THEMES.includes(stored)) {
    return stored
  }

  return 'system'
}

function getInitialToastPosition(): ToastPosition {
  if (typeof window === 'undefined') {
    return 'bottom-right'
  }

  const stored = window.localStorage.getItem(
    LOCAL_KEYS.toastPosition,
  ) as ToastPosition
  if (TOAST_POSITIONS.includes(stored)) {
    return stored
  }

  return 'bottom-right'
}

export default function AppProvider({
  initialTheme,
  children,
}: {
  initialTheme?: Theme
  children?: React.ReactNode
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme ?? getInitialTheme)
  const [toastPosition, setToastPosition] = useState<ToastPosition>(
    getInitialToastPosition,
  )

  const applyThemeMode = useCallback((_theme: Theme) => {
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
    const resolved =
      _theme === 'system' ? (prefersDark ? 'dark' : 'light') : _theme

    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(resolved)

    if (_theme === 'system') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', _theme)
    }

    document.documentElement.style.colorScheme = resolved
  }, [])

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme =
      theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(nextTheme)
    return nextTheme
  }, [theme])

  useEffect(() => {
    applyThemeMode(theme)
    window.localStorage.setItem(LOCAL_KEYS.theme, theme)
  }, [theme, applyThemeMode])

  useEffect(() => {
    window.localStorage.setItem(LOCAL_KEYS.toastPosition, toastPosition)
  }, [toastPosition])

  return (
    <AppContext.Provider
      value={{ theme, toggleTheme, setTheme, toastPosition, setToastPosition }}
    >
      {children}
    </AppContext.Provider>
  )
}
