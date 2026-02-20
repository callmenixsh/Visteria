import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { Moon, Sun, Monitor, RefreshCw, BarChart3, Github, Globe, Heart } from 'lucide-react'

export default function Layout({ children }) {
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col">
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 animate-fade-up">
        <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 h-16">
            <div className="flex items-center justify-between">
              <Link to="/" className="group flex items-center gap-2.5">
                <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-black dark:bg-white transition-transform duration-200 group-hover:scale-105">
                  <BarChart3 className="w-5 h-5 text-white dark:text-black" />
                </div>
                <span className="text-lg font-semibold tracking-tight text-black dark:text-white">
                  Visteria
                </span>
              </Link>
              <div className="flex items-center gap-1.5 sm:hidden">
                <button
                  onClick={() => window.location.reload()}
                  className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all duration-150"
                  title="Refresh data"
                  aria-label="Refresh data"
                >
                  <RefreshCw className="w-[18px] h-[18px] text-black/60 dark:text-white/60" />
                </button>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
                  className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all duration-150"
                  title={`Current: ${theme} mode`}
                >
                  {theme === 'dark' ? (
                    <Moon className="w-[18px] h-[18px] text-black/60 dark:text-white/60" />
                  ) : theme === 'light' ? (
                    <Sun className="w-[18px] h-[18px] text-black/60 dark:text-white/60" />
                  ) : (
                    <Monitor className="w-[18px] h-[18px] text-black/60 dark:text-white/60" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-start sm:justify-center">
              <div className="inline-flex items-center p-0.5 rounded-full bg-black/5 dark:bg-white/5">
                <Link
                  to="/"
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive('/')
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                      : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/settings"
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive('/settings')
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                      : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white'
                  }`}
                >
                  Settings
                </Link>
              </div>
            </div>

            <div className="hidden sm:flex items-center justify-end gap-1">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
                className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all duration-150"
                title={`Current: ${theme} mode`}
              >
                {theme === 'dark' ? (
                  <Moon className="w-[18px] h-[18px] text-black/60 dark:text-white/60" />
                ) : theme === 'light' ? (
                  <Sun className="w-[18px] h-[18px] text-black/60 dark:text-white/60" />
                ) : (
                  <Monitor className="w-[18px] h-[18px] text-black/60 dark:text-white/60" />
                )}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all duration-150"
                title="Refresh data"
                aria-label="Refresh data"
              >
                <RefreshCw className="w-[18px] h-[18px] text-black/60 dark:text-white/60" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 md:py-8 max-w-6xl mx-auto w-full animate-fade-up" style={{ animationDelay: '60ms' }}>
        {children}
      </main>

      <footer className="border-t border-black/[0.06] dark:border-white/[0.06] animate-fade-up" style={{ animationDelay: '110ms' }}>
        <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black dark:bg-white">
                <BarChart3 className="w-4 h-4 text-white dark:text-black" />
              </div>
              <div>
                <p className="text-sm font-medium text-black dark:text-white">Visteria</p>
                <p className="text-xs text-black/40 dark:text-white/40">Simple analytics for your projects</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <a
                href="https://github.com/callmenixsh/visteria"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all duration-150 group"
                title="View on GitHub"
              >
                <Github className="w-[18px] h-[18px] text-black/40 dark:text-white/40 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </a>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-black/[0.04] dark:border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-black/30 dark:text-white/30">
              © {new Date().getFullYear()} Visteria. Open source.
            </p>
            <p className="text-xs text-black/30 dark:text-white/30 flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-black/40 dark:text-white/40" /> by{' '}
              <a 
                href="https://github.com/callmenixsh" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors"
              >
                @callmenixsh
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
