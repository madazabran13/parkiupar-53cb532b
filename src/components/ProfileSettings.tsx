import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Lock, Palette, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfileSettings() {
  const { profile, user, updatePassword } = useAuth();
  const { colorData, currentHex, isDirty, previewPreset, previewCustomHex, save: saveColor, revert: revertColor, presets } = useThemeColor();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [customHex, setCustomHex] = useState('');

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
      setNewPassword(''); setConfirmPassword('');
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

      {/* Theme Color - hidden for viewer role */}
      {profile?.role !== 'viewer' && profile?.role !== 'conductor' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Color del Tema</CardTitle>
                <CardDescription>Personaliza el color principal de la aplicación</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Preset colors */}
            <div className="space-y-2">
              <Label>Colores predeterminados</Label>
              <div className="flex flex-wrap gap-3">
                {presets.map((preset) => {
                  const isActive = colorData.preset === preset.name;
                  const bgColor = `hsl(${preset.hue}, ${preset.saturation}%, ${preset.lightness}%)`;
                  return (
                    <button
                      key={preset.name}
                      onClick={() => previewPreset(preset.name)}
                      className="relative flex flex-col items-center gap-1.5 group"
                      title={preset.label}
                    >
                      <div
                        className={cn(
                          'h-10 w-10 rounded-full border-2 transition-all flex items-center justify-center shadow-sm',
                          isActive ? 'border-foreground scale-110 shadow-md' : 'border-transparent hover:scale-105 hover:shadow-md'
                        )}
                        style={{ backgroundColor: bgColor }}
                      >
                        {isActive && <Check className="h-4 w-4 text-white drop-shadow-sm" />}
                      </div>
                      <span className={cn(
                        'text-[10px]',
                        isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      )}>
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom color picker */}
            <div className="space-y-2">
              <Label>Color personalizado</Label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="color"
                    value={currentHex}
                    onChange={(e) => {
                      setCustomHex(e.target.value);
                      previewCustomHex(e.target.value);
                    }}
                    className="h-10 w-10 rounded-full cursor-pointer border border-border appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-moz-color-swatch]:rounded-full [&::-moz-color-swatch]:border-none"
                  />
                </div>
                <Input
                  value={customHex || currentHex}
                  onChange={(e) => {
                    setCustomHex(e.target.value);
                    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                      previewCustomHex(e.target.value);
                    }
                  }}
                  placeholder="#3b82f6"
                  className="w-32 font-mono text-sm"
                  maxLength={7}
                />
                <div
                  className="h-8 flex-1 rounded-md border border-border"
                  style={{ backgroundColor: `hsl(var(--primary))` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">Selecciona un color o ingresa un código hexadecimal</p>
            </div>

            {/* Save / Revert buttons */}
            <div className="flex justify-end gap-2">
              {isDirty && (
                <Button variant="outline" onClick={() => { revertColor(); setCustomHex(''); }}>
                  Cancelar
                </Button>
              )}
              <Button
                onClick={() => { saveColor(); toast.success('Color guardado'); }}
                disabled={!isDirty}
              >
                {isDirty ? 'Guardar Color' : 'Color guardado'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
