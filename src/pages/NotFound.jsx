import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-7xl font-semibold tabular-nums text-black/10 dark:text-white/10 mb-4">404</p>
      <p className="text-black/60 dark:text-white/60 mb-6">Page not found</p>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-black dark:text-white hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  )
}
