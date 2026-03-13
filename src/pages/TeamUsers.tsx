import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UserPlus, AlertTriangle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { TableSkeleton } from '@/components/ui/PageSkeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AppRole } from '@/types';
import { ROLE_LABELS } from '@/types';
import { useTenant } from '@/hooks/useTenant';

interface TeamUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
}

const ASSIGNABLE_ROLES: { value: string; label: string }[] = [
  { value: 'portero', label: 'Portero' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'viewer', label: 'Cliente' },
];

export default function TeamUsers() {
  const { session } = useAuth();
  const { tenant, planModules } = useTenant();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('portero');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'list' },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return (data.users || []) as TeamUser[];
    },
  });

  // Get plan's max_users
  const { data: planData } = useQuery({
    queryKey: ['plan-max-users', tenant?.plan_id],
    enabled: !!tenant?.plan_id,
    queryFn: async () => {
      const { data } = await supabase.from('plans').select('max_users').eq('id', tenant!.plan_id!).single();
      return data;
    },
  });

  const maxUsers = planData?.max_users || 10;
  const staffUsers = users.filter(u => ['portero', 'cajero', 'operator'].includes(u.role) && u.is_active);
  const isAtLimit = staffUsers.length >= maxUsers;

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'create', email: newEmail, password: newPassword, full_name: newName, role: newRole },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success('Usuario creado exitosamente');
      setDialogOpen(false);
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('portero');
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
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
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-users'] }),
  });

  const getRoleLabel = (role: string) => {
    // Handle legacy role names
    if (role === 'operator') return 'Portero';
    if (role === 'viewer') return 'Cliente';
    return ROLE_LABELS[role as AppRole] || role;
  };

  const columns: Column<TeamUser>[] = [
    { key: 'full_name', label: 'Nombre', render: (r) => r.full_name || '—' },
    { key: 'email', label: 'Email', render: (r) => r.email || '—' },
    {
      key: 'role', label: 'Rol', render: (r) => {
        if (r.role === 'admin') return <Badge>{getRoleLabel(r.role)}</Badge>;
        return (
          <Select value={r.role} onValueChange={(v) => updateRoleMutation.mutate({ user_id: r.id, role: v })}>
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue>{getRoleLabel(r.role)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map((ar) => (
                <SelectItem key={ar.value} value={ar.value}>{ar.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      key: 'is_active', label: 'Activo', render: (r) => (
        r.role === 'admin' ? <Badge variant="default">Sí</Badge> :
        <Switch checked={r.is_active} onCheckedChange={(checked) => toggleActiveMutation.mutate({ user_id: r.id, is_active: checked })} />
      ),
    },
    { key: 'created_at', label: 'Creado', render: (r) => formatDateTime(r.created_at) },
  ];

  if (isLoading) return <TableSkeleton columns={5} rows={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipo</h1>
          <p className="text-sm text-muted-foreground">
            Personal del parqueadero · {staffUsers.length}/{maxUsers} usuarios
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={isAtLimit}>
          <UserPlus className="h-4 w-4 mr-1" /> Nuevo Usuario
        </Button>
      </div>

      {isAtLimit && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            Has alcanzado el límite de <strong>{maxUsers}</strong> usuarios del personal para tu plan. Contacta al administrador para ampliar.
          </AlertDescription>
        </Alert>
      )}

      <DataTable columns={columns} data={users} searchPlaceholder="Buscar usuarios..." />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
            <DialogDescription>Crea un usuario para tu equipo ({staffUsers.length}/{maxUsers})</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createUserMutation.mutate()} disabled={!newName || !newEmail || !newPassword || createUserMutation.isPending}>
              {createUserMutation.isPending ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
