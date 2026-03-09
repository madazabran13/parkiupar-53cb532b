import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, ShieldOff, Send, LogOut, CheckCircle2, Loader2 } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtime } from '@/hooks/useRealtime';

export default function SuspendedAccount() {
  const { user, profile, signOut } = useAuth();
  const { tenant, refetch: refetchTenant } = useTenant();
  const navigate = useNavigate();
  const [requestCount, setRequestCount] = useState(0);
  const [isReactivated, setIsReactivated] = useState(false);

  // Poll tenant status to detect reactivation
  const { data: tenantStatus } = useQuery({
    queryKey: ['tenant-status', tenant?.id],
    enabled: !!tenant?.id,
    refetchInterval: 5000, // Check every 5 seconds
    queryFn: async () => {
      const { data } = await supabase
        .from('tenants')
        .select('is_active')
        .eq('id', tenant!.id)
        .single();
      return data;
    },
  });

  // Realtime subscription for tenant changes
  useRealtime({
    table: 'tenants',
    filter: tenant?.id ? `id=eq.${tenant.id}` : undefined,
    queryKeys: [['tenant-status', tenant?.id]],
  });

  // Detect when tenant is reactivated
  useEffect(() => {
    if (tenantStatus?.is_active === true) {
      setIsReactivated(true);
    }
  }, [tenantStatus?.is_active]);

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').insert({
        user_id: null, // global notification visible to superadmin
        tenant_id: tenant?.id || null,
        type: 'warning',
        title: 'Solicitud de reactivación',
        message: `El parqueadero "${tenant?.name || 'Desconocido'}" (admin: ${profile?.full_name || user?.email}) solicita la reactivación de su cuenta.`,
        metadata: { tenant_id: tenant?.id, requester_id: user?.id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setRequestCount(prev => prev + 1);
      toast({ title: '✅ Solicitud enviada', description: 'El administrador ha sido notificado. Te contactaremos pronto.' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleLoginAgain = async () => {
    await signOut();
    navigate('/login');
  };

  // Show reactivated state
  if (isReactivated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-lg"
        >
          <Card className="border-emerald-500/30 shadow-2xl overflow-hidden">
            {/* Header banner */}
            <div className="bg-gradient-to-r from-emerald-500/90 to-emerald-600/70 p-6 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <div className="mx-auto h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl font-bold text-white"
              >
                ¡Cuenta Reactivada!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/80 text-sm mt-1"
              >
                Tu acceso ha sido restaurado exitosamente
              </motion.p>
            </div>

            <CardContent className="p-6 space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center"
              >
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  El administrador ha reactivado tu cuenta
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Por favor, inicia sesión nuevamente para acceder a todas las funcionalidades de la plataforma.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleLoginAgain}
                >
                  <LogOut className="h-4 w-4" />
                  Iniciar sesión nuevamente
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-lg"
      >
        <Card className="border-destructive/30 shadow-2xl overflow-hidden">
          {/* Header banner */}
          <div className="bg-gradient-to-r from-destructive/90 to-destructive/70 p-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <div className="mx-auto h-16 w-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
                <ShieldOff className="h-8 w-8 text-white" />
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-xl font-bold text-white"
            >
              Cuenta Suspendida
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/80 text-sm mt-1"
            >
              Tu acceso ha sido deshabilitado temporalmente
            </motion.p>
          </div>

          <CardContent className="p-6 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">¿Por qué estoy viendo esto?</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    La suscripción de <strong>{tenant?.name || 'tu parqueadero'}</strong> se encuentra inactiva.
                    Para continuar utilizando el software es necesario renovar o reactivar tu suscripción.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-2"
            >
              <p className="text-sm text-muted-foreground text-center">
                Contacta al administrador de la plataforma para renovar tu plan y recuperar el acceso completo.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-3"
            >
              {requestCount === 0 ? (
                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => reactivateMutation.mutate()}
                  disabled={reactivateMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                  {reactivateMutation.isPending ? 'Enviando solicitud...' : 'Solicitar reactivación'}
                </Button>
              ) : (
                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        Esperando activación...
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Solicitud enviada ({requestCount} {requestCount === 1 ? 'vez' : 'veces'}). 
                      Esta página se actualizará automáticamente cuando tu cuenta sea reactivada.
                    </p>
                  </motion.div>
                  <Button
                    variant="secondary"
                    className="w-full gap-2"
                    size="sm"
                    onClick={() => reactivateMutation.mutate()}
                    disabled={reactivateMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                    {reactivateMutation.isPending ? 'Enviando...' : 'Enviar otra solicitud'}
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-[10px] text-muted-foreground text-center"
            >
              Si crees que esto es un error, contacta directamente al soporte técnico.
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}