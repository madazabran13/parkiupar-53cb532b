import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';


export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error('Por favor completa todos los campos');
      return;
    }
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      // Use edge function to create user with auto-confirmed email and conductor role
      const { data, error } = await supabase.functions.invoke('register-conductor', {
        body: { email, password, full_name: fullName },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Auto sign-in after successful registration
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        toast.success('Cuenta creada. Inicia sesión con tus credenciales.');
        navigate('/login');
      } else {
        toast.success('¡Bienvenido! Tu cuenta ha sido creada.');
        navigate('/map');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src="/logo.png" alt="ParkiUpar" className="mx-auto mb-2 h-14 w-14 rounded-lg object-contain" />
          <CardTitle className="text-2xl font-bold">Crear Cuenta</CardTitle>
          <CardDescription>Regístrate para ver la disponibilidad de parqueaderos</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input id="fullName" placeholder="Juan Pérez" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" placeholder="correo@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </Button>
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-primary hover:underline">Inicia sesión</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
