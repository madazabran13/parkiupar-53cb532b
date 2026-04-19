import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppContent from './AppContent.tsx';
import './index.css';

// Apply saved theme before first paint to avoid flash
if (
  localStorage.getItem('theme') === 'dark' ||
  (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
) {
  document.documentElement.classList.add('dark');
}

// ── Offline check BEFORE React mounts ──────────────────────────────────────
// If the browser is offline (including on page reload), redirect the URL to
// /no-internet immediately so the router renders that page on the first paint
// with no flash of other content.
if (!navigator.onLine && window.location.pathname !== '/no-internet') {
  sessionStorage.setItem('no-internet-return', window.location.pathname);
  window.history.replaceState(null, '', '/no-internet');
}

const queryClient = new QueryClient();
const root = document.getElementById('root')!;

createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </QueryClientProvider>
);
