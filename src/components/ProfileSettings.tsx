import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { User, Lock } from 'lucide-react';

export default function ProfileSettings() {
  const { profile, user, updatePassword } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!fullName.trim()) throw new Error('El nombre es obligatorio');
      if (fullName.length > 100) throw new Error('El nombre es muy largo');
      if (phone && phone.length > 20) throw new Error('El teléfono es muy largo');

      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success('Perfil actualizado correctamente'),
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!newPassword || newPassword.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
      if (newPassword !== confirmPassword) throw new Error('Las contraseñas no coinciden');

      const { error } = await updatePassword(newPassword);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Datos Personales</CardTitle>
              <CardDescription>Actualiza tu información de perfil</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Correo electrónico</Label>
            <Input value={user?.email || ''} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">El correo no se puede cambiar</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre completo *</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
                placeholder="+57 300 000 0000"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => updateProfileMutation.mutate()}
              disabled={updateProfileMutation.isPending || !fullName.trim()}
            >
              {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Cambiar Contraseña</CardTitle>
              <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nueva contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar contraseña</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
              />
            </div>
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-sm text-destructive">Las contraseñas no coinciden</p>
          )}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => changePasswordMutation.mutate()}
              disabled={changePasswordMutation.isPending || !newPassword || newPassword !== confirmPassword}
            >
              {changePasswordMutation.isPending ? 'Actualizando...' : 'Cambiar Contraseña'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
