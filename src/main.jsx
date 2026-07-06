import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import { WalletProvider } from './context/WalletContext'
import { initAnalytics } from './analytics'

// ── Sentry Error Tracking ──────────────────────────────────────────────────────
// Only activates when VITE_SENTRY_DSN is set in .env
const sentryDsn = import.meta.env.VITE_SENTRY_DSN

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE || 'development',
    release: 'disaster-relief-rail@4.0.0',
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // Capture 100% of errors in all environments
    tracesSampleRate: 0.2,
    // Only send errors — do not track user sessions or replay
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Avoid capturing errors from third-party scripts
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
    ],
    beforeSend(event) {
      // Strip any wallet addresses from breadcrumbs before sending
      return event
    },
  })
  console.info('[Sentry] Error tracking initialized.')
} else {
  console.info('[Sentry] VITE_SENTRY_DSN not set — error tracking disabled.')
}

// ── Analytics ──────────────────────────────────────────────────────────────────
initAnalytics()

// ── App Mount ──────────────────────────────────────────────────────────────────
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </StrictMode>
)
