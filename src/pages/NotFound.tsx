import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Car, ArrowLeft, Search } from 'lucide-react';
import { motion } from 'framer-motion';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 overflow-hidden">
      <div className="w-full max-w-lg text-center">
        {/* Animated 404 with car */}
        <div className="relative mx-auto mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="text-[8rem] font-black leading-none tracking-tighter text-primary/10 select-none"
          >
            404
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.3 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/25"
            >
              <Car className="h-8 w-8 text-primary-foreground" />
            </motion.div>
          </motion.div>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-2xl font-bold text-foreground"
        >
          ¡Parece que te perdiste!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="mt-3 text-muted-foreground"
        >
          La página{' '}
          <code className="rounded bg-muted-foreground/10 px-1.5 py-0.5 text-sm font-mono text-foreground">
            {location.pathname}
          </code>{' '}
          no existe en ParkiUpar.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver atrás
          </Button>
          <Button onClick={() => navigate('/')} className="gap-2">
            <Search className="h-4 w-4" />
            Ir al inicio
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
