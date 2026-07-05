import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 防止 PWA 手勢觸發瀏覽器回上一頁
history.pushState(null, '', location.href)
window.addEventListener('popstate', () => {
  history.pushState(null, '', location.href)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
