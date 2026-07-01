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
  // Apps like X/Twitter often leave 'url' empty and embed the link inside
  // 'text' instead (e.g. "check this out https://x.com/user/status/123").
  // Extract it so the real URL reaches the backend and the tweet body
  // survives as the description instead of being discarded.
  const urlMatch = rawText.match(/https?:\/\/\S+/);
  const extractedUrl = rawUrl || (urlMatch ? urlMatch[0] : '');
  const remainingText = rawUrl
    ? rawText
    : (urlMatch ? rawText.replace(urlMatch[0], '').trim() : rawText);
  sessionStorage.setItem('__pendingShare', JSON.stringify({
    url: extractedUrl,
    title: p.get('title') || '',
    text: remainingText,
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
