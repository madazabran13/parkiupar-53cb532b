import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AccessDenied() {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (role === 'superadmin') navigate('/superadmin', { replace: true });
    else if (role === 'viewer' || role === 'conductor') navigate('/map', { replace: true });
    else navigate('/dashboard', { replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15, duration: 0.6 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10"
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            <ShieldX className="h-10 w-10 text-destructive" />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-3xl font-bold text-foreground"
        >
          Acceso Denegado
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="mt-3 text-muted-foreground"
        >
          No tienes permisos para acceder a esta sección. Contacta al administrador si crees que esto es un error.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <Button onClick={handleGoHome} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Ir al inicio
          </Button>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
