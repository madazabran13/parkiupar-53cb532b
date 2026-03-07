import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Plus, Edit, Building2, CreditCard, Users, Car } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';
import type { Tenant, Plan } from '@/types';

export default function SuperAdmin() {
  const queryClient = useQueryClient();
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
  const [tPrimaryColor, setTPrimaryColor] = useState('#1e40af');
  const [tSecondaryColor, setTSecondaryColor] = useState('#3b82f6');
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

  // Global metrics
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.is_active).length;
  const totalActiveVehicles = tenants.reduce((sum, t) => sum + (t.total_spaces - t.available_spaces), 0);

  const resetTenantForm = () => {
    setTName(''); setTSlug(''); setTAddress(''); setTPhone(''); setTEmail('');
    setTSpaces('20'); setTPrimaryColor('#1e40af'); setTSecondaryColor('#3b82f6');
    setTLat('10.4735'); setTLng('-73.2503'); setTPlanId('');
    setAdminName(''); setAdminEmail(''); setAdminPassword('');
    setEditingTenant(null);
  };

  const openEditTenant = (t: Tenant) => {
    setEditingTenant(t);
    setTName(t.name); setTSlug(t.slug); setTAddress(t.address || ''); setTPhone(t.phone || '');
    setTEmail(t.email || ''); setTSpaces(String(t.total_spaces)); setTPrimaryColor(t.primary_color);
    setTSecondaryColor(t.secondary_color); setTLat(String(t.latitude || '')); setTLng(String(t.longitude || ''));
    setTPlanId(t.plan_id || '');
    setTenantDialogOpen(true);
  };

  const slugify = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const saveTenantMutation = useMutation({
    mutationFn: async () => {
      const tenantData = {
        name: tName,
        slug: tSlug || slugify(tName),
        address: tAddress || null,
        phone: tPhone || null,
        email: tEmail || null,
        total_spaces: parseInt(tSpaces),
        available_spaces: editingTenant ? editingTenant.available_spaces : parseInt(tSpaces),
        primary_color: tPrimaryColor,
        secondary_color: tSecondaryColor,
        latitude: tLat ? parseFloat(tLat) : null,
        longitude: tLng ? parseFloat(tLng) : null,
        plan_id: tPlanId || null,
      };

      if (editingTenant) {
        const { error } = await supabase.from('tenants').update(tenantData).eq('id', editingTenant.id);
        if (error) throw error;
      } else {
        // Create tenant
        const { data: newTenant, error } = await supabase.from('tenants').insert(tenantData).select('id').single();
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
  const resetPlanForm = () => { setPName(''); setPDesc(''); setPPrice(''); setPMaxSpaces('50'); setEditingPlan(null); };
  const openEditPlan = (p: Plan) => {
    setEditingPlan(p); setPName(p.name); setPDesc(p.description || ''); setPPrice(String(p.price_monthly)); setPMaxSpaces(String(p.max_spaces));
    setPlanDialogOpen(true);
  };

  const savePlanMutation = useMutation({
    mutationFn: async () => {
      const planData = { name: pName, description: pDesc || null, price_monthly: parseFloat(pPrice), max_spaces: parseInt(pMaxSpaces) };
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
    { key: 'phone', label: 'Teléfono' },
    { key: 'total_spaces', label: 'Espacios' },
    { key: 'available_spaces', label: 'Disponibles', render: (r) => (
      <Badge variant={r.available_spaces === 0 ? 'destructive' : 'secondary'}>{r.available_spaces}/{r.total_spaces}</Badge>
    )},
    { key: 'is_active', label: 'Estado', render: (r) => (
      <Switch checked={r.is_active} onCheckedChange={(checked) => toggleTenantMutation.mutate({ id: r.id, is_active: checked })} />
    )},
  ];

  const planColumns: Column<Plan>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'description', label: 'Descripción' },
    { key: 'price_monthly', label: 'Precio Mensual', render: (r) => formatCurrency(r.price_monthly) },
    { key: 'max_spaces', label: 'Max Espacios' },
    { key: 'is_active', label: 'Activo', render: (r) => <Badge variant={r.is_active ? 'default' : 'secondary'}>{r.is_active ? 'Sí' : 'No'}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Super Administrador</h1>
        <p className="text-muted-foreground">Gestión global de la plataforma ParkingPro</p>
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

      <Tabs defaultValue="tenants">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="tenants" className="flex-1 sm:flex-none">Parqueaderos</TabsTrigger>
          <TabsTrigger value="plans" className="flex-1 sm:flex-none">Planes</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="mt-4 space-y-4">
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
              <div className="space-y-2"><Label>Espacios</Label><Input type="number" value={tSpaces} onChange={(e) => setTSpaces(e.target.value)} /></div>
              <div className="space-y-2"><Label>Latitud</Label><Input value={tLat} onChange={(e) => setTLat(e.target.value)} /></div>
              <div className="space-y-2"><Label>Longitud</Label><Input value={tLng} onChange={(e) => setTLng(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Color primario</Label>
                <div className="flex gap-2">
                  <input type="color" value={tPrimaryColor} onChange={(e) => setTPrimaryColor(e.target.value)} className="h-10 w-10 rounded border cursor-pointer" />
                  <Input value={tPrimaryColor} onChange={(e) => setTPrimaryColor(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Color secundario</Label>
                <div className="flex gap-2">
                  <input type="color" value={tSecondaryColor} onChange={(e) => setTSecondaryColor(e.target.value)} className="h-10 w-10 rounded border cursor-pointer" />
                  <Input value={tSecondaryColor} onChange={(e) => setTSecondaryColor(e.target.value)} />
                </div>
              </div>
            </div>
            {plans.length > 0 && (
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={tPlanId} onValueChange={setTPlanId}>
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
