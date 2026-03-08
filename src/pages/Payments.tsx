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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarClock, AlertTriangle, CheckCircle, XCircle, Search, Building2,
  CreditCard, Clock, RefreshCw, RotateCcw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, FileDown, Receipt, History
} from 'lucide-react';
import { format, differenceInDays, isPast, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils/formatters';
import { generateExpirationReportPDF, generateInvoicePDF, generatePaymentHistoryPDF } from '@/lib/utils/pdfGenerators';

type TenantWithPlan = {
  id: string;
  name: string;
  slug: string;
  plan_id: string | null;
  plan_started_at: string | null;
  plan_expires_at: string | null;
  is_active: boolean;
  city: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  plans: { id: string; name: string; price_monthly: number } | null;
};

type PlanOption = { id: string; name: string; price_monthly: number; max_spaces: number };

type PaymentRecord = {
  id: string;
  tenant_id: string;
  plan_name: string;
  amount: number;
  months: number;
  previous_expires_at: string | null;
  new_expires_at: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
  tenants: { name: string } | null;
};

function getExpirationStatus(expiresAt: string | null) {
  if (!expiresAt) return { label: 'Sin plan', variant: 'outline' as const, icon: XCircle, daysLeft: null, statusText: 'Sin plan' };
  const days = differenceInDays(new Date(expiresAt), new Date());
  if (days < 0) return { label: 'Vencido', variant: 'destructive' as const, icon: XCircle, daysLeft: days, statusText: 'Vencido' };
  if (days <= 7) return { label: `${days}d restantes`, variant: 'destructive' as const, icon: AlertTriangle, daysLeft: days, statusText: 'Por vencer' };
  if (days <= 15) return { label: `${days}d restantes`, variant: 'secondary' as const, icon: Clock, daysLeft: days, statusText: 'Por vencer' };
  if (days <= 30) return { label: `${days}d restantes`, variant: 'default' as const, icon: CalendarClock, daysLeft: days, statusText: 'Activo' };
  return { label: `${days}d restantes`, variant: 'outline' as const, icon: CheckCircle, daysLeft: days, statusText: 'Activo' };
}

const DURATION_OPTIONS = [
  { label: '1 mes', value: 1 },
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 },
  { label: '12 meses', value: 12 },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function Pagination({ page, totalPages, setPage, pageSize, onPageSizeChange, totalItems }: { 
  page: number; totalPages: number; setPage: (p: number) => void; 
  pageSize: number; onPageSizeChange: (s: number) => void; totalItems: number;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{totalItems} registros — Pág. {page} de {totalPages}</span>
        <Select value={String(pageSize)} onValueChange={v => { onPageSizeChange(Number(v)); }}>
          <SelectTrigger className="h-7 w-[70px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(1)}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
          {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
            let pn: number;
            if (totalPages <= 3) pn = i + 1;
            else if (page <= 2) pn = i + 1;
            else if (page >= totalPages - 1) pn = totalPages - 2 + i;
            else pn = page - 1 + i;
            return <Button key={pn} variant={pn === page ? 'default' : 'outline'} size="icon" className="h-8 w-8 text-xs" onClick={() => setPage(pn)}>{pn}</Button>;
          })}
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(totalPages)}><ChevronsRight className="h-3.5 w-3.5" /></Button>
        </div>
      )}
    </div>
  );
}

export default function Payments() {
  const { role } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const isSuperadmin = role === 'superadmin';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [renewTenant, setRenewTenant] = useState<TenantWithPlan | null>(null);
  const [renewPlanId, setRenewPlanId] = useState('');
  const [renewMonths, setRenewMonths] = useState(1);
  const [page, setPage] = useState(1);
  const [histPage, setHistPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [histPageSize, setHistPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('status');

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
        .select('id, name, slug, plan_id, plan_started_at, plan_expires_at, is_active, city, address, phone, email, logo_url, plans(id, name, price_monthly)')
        .eq('is_active', true)
        .order('plan_expires_at', { ascending: true, nullsFirst: false });
      if (!isSuperadmin && tenant?.id) query = query.eq('id', tenant.id);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as TenantWithPlan[];
    },
  });

  // Payment history
  const { data: history = [], isLoading: histLoading } = useQuery({
    queryKey: ['payment-history', isSuperadmin, tenant?.id],
    queryFn: async () => {
      let query = supabase
        .from('payment_history')
        .select('id, tenant_id, plan_name, amount, months, previous_expires_at, new_expires_at, payment_method, notes, created_at, tenants(name)')
        .order('created_at', { ascending: false });
      if (!isSuperadmin && tenant?.id) query = query.eq('tenant_id', tenant.id);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as PaymentRecord[];
    },
  });

  const renewMutation = useMutation({
    mutationFn: async () => {
      if (!renewTenant) throw new Error('No tenant');
      const planId = renewPlanId || renewTenant.plan_id;
      if (!planId) throw new Error('No plan');
      const selPlan = plans.find(p => p.id === planId);
      if (!selPlan) throw new Error('Plan not found');

      const baseDate = renewTenant.plan_expires_at && !isPast(new Date(renewTenant.plan_expires_at))
        ? new Date(renewTenant.plan_expires_at) : new Date();
      const newExpiration = addMonths(baseDate, renewMonths);
      const totalAmount = selPlan.price_monthly * renewMonths;

      // Update tenant
      const { error } = await supabase.from('tenants').update({
        plan_id: planId,
        plan_started_at: new Date().toISOString(),
        plan_expires_at: newExpiration.toISOString(),
      }).eq('id', renewTenant.id);
      if (error) throw error;

      // Insert payment history
      const { error: histErr } = await supabase.from('payment_history').insert({
        tenant_id: renewTenant.id,
        plan_id: planId,
        plan_name: selPlan.name,
        amount: totalAmount,
        months: renewMonths,
        previous_expires_at: renewTenant.plan_expires_at,
        new_expires_at: newExpiration.toISOString(),
        payment_method: 'manual',
      });
      if (histErr) console.error('History insert error:', histErr);

      // Generate invoice PDF
      const invoiceNumber = `INV-${format(new Date(), 'yyyyMMdd')}-${renewTenant.slug.toUpperCase().slice(0, 6)}`;
      await generateInvoicePDF({
        invoiceNumber,
        tenantName: renewTenant.name,
        tenantCity: renewTenant.city,
        tenantAddress: renewTenant.address,
        tenantPhone: renewTenant.phone,
        tenantEmail: renewTenant.email,
        planName: selPlan.name,
        priceMonthly: selPlan.price_monthly,
        months: renewMonths,
        totalAmount,
        previousExpires: renewTenant.plan_expires_at,
        newExpires: newExpiration.toISOString(),
        paymentDate: new Date().toISOString(),
        logoUrl: renewTenant.logo_url,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      toast({ title: '✅ Plan renovado', description: `Plan de "${renewTenant?.name}" actualizado. Factura descargada.` });
      setRenewTenant(null);
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
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
      if (statusFilter === 'warning') { if (!t.plan_expires_at) return false; const d = differenceInDays(new Date(t.plan_expires_at), new Date()); return d >= 0 && d <= 15; }
      if (statusFilter === 'active') { if (!t.plan_expires_at) return false; return differenceInDays(new Date(t.plan_expires_at), new Date()) > 15; }
      if (statusFilter === 'no-plan') return !t.plan_expires_at;
      return true;
    });
  }, [tenants, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const histTotalPages = Math.max(1, Math.ceil(history.length / histPageSize));
  const safeHistPage = Math.min(histPage, histTotalPages);
  const paginatedHist = history.slice((safeHistPage - 1) * histPageSize, safeHistPage * histPageSize);

  const stats = useMemo(() => {
    let expired = 0, warning = 0, active = 0, noPlan = 0;
    tenants.forEach(t => {
      if (!t.plan_expires_at) { noPlan++; return; }
      const d = differenceInDays(new Date(t.plan_expires_at), new Date());
      if (d < 0) expired++; else if (d <= 15) warning++; else active++;
    });
    return { expired, warning, active, noPlan };
  }, [tenants]);

  const previewExpiration = useMemo(() => {
    if (!renewTenant) return null;
    const base = renewTenant.plan_expires_at && !isPast(new Date(renewTenant.plan_expires_at))
      ? new Date(renewTenant.plan_expires_at) : new Date();
    return addMonths(base, renewMonths);
  }, [renewTenant, renewMonths]);

  const selectedPlan = plans.find(p => p.id === renewPlanId);

  const handleDownloadReport = () => {
    const rows = tenants.map(t => {
      const s = getExpirationStatus(t.plan_expires_at);
      return {
        name: t.name, city: t.city,
        planName: t.plans?.name || '',
        priceMonthly: t.plans?.price_monthly || 0,
        startedAt: t.plan_started_at,
        expiresAt: t.plan_expires_at,
        daysLeft: s.daysLeft,
        status: s.statusText,
      };
    });
    generateExpirationReportPDF(rows);
    toast({ title: 'PDF generado', description: 'Reporte de vencimientos descargado.' });
  };

  const handleDownloadHistoryPDF = () => {
    const rows = history.map(h => ({
      date: h.created_at,
      tenantName: h.tenants?.name || '—',
      planName: h.plan_name,
      months: h.months,
      amount: h.amount,
      previousExpires: h.previous_expires_at,
      newExpires: h.new_expires_at,
    }));
    generatePaymentHistoryPDF(rows);
    toast({ title: 'PDF generado', description: 'Historial de pagos descargado.' });
  };

  const handleDownloadInvoice = async (h: PaymentRecord) => {
    const t = tenants.find(t => t.id === h.tenant_id);
    const invoiceNumber = `INV-${format(new Date(h.created_at), 'yyyyMMdd')}-${(t?.slug || 'XX').toUpperCase().slice(0, 6)}`;
    await generateInvoicePDF({
      invoiceNumber,
      tenantName: t?.name || h.tenants?.name || '—',
      tenantCity: t?.city || '',
      tenantAddress: t?.address || null,
      tenantPhone: t?.phone || null,
      tenantEmail: t?.email || null,
      planName: h.plan_name,
      priceMonthly: h.amount / h.months,
      months: h.months,
      totalAmount: h.amount,
      previousExpires: h.previous_expires_at,
      newExpires: h.new_expires_at,
      paymentDate: h.created_at,
      logoUrl: t?.logo_url,
    });
    toast({ title: 'Factura descargada' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Pagos y Vencimientos</h1>
          <p className="text-sm text-muted-foreground">
            {isSuperadmin ? 'Control de vencimientos de todos los parqueaderos' : 'Estado de tu suscripción'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSuperadmin && (
            <>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadReport}>
                <FileDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reporte PDF</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => checkExpirations.mutate()} disabled={checkExpirations.isPending}>
                <RefreshCw className={`h-3.5 w-3.5 ${checkExpirations.isPending ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Verificar alertas</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats cards */}
      {isSuperadmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'active', label: 'Activos', icon: CheckCircle, color: 'text-emerald-500', count: stats.active },
            { key: 'warning', label: 'Por vencer', icon: AlertTriangle, color: 'text-amber-500', count: stats.warning },
            { key: 'expired', label: 'Vencidos', icon: XCircle, color: 'text-destructive', count: stats.expired },
            { key: 'no-plan', label: 'Sin plan', icon: CreditCard, color: 'text-muted-foreground', count: stats.noPlan },
          ].map(s => (
            <Card key={s.key} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setStatusFilter(s.key); setPage(1); setActiveTab('status'); }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{s.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="status" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Estado</TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5"><History className="h-3.5 w-3.5" />Historial</TabsTrigger>
        </TabsList>

        {/* ── Status Tab ── */}
        <TabsContent value="status" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar parqueadero..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="warning">Por vencer</SelectItem>
                <SelectItem value="expired">Vencidos</SelectItem>
                <SelectItem value="no-plan">Sin plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No se encontraron registros</TableCell></TableRow>
                    ) : paginated.map(t => {
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
                          <TableCell><span className="text-sm">{t.plans?.name || '—'}</span></TableCell>
                          <TableCell><span className="text-sm text-muted-foreground">{t.plan_started_at ? format(new Date(t.plan_started_at), 'dd MMM yyyy', { locale: es }) : '—'}</span></TableCell>
                          <TableCell><span className="text-sm font-medium">{t.plan_expires_at ? format(new Date(t.plan_expires_at), 'dd MMM yyyy', { locale: es }) : '—'}</span></TableCell>
                          <TableCell><Badge variant={status.variant} className="gap-1"><StatusIcon className="h-3 w-3" />{status.label}</Badge></TableCell>
                          {isSuperadmin && (
                            <TableCell className="text-right">
                              <span className="font-medium">{t.plans?.price_monthly ? formatCurrency(t.plans.price_monthly) : '—'}</span>
                              {t.plans?.price_monthly ? <span className="text-xs text-muted-foreground">/mes</span> : null}
                            </TableCell>
                          )}
                          {isSuperadmin && (
                            <TableCell className="text-center">
                              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openRenewDialog(t)}>
                                <RotateCcw className="h-3 w-3" />Renovar
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Pagination page={safePage} totalPages={totalPages} setPage={setPage} pageSize={pageSize} onPageSizeChange={s => { setPageSize(s); setPage(1); }} totalItems={filtered.length} />
        </TabsContent>

        {/* ── History Tab ── */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{history.length} transacciones registradas</p>
            {history.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadHistoryPDF}>
                <FileDown className="h-3.5 w-3.5" />Exportar PDF
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      {isSuperadmin && <TableHead>Parqueadero</TableHead>}
                      <TableHead>Plan</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead>Nuevo venc.</TableHead>
                      <TableHead className="text-center">Factura</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {histLoading ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
                    ) : history.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No hay registros de pagos aún</TableCell></TableRow>
                    ) : paginatedHist.map(h => (
                      <TableRow key={h.id}>
                        <TableCell><span className="text-sm">{format(new Date(h.created_at), 'dd MMM yyyy HH:mm', { locale: es })}</span></TableCell>
                        {isSuperadmin && <TableCell><span className="text-sm font-medium">{h.tenants?.name || '—'}</span></TableCell>}
                        <TableCell><Badge variant="outline">{h.plan_name}</Badge></TableCell>
                        <TableCell><span className="text-sm">{h.months} mes{h.months > 1 ? 'es' : ''}</span></TableCell>
                        <TableCell className="text-right"><span className="font-medium">{formatCurrency(h.amount)}</span></TableCell>
                        <TableCell><span className="text-sm">{format(new Date(h.new_expires_at), 'dd MMM yyyy', { locale: es })}</span></TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => handleDownloadInvoice(h)}>
                            <Receipt className="h-3.5 w-3.5" />PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Pagination page={safeHistPage} totalPages={histTotalPages} setPage={setHistPage} />
        </TabsContent>
      </Tabs>

      {/* Renew Dialog */}
      <Dialog open={!!renewTenant} onOpenChange={open => !open && setRenewTenant(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5" />Renovar Plan</DialogTitle>
            <DialogDescription>Renovar o cambiar el plan de <strong>{renewTenant?.name}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {renewTenant?.plan_expires_at && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground">Vencimiento actual</p>
                <p className="font-medium text-sm">{format(new Date(renewTenant.plan_expires_at), "dd 'de' MMMM yyyy", { locale: es })}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Plan: {renewTenant.plans?.name || 'Sin plan'}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm">Plan</Label>
              <Select value={renewPlanId} onValueChange={setRenewPlanId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price_monthly)}/mes ({p.max_spaces} espacios)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Duración</Label>
              <Select value={String(renewMonths)} onValueChange={v => setRenewMonths(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DURATION_OPTIONS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {previewExpiration && selectedPlan && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                <p className="text-xs font-medium text-primary">Resumen de renovación</p>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Plan</span><span className="font-medium">{selectedPlan.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Nuevo vencimiento</span><span className="font-medium">{format(previewExpiration, 'dd MMM yyyy', { locale: es })}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span className="font-bold">{formatCurrency(selectedPlan.price_monthly * renewMonths)}</span></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewTenant(null)}>Cancelar</Button>
            <Button onClick={() => renewMutation.mutate()} disabled={!renewPlanId || renewMutation.isPending}>
              {renewMutation.isPending ? 'Renovando...' : 'Confirmar y generar factura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
