import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'

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
      <nav className="bg-white/95 dark:bg-black/90 border-b border-black/10 dark:border-white/10 backdrop-blur animate-fade-up">
        <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 py-3">
            <div className="flex items-center justify-between">
              <Link to="/" className="text-xl sm:text-2xl font-bold text-black dark:text-white">
                Visteria
              </Link>
              <div className="flex items-center gap-2 sm:hidden">
                <button
                  onClick={() => window.location.reload()}
                  className="p-2 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Refresh data"
                  aria-label="Refresh data"
                >
                  <svg className="w-5 h-5 text-black/70 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M6.75 17.25A7.5 7.5 0 0017.25 6.75" />
                  </svg>
                </button>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title={`Current: ${theme} mode`}
                >
                  {theme === 'dark' ? (
                    <svg className="w-5 h-5 text-black/70 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : theme === 'light' ? (
                    <svg className="w-5 h-5 text-black/70 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-black/70 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-start sm:justify-center gap-2">
              <Link
                to="/"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/')
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/settings"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/settings')
                    ? 'bg-black text-white dark:bg-white dark:text-black'
                    : 'text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                Settings
              </Link>
            </div>

            <div className="hidden sm:flex items-center justify-end gap-2">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title={`Current: ${theme} mode`}
              >
                {theme === 'dark' ? (
                  <svg className="w-5 h-5 text-black/70 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : theme === 'light' ? (
                  <svg className="w-5 h-5 text-black/70 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-black/70 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="p-2 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Refresh data"
                aria-label="Refresh data"
              >
                <svg className="w-5 h-5 text-black/70 dark:text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M6.75 17.25A7.5 7.5 0 0017.25 6.75" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 md:py-8 max-w-6xl mx-auto w-full animate-fade-up" style={{ animationDelay: '60ms' }}>
        {children}
      </main>

      <footer className="border-t border-black/10 dark:border-white/10 animate-fade-up" style={{ animationDelay: '110ms' }}>
        <div className="px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm max-w-6xl mx-auto">
          <p className="text-black/60 dark:text-white/60">Visteria Analytics</p>
          <p className="text-black/50 dark:text-white/50">All metrics update in real time.</p>
        </div>
      </footer>
    </div>
  )
}
