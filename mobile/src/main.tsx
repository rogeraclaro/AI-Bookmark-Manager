import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Capture share params synchronously before React mounts.
// Storing in sessionStorage makes them survive React StrictMode's double-mount:
// the first effect run reads and keeps them, the second run reads the same values.
// Every page load overwrites this entry, so stale params never persist across sessions.
{
  const p = new URLSearchParams(window.location.search);
  const rawUrl = p.get('url') || '';
  const rawText = p.get('text') || '';
  sessionStorage.setItem('__pendingShare', JSON.stringify({
    url: rawUrl || rawText,
    title: p.get('title') || '',
    text: rawUrl ? rawText : '',
  }));
  if (window.location.search) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/mobile/sw.js');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
