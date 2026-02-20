import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('visteria-theme')
    if (stored) return stored
    return 'system'
  })

  const [resolvedTheme, setResolvedTheme] = useState('light')

  useEffect(() => {
    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateTheme = () => {
      let applied = theme
      if (theme === 'system') {
        applied = mediaQuery.matches ? 'dark' : 'light'
      }
      
      setResolvedTheme(applied)
      
      if (applied === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    updateTheme()

    const handler = () => {
      if (theme === 'system') {
        updateTheme()
      }
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const setThemeMode = (newTheme) => {
    setTheme(newTheme)
    localStorage.setItem('visteria-theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeMode, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
