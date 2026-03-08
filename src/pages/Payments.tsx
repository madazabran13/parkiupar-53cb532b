import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { CalendarClock, AlertTriangle, CheckCircle, XCircle, Search, Building2, CreditCard, Clock, RefreshCw, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { format, differenceInDays, isPast, addMonths, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

type TenantWithPlan = {
  id: string;
  name: string;
  slug: string;
  plan_id: string | null;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  is_active: boolean;
  city: string;
  plans: { id: string; name: string; price_monthly: number } | null;
};

type PlanOption = {
  id: string;
  name: string;
  price_monthly: number;
  max_spaces: number;
};

function getExpirationStatus(expiresAt: string | null): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle; daysLeft: number | null } {
  if (!expiresAt) return { label: 'Sin plan', variant: 'outline', icon: XCircle, daysLeft: null };
  const days = differenceInDays(new Date(expiresAt), new Date());
  if (days < 0) return { label: 'Vencido', variant: 'destructive', icon: XCircle, daysLeft: days };
  if (days <= 7) return { label: `${days}d restantes`, variant: 'destructive', icon: AlertTriangle, daysLeft: days };
  if (days <= 15) return { label: `${days}d restantes`, variant: 'secondary', icon: Clock, daysLeft: days };
  if (days <= 30) return { label: `${days}d restantes`, variant: 'default', icon: CalendarClock, daysLeft: days };
  return { label: `${days}d restantes`, variant: 'outline', icon: CheckCircle, daysLeft: days };
}

const DURATION_OPTIONS = [
  { label: '1 mes', value: 1 },
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
];

export default function Payments() {
  const { role } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const isSuperadmin = role === 'superadmin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [renewTenant, setRenewTenant] = useState<TenantWithPlan | null>(null);
  const [renewPlanId, setRenewPlanId] = useState<string>('');
  const [renewMonths, setRenewMonths] = useState<number>(1);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const checkExpirations = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-expirations');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Alertas verificadas', description: 'Se revisaron todos los vencimientos.' });
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['all-plans'],
    enabled: isSuperadmin,
    queryFn: async () => {
      const { data } = await supabase.from('plans').select('id, name, price_monthly, max_spaces').eq('is_active', true).order('price_monthly');
      return (data || []) as PlanOption[];
    },
  });

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['payments-tenants', isSuperadmin, tenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('tenants')
        .select('id, name, slug, plan_id, plan_started_at, plan_expires_at, is_active, city, plans(id, name, price_monthly)')
        .eq('is_active', true)
        .order('plan_expires_at', { ascending: true, nullsFirst: false });

      if (!isSuperadmin && tenant?.id) {
        query = query.eq('id', tenant.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as TenantWithPlan[];
    },
  });

  const renewMutation = useMutation({
    mutationFn: async () => {
      if (!renewTenant) throw new Error('No tenant selected');
      const planId = renewPlanId || renewTenant.plan_id;
      if (!planId) throw new Error('No plan selected');

      // Calculate new expiration: from current expiration (if still valid) or from now
      const baseDate = renewTenant.plan_expires_at && !isPast(new Date(renewTenant.plan_expires_at))
        ? new Date(renewTenant.plan_expires_at)
        : new Date();
      const newExpiration = addMonths(baseDate, renewMonths);

      const { error } = await supabase
        .from('tenants')
        .update({
          plan_id: planId,
          plan_started_at: new Date().toISOString(),
          plan_expires_at: newExpiration.toISOString(),
        })
        .eq('id', renewTenant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-tenants'] });
      toast({ title: '✅ Plan renovado', description: `El plan de "${renewTenant?.name}" fue actualizado exitosamente.` });
      setRenewTenant(null);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const openRenewDialog = (t: TenantWithPlan) => {
    setRenewTenant(t);
    setRenewPlanId(t.plan_id || '');
    setRenewMonths(1);
  };

  const filtered = useMemo(() => {
    return tenants.filter(t => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter === 'expired') return t.plan_expires_at && isPast(new Date(t.plan_expires_at));
      if (statusFilter === 'warning') {
        if (!t.plan_expires_at) return false;
        const days = differenceInDays(new Date(t.plan_expires_at), new Date());
        return days >= 0 && days <= 15;
      }
      if (statusFilter === 'active') {
        if (!t.plan_expires_at) return false;
        const days = differenceInDays(new Date(t.plan_expires_at), new Date());
        return days > 15;
      }
      if (statusFilter === 'no-plan') return !t.plan_expires_at;
      return true;
    });
  }, [tenants, search, statusFilter]);

  const stats = useMemo(() => {
    let expired = 0, warning = 0, active = 0, noPlan = 0;
    tenants.forEach(t => {
      if (!t.plan_expires_at) { noPlan++; return; }
      const days = differenceInDays(new Date(t.plan_expires_at), new Date());
      if (days < 0) expired++;
      else if (days <= 15) warning++;
      else active++;
    });
    return { expired, warning, active, noPlan };
  }, [tenants]);

  // Preview new expiration for dialog
  const previewExpiration = useMemo(() => {
    if (!renewTenant) return null;
    const baseDate = renewTenant.plan_expires_at && !isPast(new Date(renewTenant.plan_expires_at))
      ? new Date(renewTenant.plan_expires_at)
      : new Date();
    return addMonths(baseDate, renewMonths);
  }, [renewTenant, renewMonths]);

  const selectedPlan = plans.find(p => p.id === renewPlanId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4 sm:space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Pagos y Vencimientos</h1>
          <p className="text-sm text-muted-foreground">
            {isSuperadmin ? 'Control de vencimientos de todos los parqueaderos' : 'Estado de tu suscripción'}
          </p>
        </div>
        {isSuperadmin && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => checkExpirations.mutate()}
            disabled={checkExpirations.isPending}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checkExpirations.isPending ? 'animate-spin' : ''}`} />
            Verificar alertas
          </Button>
        )}
      </div>

      {/* Stats cards */}
      {isSuperadmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter('active')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Activos</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter('warning')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Por vencer</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.warning}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter('expired')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Vencidos</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.expired}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setStatusFilter('no-plan')}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Sin plan</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.noPlan}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar parqueadero..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="warning">Por vencer</SelectItem>
            <SelectItem value="expired">Vencidos</SelectItem>
            <SelectItem value="no-plan">Sin plan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parqueadero</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  {isSuperadmin && <TableHead className="text-right">Precio</TableHead>}
                  {isSuperadmin && <TableHead className="text-center">Acción</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={isSuperadmin ? 7 : 5} className="text-center py-8 text-muted-foreground">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSuperadmin ? 7 : 5} className="text-center py-8 text-muted-foreground">
                      No se encontraron registros
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(t => {
                    const status = getExpirationStatus(t.plan_expires_at);
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div>
                              <p className="font-medium text-sm">{t.name}</p>
                              <p className="text-xs text-muted-foreground">{t.city}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{t.plans?.name || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {t.plan_started_at ? format(new Date(t.plan_started_at), 'dd MMM yyyy', { locale: es }) : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {t.plan_expires_at ? format(new Date(t.plan_expires_at), 'dd MMM yyyy', { locale: es }) : '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        {isSuperadmin && (
                          <TableCell className="text-right">
                            <span className="font-medium">
                              {t.plans?.price_monthly ? `$${Number(t.plans.price_monthly).toLocaleString()}` : '—'}
                            </span>
                            {t.plans?.price_monthly ? <span className="text-xs text-muted-foreground">/mes</span> : null}
                          </TableCell>
                        )}
                        {isSuperadmin && (
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs"
                              onClick={() => openRenewDialog(t)}
                            >
                              <RotateCcw className="h-3 w-3" />
                              Renovar
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Renewal Dialog */}
      <Dialog open={!!renewTenant} onOpenChange={(open) => !open && setRenewTenant(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Renovar Plan
            </DialogTitle>
            <DialogDescription>
              Renovar o cambiar el plan de <strong>{renewTenant?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Current status */}
            {renewTenant?.plan_expires_at && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground">Vencimiento actual</p>
                <p className="font-medium text-sm">
                  {format(new Date(renewTenant.plan_expires_at), "dd 'de' MMMM yyyy", { locale: es })}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Plan: {renewTenant.plans?.name || 'Sin plan'}
                </p>
              </div>
            )}

            {/* Plan selection */}
            <div className="space-y-1.5">
              <Label className="text-sm">Plan</Label>
              <Select value={renewPlanId} onValueChange={setRenewPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — ${Number(p.price_monthly).toLocaleString()}/mes ({p.max_spaces} espacios)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <Label className="text-sm">Duración</Label>
              <Select value={String(renewMonths)} onValueChange={(v) => setRenewMonths(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(d => (
                    <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {previewExpiration && selectedPlan && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                <p className="text-xs font-medium text-primary">Resumen de renovación</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{selectedPlan.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nuevo vencimiento</span>
                  <span className="font-medium">{format(previewExpiration, "dd MMM yyyy", { locale: es })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold">${(Number(selectedPlan.price_monthly) * renewMonths).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewTenant(null)}>Cancelar</Button>
            <Button
              onClick={() => renewMutation.mutate()}
              disabled={!renewPlanId || renewMutation.isPending}
            >
              {renewMutation.isPending ? 'Renovando...' : 'Confirmar renovación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
