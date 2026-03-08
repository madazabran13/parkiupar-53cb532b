import { useState } from 'react';
import ProfileSettings from '@/components/ProfileSettings';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Edit, Building2, CreditCard, Users, Car, Bell, CheckCircle2, XCircle, AlertTriangle, CalendarClock, RotateCw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';
import type { Tenant, Plan } from '@/types';
import { TableSkeleton } from '@/components/ui/PageSkeletons';

export default function SuperAdmin() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const currentTab = location.pathname.includes('/plans') ? 'plans' : location.pathname.includes('/users') ? 'users' : location.pathname.includes('/settings') ? 'settings' : 'tenants';

  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Tenant form
  const [tName, setTName] = useState('');
  const [tSlug, setTSlug] = useState('');
  const [tAddress, setTAddress] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tSpaces, setTSpaces] = useState('20');
  const [tLat, setTLat] = useState('10.4735');
  const [tLng, setTLng] = useState('-73.2503');
  const [tPlanId, setTPlanId] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Plan form
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pMaxSpaces, setPMaxSpaces] = useState('50');
  const [pModules, setPModules] = useState<string[]>(['dashboard', 'parking', 'customers', 'rates', 'capacity']);

  const ALL_MODULES = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'parking', label: 'Vehículos' },
    { key: 'customers', label: 'Clientes' },
    { key: 'rates', label: 'Tarifas' },
    { key: 'capacity', label: 'Aforo' },
    { key: 'reports', label: 'Reportes (solo ver)' },
    { key: 'reports_download', label: 'Reportes (descargar PDF)' },
    { key: 'map', label: 'Mapa' },
    { key: 'team', label: 'Gestión de Usuarios' },
    { key: 'settings', label: 'Configuración' },
    { key: 'audit', label: 'Auditoría' },
  ] as const;

  const { data: tenants = [], isLoading: loadingTenants } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
      return (data || []) as unknown as Tenant[];
    },
  });

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('plans').select('*').order('price_monthly');
      return (data || []) as unknown as Plan[];
    },
  });

  const { data: planRequests = [] } = useQuery({
    queryKey: ['plan-requests'],
    queryFn: async () => {
      const { data } = await supabase
        .from('plan_requests')
        .select('*, tenant:tenants(name), current_plan:plans!plan_requests_current_plan_id_fkey(name), requested_plan:plans!plan_requests_requested_plan_id_fkey(name, price_monthly)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const pendingRequests = planRequests.filter((r: any) => r.status === 'pending');

  const handleRequestAction = async (requestId: string, status: 'approved' | 'rejected', tenantId?: string, planId?: string, notes?: string) => {
    const { error } = await supabase.from('plan_requests').update({ status, admin_notes: notes || null }).eq('id', requestId);
    if (error) { toast.error(`Error: ${error.message}`); return; }
    if (status === 'approved' && tenantId && planId) {
      const plan = plans.find(p => p.id === planId);
      const tenant = tenants.find(t => t.id === tenantId);
      if (plan && tenant) {
        const occupied = tenant.total_spaces - tenant.available_spaces;
        const newAvailable = Math.max(plan.max_spaces - occupied, 0);
        const now = new Date().toISOString();
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        await supabase.from('tenants').update({
          plan_id: planId,
          total_spaces: plan.max_spaces,
          available_spaces: newAvailable,
          plan_started_at: now,
          plan_expires_at: expiresAt.toISOString(),
        }).eq('id', tenantId);
      }
    }
    toast.success(status === 'approved' ? 'Solicitud aprobada y plan actualizado' : 'Solicitud rechazada');
    queryClient.invalidateQueries({ queryKey: ['plan-requests'] });
    queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
  };

  // Global metrics
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.is_active).length;
  const totalActiveVehicles = tenants.reduce((sum, t) => sum + (t.total_spaces - t.available_spaces), 0);

  // Tenants with plans expiring within 7 days
  const expiringTenants = tenants.filter((t) => {
    if (!t.plan_expires_at) return false;
    const daysLeft = Math.ceil((new Date(t.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && daysLeft >= 0;
  });

  const expiredTenants = tenants.filter((t) => {
    if (!t.plan_expires_at) return false;
    return new Date(t.plan_expires_at).getTime() < Date.now();
  });

  const getDaysUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const resetTenantForm = () => {
    setTName(''); setTSlug(''); setTAddress(''); setTPhone(''); setTEmail('');
    setTSpaces('20');
    setTLat('10.4735'); setTLng('-73.2503'); setTPlanId('');
    setAdminName(''); setAdminEmail(''); setAdminPassword('');
    setEditingTenant(null);
  };

  const openEditTenant = (t: Tenant) => {
    setEditingTenant(t);
    setTName(t.name); setTSlug(t.slug); setTAddress(t.address || ''); setTPhone(t.phone || '');
    setTEmail(t.email || ''); setTSpaces(String(t.total_spaces)); setTLat(String(t.latitude || '')); setTLng(String(t.longitude || ''));
    setTPlanId(t.plan_id || '');
    setTenantDialogOpen(true);
  };

  const slugify = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const saveTenantMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const tenantData: Record<string, any> = {
        name: tName,
        slug: tSlug || slugify(tName),
        address: tAddress || null,
        phone: tPhone || null,
        email: tEmail || null,
        total_spaces: parseInt(tSpaces),
        available_spaces: editingTenant ? editingTenant.available_spaces : parseInt(tSpaces),
        latitude: tLat ? parseFloat(tLat) : null,
        longitude: tLng ? parseFloat(tLng) : null,
        plan_id: tPlanId || null,
      };

      // Set plan dates when assigning a plan
      if (tPlanId) {
        const hadPlanBefore = editingTenant?.plan_id;
        const planChanged = editingTenant?.plan_id !== tPlanId;
        if (!hadPlanBefore || planChanged) {
          tenantData.plan_started_at = now;
          tenantData.plan_expires_at = expiresAt.toISOString();
        }
      } else {
        tenantData.plan_started_at = null;
        tenantData.plan_expires_at = null;
      }

      if (editingTenant) {
        const { error } = await supabase.from('tenants').update(tenantData as any).eq('id', editingTenant.id);
        if (error) throw error;
      } else {
        // Create tenant
        const { data: newTenant, error } = await supabase.from('tenants').insert(tenantData as any).select('id').single();
        if (error) throw error;

        // Create admin user if credentials provided
        if (adminEmail && adminPassword && newTenant) {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: adminEmail,
            password: adminPassword,
            options: { data: { full_name: adminName } },
          });
          if (authError) throw authError;

          // Update the user profile to be admin of this tenant
          if (authData.user) {
            await supabase.from('user_profiles').update({
              tenant_id: newTenant.id,
              role: 'admin',
              full_name: adminName,
            }).eq('id', authData.user.id);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(editingTenant ? 'Parqueadero actualizado' : 'Parqueadero creado');
      setTenantDialogOpen(false);
      resetTenantForm();
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const toggleTenantMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('tenants').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tenants'] }),
  });

  // Plans CRUD
  const resetPlanForm = () => { setPName(''); setPDesc(''); setPPrice(''); setPMaxSpaces('50'); setPModules(['dashboard', 'parking', 'customers', 'rates', 'capacity']); setEditingPlan(null); };
  const openEditPlan = (p: Plan) => {
    setEditingPlan(p); setPName(p.name); setPDesc(p.description || ''); setPPrice(String(p.price_monthly)); setPMaxSpaces(String(p.max_spaces));
    setPModules(Array.isArray(p.modules) ? p.modules : ['dashboard', 'parking', 'customers', 'rates', 'capacity']);
    setPlanDialogOpen(true);
  };

  const savePlanMutation = useMutation({
    mutationFn: async () => {
      const finalModules = pModules.includes('reports_download') && !pModules.includes('reports')
        ? [...pModules, 'reports'] : pModules;
      const planData = { name: pName, description: pDesc || null, price_monthly: parseFloat(pPrice), max_spaces: parseInt(pMaxSpaces), modules: finalModules };
      if (editingPlan) {
        const { error } = await supabase.from('plans').update(planData).eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('plans').insert(planData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPlan ? 'Plan actualizado' : 'Plan creado');
      setPlanDialogOpen(false);
      resetPlanForm();
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const tenantColumns: Column<Tenant>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'slug', label: 'Slug', render: (r) => <Badge variant="outline">{r.slug}</Badge> },
    { key: 'email', label: 'Email' },
    { key: 'total_spaces', label: 'Espacios' },
    { key: 'available_spaces', label: 'Disponibles', render: (r) => (
      <Badge variant={r.available_spaces === 0 ? 'destructive' : 'secondary'}>{r.available_spaces}/{r.total_spaces}</Badge>
    )},
    { key: 'plan_expires_at', label: 'Vencimiento', render: (r) => {
      if (!r.plan_expires_at) return <span className="text-muted-foreground text-xs">Sin plan</span>;
      const days = getDaysUntilExpiry(r.plan_expires_at);
      const expired = days !== null && days < 0;
      const expiringSoon = days !== null && days >= 0 && days <= 7;
      return (
        <div className="flex items-center gap-1.5">
          {expired && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
          {expiringSoon && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
          <span className={`text-xs ${expired ? 'text-destructive font-semibold' : expiringSoon ? 'text-amber-500 font-medium' : 'text-muted-foreground'}`}>
            {new Date(r.plan_expires_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
            {expired ? ' (Vencido)' : expiringSoon ? ` (${days}d)` : ''}
          </span>
        </div>
      );
    }},
    { key: 'is_active', label: 'Estado', render: (r) => (
      <Switch checked={r.is_active} onCheckedChange={(checked) => toggleTenantMutation.mutate({ id: r.id, is_active: checked })} />
    )},
  ];

  const planColumns: Column<Plan>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'description', label: 'Descripción' },
    { key: 'price_monthly', label: 'Precio Mensual', render: (r) => formatCurrency(r.price_monthly) },
    { key: 'max_spaces', label: 'Max Espacios' },
    { key: 'modules', label: 'Módulos', render: (r) => (
      <div className="flex flex-wrap gap-1">{(Array.isArray(r.modules) ? r.modules : []).map((m: string) => <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>)}</div>
    )},
    { key: 'is_active', label: 'Activo', render: (r) => <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Sí' : 'No'}</Badge> },
  ];

  if (loadingTenants && loadingPlans) return <TableSkeleton columns={6} rows={5} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Super Administrador</h1>
        <p className="text-muted-foreground">Gestión global de la plataforma ParkingVpar</p>
      </div>

      {/* Global metrics */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Parqueaderos</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTenants}</div>
            <p className="text-xs text-muted-foreground">{activeTenants} activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vehículos Activos (Red)</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalActiveVehicles}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Planes Disponibles</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{plans.length}</div></CardContent>
        </Card>
      </div>

      {/* Expiration Alerts */}
      {(expiredTenants.length > 0 || expiringTenants.length > 0) && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Alertas de Vencimiento de Planes ({expiredTenants.length + expiringTenants.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiredTenants.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-destructive/20 bg-background">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-destructive">Plan vencido el {new Date(t.plan_expires_at!).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Vencido</Badge>
                  <Button
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={async () => {
                      const now = new Date();
                      const expiresAt = new Date();
                      expiresAt.setMonth(expiresAt.getMonth() + 1);
                      const { error } = await supabase.from('tenants').update({
                        plan_started_at: now.toISOString(),
                        plan_expires_at: expiresAt.toISOString(),
                      } as any).eq('id', t.id);
                      if (error) { toast.error(`Error: ${error.message}`); return; }
                      toast.success(`Plan de ${t.name} renovado por 30 días`);
                      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
                    }}
                  >
                    <RotateCw className="h-3 w-3" /> Renovar
                  </Button>
                </div>
              </div>
            ))}
            {expiringTenants.map((t) => {
              const days = getDaysUntilExpiry(t.plan_expires_at);
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-amber-500/20 bg-background">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-amber-500" />
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-amber-600">Vence en {days} día{days !== 1 ? 's' : ''} — {new Date(t.plan_expires_at!).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-amber-600 border-amber-500/30">Por vencer</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={async () => {
                        const expiresAt = new Date(t.plan_expires_at!);
                        expiresAt.setMonth(expiresAt.getMonth() + 1);
                        const { error } = await supabase.from('tenants').update({
                          plan_expires_at: expiresAt.toISOString(),
                        } as any).eq('id', t.id);
                        if (error) { toast.error(`Error: ${error.message}`); return; }
                        toast.success(`Plan de ${t.name} extendido 30 días más`);
                        queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
                      }}
                    >
                      <RotateCw className="h-3 w-3" /> Extender
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Tabs value={currentTab} onValueChange={(v) => navigate(v === 'tenants' ? '/superadmin' : `/superadmin/${v}`)}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="tenants" className="flex-1 sm:flex-none relative">
            Parqueaderos
            {pendingRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {pendingRequests.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex-1 sm:flex-none">Planes</TabsTrigger>
          <TabsTrigger value="users" className="flex-1 sm:flex-none">Usuarios</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 sm:flex-none">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="mt-4 space-y-4">
          {/* Pending Plan Requests */}
          {pendingRequests.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-500" />
                  Solicitudes de Cambio de Plan ({pendingRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingRequests.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-background">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        <span className="font-semibold">{req.tenant?.name}</span> solicita cambiar a <Badge variant="outline">{req.requested_plan?.name}</Badge>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Desde: {req.current_plan?.name || 'Sin plan'} · {new Date(req.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                        {req.message && ` · "${req.message}"`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Button size="sm" variant="default" className="h-7 gap-1 text-xs" onClick={() => handleRequestAction(req.id, 'approved', req.tenant_id, req.requested_plan_id)}>
                        <CheckCircle2 className="h-3 w-3" /> Aprobar
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-destructive" onClick={() => handleRequestAction(req.id, 'rejected')}>
                        <XCircle className="h-3 w-3" /> Rechazar
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button onClick={() => { resetTenantForm(); setTenantDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo Parqueadero
            </Button>
          </div>
          <DataTable
            columns={tenantColumns}
            data={tenants}
            loading={loadingTenants}
            searchPlaceholder="Buscar parqueaderos..."
            actions={(row) => (
              <Button size="sm" variant="ghost" onClick={() => openEditTenant(row)}><Edit className="h-3 w-3" /></Button>
            )}
          />
        </TabsContent>

        <TabsContent value="plans" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetPlanForm(); setPlanDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo Plan
            </Button>
          </div>
          <DataTable
            columns={planColumns}
            data={plans}
            loading={loadingPlans}
            searchPlaceholder="Buscar planes..."
            actions={(row) => (
              <Button size="sm" variant="ghost" onClick={() => openEditPlan(row)}><Edit className="h-3 w-3" /></Button>
            )}
          />
        </TabsContent>

        <TabsContent value="users" className="mt-4 space-y-4">
          <SuperAdminUsers tenants={tenants} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          <ProfileSettings />
        </TabsContent>
      </Tabs>

      {/* Tenant Dialog */}
      <Dialog open={tenantDialogOpen} onOpenChange={(open) => { if (!open) resetTenantForm(); setTenantDialogOpen(open); }}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingTenant ? 'Editar Parqueadero' : 'Nuevo Parqueadero'}</DialogTitle>
            <DialogDescription>Completa la información del parqueadero</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={tName} onChange={(e) => { setTName(e.target.value); if (!editingTenant) setTSlug(slugify(e.target.value)); }} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={tSlug} onChange={(e) => setTSlug(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={tAddress} onChange={(e) => setTAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Teléfono</Label><Input value={tPhone} onChange={(e) => setTPhone(e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={tEmail} onChange={(e) => setTEmail(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Espacios</Label>
                <Input type="number" value={tSpaces} onChange={(e) => setTSpaces(e.target.value)} disabled />
                {tPlanId && plans.find(p => p.id === tPlanId) && (
                  <p className="text-xs text-muted-foreground">Máximo según plan: {plans.find(p => p.id === tPlanId)!.max_spaces}</p>
                )}
              </div>
              <div className="space-y-2"><Label>Latitud</Label><Input value={tLat} onChange={(e) => setTLat(e.target.value)} /></div>
              <div className="space-y-2"><Label>Longitud</Label><Input value={tLng} onChange={(e) => setTLng(e.target.value)} /></div>
            </div>
            {plans.length > 0 && (
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={tPlanId} onValueChange={(v) => {
                  setTPlanId(v);
                  const selectedPlan = plans.find((p) => p.id === v);
                  if (selectedPlan) setTSpaces(String(selectedPlan.max_spaces));
                }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price_monthly)}/mes</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!editingTenant && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm mb-3">Credenciales del Administrador</h3>
                  <div className="space-y-3">
                    <div className="space-y-2"><Label>Nombre del admin</Label><Input value={adminName} onChange={(e) => setAdminName(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Email del admin</Label><Input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Contraseña</Label><Input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} /></div>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setTenantDialogOpen(false); resetTenantForm(); }}>Cancelar</Button>
            <Button onClick={() => saveTenantMutation.mutate()} disabled={!tName || saveTenantMutation.isPending}>
              {saveTenantMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Dialog */}
      <Dialog open={planDialogOpen} onOpenChange={(open) => { if (!open) resetPlanForm(); setPlanDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plan' : 'Nuevo Plan'}</DialogTitle>
            <DialogDescription>Configura el plan de licencia</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre *</Label><Input value={pName} onChange={(e) => setPName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Descripción</Label><Input value={pDesc} onChange={(e) => setPDesc(e.target.value)} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Precio mensual (COP)</Label><Input type="number" value={pPrice} onChange={(e) => setPPrice(e.target.value)} /></div>
              <div className="space-y-2"><Label>Max espacios</Label><Input type="number" value={pMaxSpaces} onChange={(e) => setPMaxSpaces(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>Módulos incluidos</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_MODULES.map((mod) => (
                  <label key={mod.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={pModules.includes(mod.key)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const next = [...pModules, mod.key];
                          // If adding reports_download, auto-add reports
                          if (mod.key === 'reports_download' && !next.includes('reports')) next.push('reports');
                          setPModules(next);
                        } else {
                          let next = pModules.filter((m) => m !== mod.key);
                          // If removing reports, also remove reports_download
                          if (mod.key === 'reports') next = next.filter((m) => m !== 'reports_download');
                          setPModules(next);
                        }
                      }}
                    />
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPlanDialogOpen(false); resetPlanForm(); }}>Cancelar</Button>
            <Button onClick={() => savePlanMutation.mutate()} disabled={!pName || !pPrice || savePlanMutation.isPending}>
              {savePlanMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- SuperAdmin Users sub-component ----
function SuperAdminUsers({ tenants }: { tenants: Tenant[] }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<string>('admin');
  const [newTenantId, setNewTenantId] = useState('');

  const ALL_ROLES = [
    { value: 'superadmin', label: 'Super Admin' },
    { value: 'admin', label: 'Administrador' },
    { value: 'operator', label: 'Operador' },
    { value: 'viewer', label: 'Visor' },
  ];

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['superadmin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.users || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'create', email: newEmail, password: newPassword, full_name: newName, role: newRole, tenant_id: newTenantId || null },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success('Usuario creado');
      setDialogOpen(false);
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('admin'); setNewTenantId('');
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'update_role', user_id, role },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success('Rol actualizado');
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({ user_id, tenant_id }: { user_id: string; tenant_id: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'update_tenant', user_id, tenant_id: tenant_id || null },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success('Parqueadero actualizado');
      queryClient.invalidateQueries({ queryKey: ['superadmin-users'] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ user_id, is_active }: { user_id: string; is_active: boolean }) => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'toggle_active', user_id, is_active },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superadmin-users'] }),
  });

  const columns: Column<any>[] = [
    { key: 'full_name', label: 'Nombre', render: (r) => r.full_name || '—' },
    { key: 'email', label: 'Email', render: (r) => r.email || '—' },
    {
      key: 'role', label: 'Rol', render: (r) => (
        <Select value={r.role} onValueChange={(v) => updateRoleMutation.mutate({ user_id: r.id, role: v })}>
          <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ALL_ROLES.map((ar) => <SelectItem key={ar.value} value={ar.value}>{ar.label}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'tenant_id', label: 'Parqueadero', render: (r) => (
        <Select value={r.tenant_id || 'none'} onValueChange={(v) => updateTenantMutation.mutate({ user_id: r.id, tenant_id: v === 'none' ? '' : v })}>
          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin asignar</SelectItem>
            {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'is_active', label: 'Activo', render: (r) => (
        <Switch checked={r.is_active} onCheckedChange={(checked) => toggleActiveMutation.mutate({ user_id: r.id, is_active: checked })} />
      ),
    },
  ];

  if (isLoading) return <TableSkeleton columns={5} rows={5} />;

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nuevo Usuario</Button>
      </div>
      <DataTable columns={columns} data={users} searchPlaceholder="Buscar usuarios..." />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
            <DialogDescription>Crea un usuario en la plataforma</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Contraseña</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parqueadero</Label>
              <Select value={newTenantId} onValueChange={setNewTenantId}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!newName || !newEmail || !newPassword || createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
