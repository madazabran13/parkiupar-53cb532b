import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CreditCard, Check, ArrowRight, Clock, CheckCircle2, XCircle, CalendarDays, CalendarClock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import { motion } from 'framer-motion';
import type { Plan } from '@/types';

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  parking: 'Gestión de Vehículos',
  customers: 'Clientes',
  rates: 'Tarifas',
  capacity: 'Control de Aforo',
  reports: 'Reportes',
  reports_download: 'Descarga de Reportes PDF',
  map: 'Mapa',
  team: 'Gestión de Usuarios',
  settings: 'Configuración',
  audit: 'Auditoría',
  payments: 'Pagos y Facturación',
  my_plan: 'Mi Plan',
  theme_color: 'Color del Tema',
};

export default function MyPlan() {
  const { tenantId } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [message, setMessage] = useState('');

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data } = await supabase.from('plans').select('*').eq('is_active', true).order('price_monthly');
      return (data || []) as unknown as Plan[];
    },
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-plan-requests', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from('plan_requests')
        .select('*, requested_plan:plans!plan_requests_requested_plan_id_fkey(name, price_monthly)')
        .eq('tenant_id', tenantId!)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const currentPlan = plans.find(p => p.id === tenant?.plan_id);
  const hasPendingRequest = myRequests.some((r: any) => r.status === 'pending');

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlan || !tenantId) throw new Error('Datos incompletos');
      const { error } = await supabase.from('plan_requests').insert({
        tenant_id: tenantId,
        current_plan_id: tenant?.plan_id || null,
        requested_plan_id: selectedPlan.id,
        message: message || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Solicitud de cambio de plan enviada');
      setRequestDialogOpen(false);
      setSelectedPlan(null);
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['my-plan-requests'] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'destructive' }> = {
    pending: { label: 'Pendiente', icon: Clock, variant: 'secondary' },
    approved: { label: 'Aprobada', icon: CheckCircle2, variant: 'default' },
    rejected: { label: 'Rechazada', icon: XCircle, variant: 'destructive' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mi Plan</h1>
        <p className="text-muted-foreground">Gestiona tu suscripción y solicita cambios de plan</p>
      </div>

      {/* Current Plan */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <CreditCard className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Plan Actual</CardTitle>
                <CardDescription>{currentPlan ? currentPlan.name : 'Sin plan asignado'}</CardDescription>
              </div>
            </div>
          </CardHeader>
          {currentPlan && (
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Precio mensual</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(currentPlan.price_monthly)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Espacios máximos</p>
                  <p className="text-xl font-bold text-foreground">{currentPlan.max_spaces}</p>
                </div>
                {tenant?.plan_started_at && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Fecha de inicio</p>
                    <p className="text-lg font-semibold text-foreground">
                      {new Date(tenant.plan_started_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}
                {tenant?.plan_expires_at && (() => {
                  const daysLeft = Math.ceil((new Date(tenant.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const expired = daysLeft < 0;
                  const expiringSoon = daysLeft >= 0 && daysLeft <= 7;
                  return (
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Fecha de vencimiento</p>
                      <p className={`text-lg font-semibold ${expired ? 'text-destructive' : expiringSoon ? 'text-amber-500' : 'text-foreground'}`}>
                        {new Date(tenant.plan_expires_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {expired && <Badge variant="destructive" className="mt-1">Plan vencido</Badge>}
                      {expiringSoon && !expired && <Badge variant="secondary" className="mt-1 text-amber-600 border-amber-500/30">Vence en {daysLeft} día{daysLeft !== 1 ? 's' : ''}</Badge>}
                    </div>
                  );
                })()}
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Módulos incluidos</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(Array.isArray(currentPlan.modules) ? currentPlan.modules : []).map((m: string) => (
                    <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Available Plans */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Planes Disponibles</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, i) => {
            const isCurrent = plan.id === tenant?.plan_id;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className={`relative ${isCurrent ? 'border-primary ring-1 ring-primary/20' : ''}`}>
                  {isCurrent && (
                    <Badge className="absolute -top-2.5 left-4 text-[10px]">Plan actual</Badge>
                  )}
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    {plan.description && <CardDescription className="text-xs">{plan.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="text-2xl font-bold text-foreground">{formatCurrency(plan.price_monthly)}</span>
                      <span className="text-sm text-muted-foreground">/mes</span>
                    </div>
                    <ul className="space-y-1.5">
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        Hasta {plan.max_spaces} espacios
                      </li>
                      {(Array.isArray(plan.modules) ? plan.modules : []).map((m: string) => (
                        <li key={m} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" />
                          {m}
                        </li>
                      ))}
                    </ul>
                    {!isCurrent && (
                      <Button
                        className="w-full gap-2"
                        variant="outline"
                        disabled={hasPendingRequest}
                        onClick={() => { setSelectedPlan(plan); setRequestDialogOpen(true); }}
                      >
                        {hasPendingRequest ? 'Solicitud pendiente' : <>Solicitar cambio <ArrowRight className="h-4 w-4" /></>}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Request History */}
      {myRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Historial de Solicitudes</h2>
          <div className="space-y-2">
            {myRequests.map((req: any) => {
              const config = statusConfig[req.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <Card key={req.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusIcon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          Cambio a <span className="font-semibold">{req.requested_plan?.name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {req.message && ` · "${req.message}"`}
                        </p>
                        {req.admin_notes && (
                          <p className="text-xs text-muted-foreground mt-0.5">Nota: {req.admin_notes}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Request Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Cambio de Plan</DialogTitle>
            <DialogDescription>
              Cambiar de <strong>{currentPlan?.name || 'Sin plan'}</strong> a <strong>{selectedPlan?.name}</strong> ({formatCurrency(selectedPlan?.price_monthly || 0)}/mes)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Mensaje (opcional)</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe un mensaje para el administrador..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => requestMutation.mutate()} disabled={requestMutation.isPending}>
              {requestMutation.isPending ? 'Enviando...' : 'Enviar Solicitud'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
