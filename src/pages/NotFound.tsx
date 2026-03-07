import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Car, ArrowLeft, Search } from 'lucide-react';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-lg text-center">
        {/* Animated car illustration */}
        <div className="relative mx-auto mb-8">
          <div className="text-[8rem] font-black leading-none tracking-tighter text-primary/10">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/25">
              <Car className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          ¡Parece que te perdiste!
        </h1>
        <p className="mt-3 text-muted-foreground">
          La página <code className="rounded bg-muted-foreground/10 px-1.5 py-0.5 text-sm font-mono text-foreground">{location.pathname}</code> no existe en ParkingPro.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver atrás
          </Button>
          <Button onClick={() => navigate('/')} className="gap-2">
            <Search className="h-4 w-4" />
            Ir al inicio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
