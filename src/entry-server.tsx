import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppContent from './AppContent.tsx';

export function render(url: string): string {
  // New QueryClient per request to avoid shared state between users
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  try {
    return renderToString(
      <QueryClientProvider client={queryClient}>
        <StaticRouter location={url}>
          <AppContent />
        </StaticRouter>
      </QueryClientProvider>,
    );
  } catch {
    // Fallback: return empty string so client-side hydration takes over
    return '';
  } finally {
    queryClient.clear();
  }
}
