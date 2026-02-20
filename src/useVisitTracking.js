import { useEffect } from 'react'
import { trackVisit } from './visitTracking'

const ROUTE_EVENT_NAME = 'visteria:routechange'

let historyPatched = false

function patchHistoryIfNeeded() {
  if (historyPatched) {
    return
  }

  const originalPushState = window.history.pushState.bind(window.history)
  const originalReplaceState = window.history.replaceState.bind(window.history)

  window.history.pushState = function pushState(...args) {
    originalPushState(...args)
    window.dispatchEvent(new Event(ROUTE_EVENT_NAME))
  }

  window.history.replaceState = function replaceState(...args) {
    originalReplaceState(...args)
    window.dispatchEvent(new Event(ROUTE_EVENT_NAME))
  }

  historyPatched = true
}

export function useVisitTracking(trackingConfig = {}) {
  const apiBaseUrl = trackingConfig.apiBaseUrl || ''
  const apiKey = trackingConfig.apiKey || ''
  const siteId = trackingConfig.siteId || ''

  useEffect(() => {
    patchHistoryIfNeeded()

    const handleTrack = () => {
      trackVisit({ apiBaseUrl, apiKey, siteId })
    }

    handleTrack()

    window.addEventListener(ROUTE_EVENT_NAME, handleTrack)
    window.addEventListener('popstate', handleTrack)
    window.addEventListener('hashchange', handleTrack)

    return () => {
      window.removeEventListener(ROUTE_EVENT_NAME, handleTrack)
      window.removeEventListener('popstate', handleTrack)
      window.removeEventListener('hashchange', handleTrack)
    }
  }, [apiBaseUrl, apiKey, siteId])
}
