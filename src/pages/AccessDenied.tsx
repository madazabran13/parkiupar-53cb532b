import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft, LogOut } from 'lucide-react';

export default function AccessDenied() {
  const { role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleGoHome = () => {
    if (role === 'superadmin') navigate('/superadmin', { replace: true });
    else if (role === 'viewer') navigate('/map', { replace: true });
    else navigate('/dashboard', { replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>

        <h1 className="text-3xl font-bold text-foreground">Acceso Denegado</h1>
        <p className="mt-3 text-muted-foreground">
          No tienes permisos para acceder a esta sección. Contacta al administrador si crees que esto es un error.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={handleGoHome} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Ir al inicio
          </Button>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
