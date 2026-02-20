import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { Moon, Sun, Monitor, RefreshCw, Github, Heart, Code } from 'lucide-react'

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
        <div className="px-3 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="group flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-white transition-transform duration-200 group-hover:scale-105 p-1.5">
                <img src="/favicon.png" alt="Visteria" className="w-full h-full" />
              </div>
              <span className="text-base sm:text-lg font-bold tracking-wide text-black dark:text-white" style={{ fontFamily: '"Caesar Dressing", cursive', letterSpacing: '0.02em' }}>
                Visteria
              </span>
            </Link>

            {/* Action buttons */}
            <div className="flex items-center gap-0.5 sm:gap-1">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
                className="p-1.5 sm:p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all duration-150"
                title={`Current: ${theme} mode`}
              >
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-black/60 dark:text-white/60" />
                ) : theme === 'light' ? (
                  <Sun className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-black/60 dark:text-white/60" />
                ) : (
                  <Monitor className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-black/60 dark:text-white/60" />
                )}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="p-1.5 sm:p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all duration-150"
                title="Refresh data"
                aria-label="Refresh data"
              >
                <RefreshCw className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-black/60 dark:text-white/60" />
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
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white dark:bg-white p-1.5">
                <img src="/favicon.png" alt="Visteria" className="w-full h-full" />
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide text-black dark:text-white" style={{ fontFamily: '"Caesar Dressing", cursive', letterSpacing: '0.02em' }}>Visteria</p>
                <p className="text-xs text-black/40 dark:text-white/40">Simple analytics</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Link
                to="/setup"
                className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all duration-150 group"
                title="Setup Guide"
              >
                <Code className="w-[18px] h-[18px] text-black/40 dark:text-white/40 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </Link>
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
