import { useState, useEffect, useRef, useCallback } from 'react';
import ProfileSettings from '@/components/ProfileSettings';
import MapLocationPicker from '@/components/MapLocationPicker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRealtime } from '@/hooks/useRealtime';
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
import { Plus, Edit, Building2, CreditCard, Users, Car, Bell, CheckCircle2, XCircle, AlertTriangle, CalendarClock, RotateCw, ShieldAlert, Star } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, formatDateTime } from '@/lib/utils/formatters';
import type { Tenant, Plan } from '@/types';
import { TableSkeleton } from '@/components/ui/PageSkeletons';

export default function SuperAdmin() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const currentTab = location.pathname.includes('/plans') ? 'plans' : location.pathname.includes('/users') ? 'users' : location.pathname.includes('/settings') ? 'settings' : location.pathname.includes('/testimonials') ? 'testimonials' : location.pathname.includes('/faqs') ? 'faqs' : 'tenants';

  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Tenant form
  const [tName, setTName] = useState('');
  
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
  const [pMaxUsers, setPMaxUsers] = useState('10');
  const [pCategory, setPCategory] = useState('general');
  const [pModules, setPModules] = useState<string[]>(['dashboard', 'parking', 'customers', 'rates', 'capacity']);

  const ALL_MODULES = [
    { key: 'dashboard', label: 'Panel Principal' },
    { key: 'parking', label: 'Gestión de Vehículos' },
    { key: 'customers', label: 'Clientes' },
    { key: 'rates', label: 'Tarifas' },
    { key: 'capacity', label: 'Control de Aforo y Reservas' },
    { key: 'reports', label: 'Reportes (solo ver)' },
    { key: 'reports_download', label: 'Descarga de Reportes PDF' },
    { key: 'map', label: 'Mapa en Tiempo Real' },
    { key: 'team', label: 'Gestión de Usuarios' },
    { key: 'schedules', label: 'Horarios de Operación' },
    { key: 'settings', label: 'Configuración' },
    { key: 'audit', label: 'Auditoría' },
    { key: 'payments', label: 'Pagos y Facturación' },
    { key: 'my_plan', label: 'Mi Plan' },
    { key: 'theme_color', label: 'Personalización del Tema' },
    { key: 'printing', label: 'Impresión de Recibos' },
    { key: 'monthly_subscriptions', label: 'Mensualidades' },
    { key: 'testimonials', label: 'Testimonios' },
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

  // Reactivation requests from notifications
  const { data: reactivationRequests = [] } = useQuery({
    queryKey: ['reactivation-requests'],
    refetchInterval: 10000,
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('title', 'Solicitud de reactivación')
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Sound notification for new reactivation requests
  const prevReactivationCountRef = useRef<number>(reactivationRequests.length);
  const notificationPermissionRef = useRef<NotificationPermission>('default');
  
  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      notificationPermissionRef.current = Notification.permission;
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          notificationPermissionRef.current = permission;
          if (permission === 'granted') {
            toast.success('Notificaciones push activadas');
          }
        });
      }
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
      oscillator.frequency.setValueAtTime(1174.66, audioContext.currentTime + 0.1); // D6 note
      oscillator.frequency.setValueAtTime(1318.51, audioContext.currentTime + 0.2); // E6 note
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (e) {
      console.log('Audio notification not supported');
    }
  }, []);

  const sendPushNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: 'reactivation-request',
        requireInteraction: true,
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, []);

  useEffect(() => {
    const currentCount = reactivationRequests.length;
    const prevCount = prevReactivationCountRef.current;
    
    if (currentCount > prevCount && prevCount !== undefined) {
      playNotificationSound();
      
      // Send native push notification
      sendPushNotification(
        '🔔 Nueva solicitud de reactivación',
        'Un parqueadero suspendido ha solicitado reactivación'
      );
      
      // Also show in-app toast
      toast.info('🔔 Nueva solicitud de reactivación', {
        description: 'Un parqueadero suspendido ha solicitado reactivación',
        duration: 5000,
      });
    }
    
    prevReactivationCountRef.current = currentCount;
  }, [reactivationRequests.length, playNotificationSound, sendPushNotification]);

  // Real-time updates for notifications and tenants
  useRealtime({
    table: 'notifications',
    queryKeys: [['reactivation-requests'], ['notifications']],
  });

  useRealtime({
    table: 'tenants',
    queryKeys: [['admin-tenants']],
  });

  // Group reactivation requests by tenant
  const groupedReactivations = reactivationRequests.reduce((acc: Record<string, { tenantId: string; count: number; notifIds: string[]; lastMessage: string; lastDate: string }>, notif: any) => {
    const tid = notif.metadata?.tenant_id || 'unknown';
    if (!acc[tid]) {
      acc[tid] = { tenantId: tid, count: 0, notifIds: [], lastMessage: notif.message, lastDate: notif.created_at };
    }
    acc[tid].count++;
    acc[tid].notifIds.push(notif.id);
    if (notif.created_at > acc[tid].lastDate) {
      acc[tid].lastDate = notif.created_at;
      acc[tid].lastMessage = notif.message;
    }
    return acc;
  }, {} as Record<string, any>);
  const groupedReactivationList = Object.values(groupedReactivations);

  const handleReactivate = async (notifIds: string[], tenantId: string) => {
    const { error } = await supabase.from('tenants').update({ is_active: true }).eq('id', tenantId);
    if (error) { toast.error(`Error: ${error.message}`); return; }
    // Mark ALL notifications for this tenant as read
    for (const nid of notifIds) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', nid);
    }
    toast.success('Parqueadero reactivado exitosamente');
    queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
    queryClient.invalidateQueries({ queryKey: ['reactivation-requests'] });
  };

  const handleDismissReactivation = async (notifIds: string[]) => {
    for (const nid of notifIds) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', nid);
    }
    queryClient.invalidateQueries({ queryKey: ['reactivation-requests'] });
  };

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
    setTName(''); setTAddress(''); setTPhone(''); setTEmail('');
    setTSpaces('20');
    setTLat('10.4735'); setTLng('-73.2503'); setTPlanId('');
    setAdminName(''); setAdminEmail(''); setAdminPassword('');
    setEditingTenant(null);
  };

  const openEditTenant = (t: Tenant) => {
    setEditingTenant(t);
    setTName(t.name); setTAddress(t.address || ''); setTPhone(t.phone || '');
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
        slug: slugify(tName),
        address: tAddress || null,
        phone: tPhone || null,
        email: tEmail || null,
        total_spaces: parseInt(tSpaces),
        available_spaces: editingTenant ? editingTenant.available_spaces : parseInt(tSpaces),
        latitude: tLat ? parseFloat(tLat) : null,
        longitude: tLng ? parseFloat(tLng) : null,
        plan_id: tPlanId || null,
      };

      // Set plan dates and sync spaces when assigning/changing a plan
      if (tPlanId) {
        const selectedPlan = plans.find(p => p.id === tPlanId);
        const hadPlanBefore = editingTenant?.plan_id;
        const planChanged = editingTenant?.plan_id !== tPlanId;
        if (!hadPlanBefore || planChanged) {
          tenantData.plan_started_at = now;
          tenantData.plan_expires_at = expiresAt.toISOString();
        }
        // Always sync total_spaces with plan's max_spaces
        if (selectedPlan) {
          const occupied = editingTenant
            ? (editingTenant.total_spaces - editingTenant.available_spaces)
            : 0;
          tenantData.total_spaces = selectedPlan.max_spaces;
          tenantData.available_spaces = Math.max(selectedPlan.max_spaces - occupied, 0);
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
      // Mark reactivation notifications for this tenant as read
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('tenant_id', id)
        .eq('is_read', false)
        .eq('title', 'Solicitud de reactivación');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['reactivation-requests'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Plans CRUD
  const resetPlanForm = () => { setPName(''); setPDesc(''); setPPrice(''); setPMaxSpaces('50'); setPMaxUsers('10'); setPCategory('general'); setPModules(['dashboard', 'parking', 'customers', 'rates', 'capacity']); setEditingPlan(null); };
  const openEditPlan = (p: Plan) => {
    setEditingPlan(p); setPName(p.name); setPDesc(p.description || ''); setPPrice(String(p.price_monthly)); setPMaxSpaces(String(p.max_spaces));
    setPMaxUsers(String((p as any).max_users || 10));
    setPCategory((p as any).category || 'general');
    setPModules(Array.isArray(p.modules) ? p.modules : ['dashboard', 'parking', 'customers', 'rates', 'capacity']);
    setPlanDialogOpen(true);
  };

  const savePlanMutation = useMutation({
    mutationFn: async () => {
      const finalModules = pModules.includes('reports_download') && !pModules.includes('reports')
        ? [...pModules, 'reports'] : pModules;
      const planData = { name: pName, description: pDesc || null, price_monthly: parseFloat(pPrice), max_spaces: parseInt(pMaxSpaces), max_users: parseInt(pMaxUsers) || 10, category: pCategory, modules: finalModules };
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
    
    { key: 'email', label: 'Email' },
    { key: 'total_spaces', label: 'Espacios' },
    { key: 'available_spaces', label: 'Disponibles', render: (r) => {
      const occupied = r.total_spaces - r.available_spaces;
      const overcapacity = occupied > r.total_spaces;
      return (
        <div className="flex items-center gap-1.5">
          {overcapacity && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
          <Badge variant={r.available_spaces <= 0 ? 'destructive' : overcapacity ? 'destructive' : 'secondary'}>
            {r.available_spaces}/{r.total_spaces}
          </Badge>
          {overcapacity && <span className="text-[10px] text-destructive font-medium">Sobrecupo</span>}
        </div>
      );
    }},
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
    { key: 'max_users' as any, label: 'Max Usuarios', render: (r: any) => r.max_users || 10 },
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
        <p className="text-muted-foreground">Gestión global de la plataforma ParkiUpar</p>
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
          <TabsTrigger value="testimonials" className="flex-1 sm:flex-none">Testimonios</TabsTrigger>
          <TabsTrigger value="faqs" className="flex-1 sm:flex-none">FAQ</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 sm:flex-none">Config</TabsTrigger>
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

          {/* Reactivation Requests - grouped by tenant */}
          {groupedReactivationList.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  Solicitudes de Reactivación ({reactivationRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupedReactivationList.map((group: any) => {
                  const tenantName = tenants.find(t => t.id === group.tenantId)?.name || 'Desconocido';
                  return (
                    <div key={group.tenantId} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-background">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          <span className="font-semibold">{tenantName}</span>
                          {group.count > 1 && (
                            <Badge variant="destructive" className="ml-2 text-[10px]">{group.count} solicitudes</Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Última solicitud: {new Date(group.lastDate).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="default" className="h-7 gap-1 text-xs" onClick={() => handleReactivate(group.notifIds, group.tenantId)}>
                          <CheckCircle2 className="h-3 w-3" /> Activar
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => handleDismissReactivation(group.notifIds)}>
                          <XCircle className="h-3 w-3" /> Descartar
                        </Button>
                      </div>
                    </div>
                  );
                })}
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

        <TabsContent value="testimonials" className="mt-4 space-y-4">
          <TestimonialsAdmin />
        </TabsContent>

        <TabsContent value="faqs" className="mt-4 space-y-4">
          <FaqsAdmin />
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
                <Input value={tName} onChange={(e) => setTName(e.target.value)} />
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
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label>Espacios</Label>
                <Input type="number" value={tSpaces} onChange={(e) => setTSpaces(e.target.value)} disabled />
                {tPlanId && plans.find(p => p.id === tPlanId) && (
                  <p className="text-xs text-muted-foreground">Máximo según plan: {plans.find(p => p.id === tPlanId)!.max_spaces}</p>
                )}
              </div>
            </div>
            <MapLocationPicker
              lat={parseFloat(tLat) || 10.4735}
              lng={parseFloat(tLng) || -73.2503}
              onChange={(lat, lng) => { setTLat(String(lat)); setTLng(String(lng)); }}
            />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Nombre *</Label><Input value={pName} onChange={(e) => setPName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Categoría</Label>
                <Select value={pCategory} onValueChange={setPCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="basico">Básico</SelectItem>
                    <SelectItem value="profesional">Profesional</SelectItem>
                    <SelectItem value="empresarial">Empresarial</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Descripción</Label><Input value={pDesc} onChange={(e) => setPDesc(e.target.value)} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2"><Label>Precio mensual (COP)</Label><Input type="number" value={pPrice} onChange={(e) => setPPrice(e.target.value)} /></div>
              <div className="space-y-2"><Label>Max espacios</Label><Input type="number" value={pMaxSpaces} onChange={(e) => setPMaxSpaces(e.target.value)} /></div>
              <div className="space-y-2"><Label>Max usuarios (portero/cajero)</Label><Input type="number" value={pMaxUsers} onChange={(e) => setPMaxUsers(e.target.value)} /></div>
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
    { value: 'portero', label: 'Portero' },
    { value: 'cajero', label: 'Cajero' },
    { value: 'viewer', label: 'Cliente' },
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

/* ═══ TESTIMONIALS ADMIN ═══ */
function TestimonialsAdmin() {
  const queryClient = useQueryClient();
  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ['admin-testimonials'],
    queryFn: async () => {
      const { data } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const toggleApproval = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase.from('testimonials').update({ is_approved: approved }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Testimonio actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('testimonials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Testimonio eliminado');
      queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
    },
  });

  if (isLoading) return <TableSkeleton columns={5} rows={4} />;

  const columns: Column<any>[] = [
    { key: 'full_name', label: 'Nombre' },
    { key: 'business_name', label: 'Parqueadero', render: (r) => r.business_name || '—' },
    { key: 'rating', label: 'Estrellas', render: (r) => <div className="flex gap-0.5">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-primary text-primary" />)}</div> },
    { key: 'review', label: 'Reseña', render: (r) => <span className="text-xs line-clamp-2">{r.review}</span> },
    { key: 'is_approved', label: 'Estado', render: (r) => <Badge variant={r.is_approved ? 'default' : 'secondary'}>{r.is_approved ? 'Publicado' : 'Pendiente'}</Badge> },
  ];

  return (
    <>
      <DataTable columns={columns} data={testimonials} searchPlaceholder="Buscar testimonios..."
        actions={(row) => (
          <div className="flex gap-1">
            <Button size="sm" variant={row.is_approved ? 'outline' : 'default'}
              onClick={() => toggleApproval.mutate({ id: row.id, approved: !row.is_approved })}>
              {row.is_approved ? 'Ocultar' : 'Aprobar'}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(row.id)}>Eliminar</Button>
          </div>
        )}
      />
    </>
  );
}

/* ═══ FAQ ADMIN ═══ */
function FaqsAdmin() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['admin-faqs'],
    queryFn: async () => {
      const { data } = await supabase.from('faqs').select('*').order('sort_order');
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingFaq) {
        const { error } = await supabase.from('faqs').update({ question, answer, sort_order: parseInt(sortOrder) || 0 }).eq('id', editingFaq.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('faqs').insert({ question, answer, sort_order: parseInt(sortOrder) || 0 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingFaq ? 'FAQ actualizada' : 'FAQ creada');
      setOpen(false); resetForm();
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
    },
    onError: () => toast.error('Error al guardar'),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('faqs').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-faqs'] }),
  });

  const deleteFaq = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('faqs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('FAQ eliminada');
      queryClient.invalidateQueries({ queryKey: ['admin-faqs'] });
    },
  });

  const resetForm = () => { setQuestion(''); setAnswer(''); setSortOrder('0'); setEditingFaq(null); };

  const openEdit = (faq: any) => {
    setEditingFaq(faq); setQuestion(faq.question); setAnswer(faq.answer); setSortOrder(String(faq.sort_order)); setOpen(true);
  };

  if (isLoading) return <TableSkeleton columns={4} rows={4} />;

  const columns: Column<any>[] = [
    { key: 'sort_order', label: '#', render: (r) => r.sort_order },
    { key: 'question', label: 'Pregunta', render: (r) => <span className="text-xs font-medium">{r.question}</span> },
    { key: 'answer', label: 'Respuesta', render: (r) => <span className="text-xs line-clamp-2">{r.answer}</span> },
    { key: 'is_active', label: 'Activa', render: (r) => <Switch checked={r.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: r.id, active: v })} /> },
  ];

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => { resetForm(); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Nueva FAQ</Button>
      </div>
      <DataTable columns={columns} data={faqs} searchPlaceholder="Buscar preguntas..."
        actions={(row) => (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => openEdit(row)}><Edit className="h-3 w-3" /></Button>
            <Button size="sm" variant="destructive" onClick={() => deleteFaq.mutate(row.id)}>Eliminar</Button>
          </div>
        )}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFaq ? 'Editar FAQ' : 'Nueva FAQ'}</DialogTitle>
            <DialogDescription>Esta información se muestra en la página principal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Pregunta *</Label><Input value={question} onChange={(e) => setQuestion(e.target.value)} /></div>
            <div className="space-y-2"><Label>Respuesta *</Label><Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} /></div>
            <div className="space-y-2"><Label>Orden</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!question || !answer || saveMutation.isPending}>
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
