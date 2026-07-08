import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import './i18n' // i18n 초기화 (fallback=한국어)
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Vercel Web Analytics — 쿠키리스 방문/국가/유입 자동 수집 + 커스텀 퍼널 이벤트 */}
    <Analytics />
  </StrictMode>,
)
