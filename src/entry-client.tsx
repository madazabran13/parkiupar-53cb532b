import { hydrateRoot, createRoot } from 'react-dom/client';
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

const queryClient = new QueryClient();
const root = document.getElementById('root')!;
const app = (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </QueryClientProvider>
);

// In production the SSR server pre-renders HTML → hydrate.
// In dev (vite serve) there is no pre-rendered HTML → createRoot.
if (import.meta.env.PROD && root.innerHTML.trim() !== '') {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
