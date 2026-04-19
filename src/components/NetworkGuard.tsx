import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { setNetworkErrorHandler } from '@/lib/networkStatus';

const EXEMPT = '/no-internet';

export default function NetworkGuard() {
  const navigate = useNavigate();
  const location = useLocation();

  const redirect = useCallback(() => {
    if (location.pathname !== EXEMPT) {
      sessionStorage.setItem('no-internet-return', location.pathname);
      navigate(EXEMPT, { replace: true });
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    // Register with the module-level pub/sub so apiFetch can trigger this directly
    const unsubscribe = setNetworkErrorHandler(redirect);

    // Also catch browser-level offline (airplane mode, cable unplugged)
    window.addEventListener('offline', redirect);

    // Already offline on mount
    if (!navigator.onLine && location.pathname !== EXEMPT) {
      redirect();
    }

    return () => {
      unsubscribe();
      window.removeEventListener('offline', redirect);
    };
  }, [redirect, location.pathname]);

  return null;
}
