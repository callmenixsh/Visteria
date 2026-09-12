const DEFAULT_API_BASE_URL = 'https://visteria.vercel.app'

export function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.__VISTERIA_CONFIG__?.apiBaseUrl) {
    return window.__VISTERIA_CONFIG__.apiBaseUrl
  }

  return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
}