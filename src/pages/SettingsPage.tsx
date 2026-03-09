import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { useThemeColor, COLOR_PRESETS } from '@/hooks/useThemeColor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Lock, Building2, MapPin, Phone, Mail, Palette, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import MapLocationPicker from '@/components/MapLocationPicker';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { profile, user, updatePassword, role, tenantId } = useAuth();
  const { tenant, planModules } = useTenant();
  const { colorData, currentHex, isDirty, previewPreset, previewCustomHex, save: saveColor, revert: revertColor, presets } = useThemeColor();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customHex, setCustomHex] = useState('');

  // Profile form
  const [fullName, setFullName] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Tenant form
  const [tName, setTName] = useState('');
  const [tAddress, setTAddress] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tLat, setTLat] = useState('');
  const [tLng, setTLng] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setUserPhone(profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    if (tenant) {
      setTName(tenant.name);
      setTAddress(tenant.address || '');
      setTPhone(tenant.phone || '');
      setTEmail(tenant.email || '');
      setTLat(tenant.latitude ? String(tenant.latitude) : '');
      setTLng(tenant.longitude ? String(tenant.longitude) : '');
      setLogoPreview(tenant.logo_url);
    }
  }, [tenant]);

  const isAdmin = role === 'admin';

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!fullName.trim()) throw new Error('El nombre es obligatorio');
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: fullName.trim(), phone: userPhone.trim() || null })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => toast.success('Perfil actualizado'),
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!newPassword || newPassword.length < 6) throw new Error('Mínimo 6 caracteres');
      if (newPassword !== confirmPassword) throw new Error('Las contraseñas no coinciden');
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const updateTenantMutation = useMutation({
    mutationFn: async () => {
      if (!tName.trim()) throw new Error('El nombre del parqueadero es obligatorio');
      if (!tenantId) throw new Error('Sin parqueadero asignado');
      const { error } = await supabase
        .from('tenants')
        .update({
          name: tName.trim(),
          address: tAddress.trim() || null,
          phone: tPhone.trim() || null,
          email: tEmail.trim() || null,
          latitude: tLat ? parseFloat(tLat) : null,
          longitude: tLng ? parseFloat(tLng) : null,
        })
        .eq('id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Parqueadero actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen no debe superar 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${tenantId}/logo.${ext}`;

      // Delete old logo if exists
      await supabase.storage.from('tenant-logos').remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from('tenant-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('tenant-logos')
        .getPublicUrl(filePath);

      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('tenants')
        .update({ logo_url: logoUrl })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      setLogoPreview(logoUrl);
      toast.success('Logo actualizado');
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error(`Error al subir logo: ${err.message}`);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    if (!tenantId) return;
    setUploadingLogo(true);
    try {
      // List and remove files in the tenant folder
      const { data: files } = await supabase.storage
        .from('tenant-logos')
        .list(tenantId);

      if (files && files.length > 0) {
        await supabase.storage
          .from('tenant-logos')
          .remove(files.map(f => `${tenantId}/${f.name}`));
      }

      const { error } = await supabase
        .from('tenants')
        .update({ logo_url: null })
        .eq('id', tenantId);

      if (error) throw error;

      setLogoPreview(null);
      toast.success('Logo eliminado');
      queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const fadeIn = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground">Administra tu perfil y los datos de tu parqueadero</p>
      </div>

      {/* Tenant Settings (admin only) */}
      {isAdmin && tenant && (
        <motion.div {...fadeIn} transition={{ delay: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle>Datos del Parqueadero</CardTitle>
                  <CardDescription>Información pública de tu parqueadero</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Section */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Image className="h-4 w-4" /> Logo del Parqueadero
                </Label>
                <div className="flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="h-20 w-20 rounded-lg object-cover border border-border shadow-sm"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted">
                        <Building2 className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {uploadingLogo ? 'Subiendo...' : 'Subir logo'}
                    </Button>
                    {logoPreview && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2 text-destructive hover:text-destructive"
                        onClick={handleRemoveLogo}
                        disabled={uploadingLogo}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    )}
                    <p className="text-[11px] text-muted-foreground">PNG, JPG. Máx 2MB.</p>
                  </div>
                </div>
              </div>

              {/* Name & Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del parqueadero *</Label>
                  <Input
                    value={tName}
                    onChange={(e) => setTName(e.target.value)}
                    placeholder="Mi Parqueadero"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Dirección
                  </Label>
                  <Input
                    value={tAddress}
                    onChange={(e) => setTAddress(e.target.value)}
                    placeholder="Calle 0 #0-00"
                  />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Teléfono
                  </Label>
                  <Input
                    value={tPhone}
                    onChange={(e) => setTPhone(e.target.value)}
                    placeholder="+57 300 000 0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </Label>
                  <Input
                    type="email"
                    value={tEmail}
                    onChange={(e) => setTEmail(e.target.value)}
                    placeholder="contacto@parqueadero.com"
                  />
                </div>
              </div>

              {/* Map Location Picker */}
              <MapLocationPicker
                lat={parseFloat(tLat) || 10.4735}
                lng={parseFloat(tLng) || -73.2503}
                onChange={(lat, lng) => { setTLat(String(lat)); setTLng(String(lng)); }}
              />

              <div className="flex justify-end">
                <Button
                  onClick={() => updateTenantMutation.mutate()}
                  disabled={updateTenantMutation.isPending || !tName.trim()}
                >
                  {updateTenantMutation.isPending ? 'Guardando...' : 'Guardar Parqueadero'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Profile Settings */}
      <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
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
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} placeholder="Tu nombre" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={userPhone} onChange={(e) => setUserPhone(e.target.value)} maxLength={20} placeholder="+57 300 000 0000" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending || !fullName.trim()}>
                {updateProfileMutation.isPending ? 'Guardando...' : 'Guardar Perfil'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Theme Color - only if plan includes theme_color module or user is superadmin, and not viewer */}
      {role !== 'viewer' && (role === 'superadmin' || planModules.length === 0 || planModules.includes('theme_color')) && (
      <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
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
                      className={cn(
                        'relative flex flex-col items-center gap-1.5 group'
                      )}
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
      </motion.div>
      )}

      {/* Password */}
      <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
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
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-2">
                <Label>Confirmar contraseña</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" />
              </div>
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-sm text-destructive">Las contraseñas no coinciden</p>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => changePasswordMutation.mutate()} disabled={changePasswordMutation.isPending || !newPassword || newPassword !== confirmPassword}>
                {changePasswordMutation.isPending ? 'Actualizando...' : 'Cambiar Contraseña'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
