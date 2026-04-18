import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import AppContent from './AppContent.tsx';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
