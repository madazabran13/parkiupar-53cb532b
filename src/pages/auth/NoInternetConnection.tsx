import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { WifiOff, RefreshCw, ArrowLeft } from 'lucide-react';

async function testConnectivity(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

function getReturnPath() {
  return sessionStorage.getItem('no-internet-return') || '/login';
}

export default function NoInternetConnection() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const tryReconnect = useCallback(async () => {
    setChecking(true);
    const ok = await testConnectivity();
    setChecking(false);

    if (ok) {
      const returnTo = getReturnPath();
      sessionStorage.removeItem('no-internet-return');
      navigate(returnTo, { replace: true });
    } else {
      setAttempts((n) => n + 1);
    }
  }, [navigate]);

  // When the browser signals online again, test real connectivity
  useEffect(() => {
    const onOnline = () => tryReconnect();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [tryReconnect]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-lg"
      >
        <Card className="border-muted shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-600/90 to-slate-700/70 p-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            >
              <div className="mx-auto h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
                <motion.div
                  animate={{ rotate: [0, -15, 15, -15, 0] }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  <WifiOff className="h-8 w-8 text-white" />
                </motion.div>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-bold text-white"
            >
              Sin conexión al servidor
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-white/80 text-sm mt-1"
            >
              No se pudo establecer conexión con ParkiUpar
            </motion.p>
          </div>

          <CardContent className="p-6 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-lg border border-slate-300/30 bg-slate-500/5 p-4"
            >
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                Verifica tu conexión a internet e intenta de nuevo.
                {attempts > 0 && (
                  <span className="block mt-1 text-destructive text-xs">
                    Intento {attempts}: el servidor sigue sin responder.
                  </span>
                )}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="space-y-3"
            >
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={tryReconnect}
                disabled={checking}
              >
                <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Verificando conexión...' : 'Reintentar'}
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => navigate('/login', { replace: true })}
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="text-[10px] text-muted-foreground text-center"
            >
              Si el problema persiste, contacta al soporte técnico.
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
