import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TeamService } from '@/services/team.service';
import { BillingService } from '@/services/billing.service';
import { useAuth } from '@/contexts/AuthContext';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UserPlus, AlertTriangle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { TableSkeleton } from '@/components/ui/PageSkeletons';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AppRole } from '@/types';
import { ROLE_LABELS, MODULE_LABELS_ES } from '@/types';
import { useTenant } from '@/hooks/useTenant';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface TeamUser {
  id: string;
  full_name: string | null;
  email: string | null;
  role: AppRole;
  is_active: boolean;
  created_at: string;
  user_modules: string[] | null;
}

const ASSIGNABLE_ROLES: { value: string; label: string }[] = [
  { value: 'portero', label: 'Portero' },
  { value: 'cajero', label: 'Cajero' },
  { value: 'conductor', label: 'Conductor' },
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
  const [newModules, setNewModules] = useState<string[]>([]);

  // Module edit dialog
  const [moduleEditUser, setModuleEditUser] = useState<TeamUser | null>(null);
  const [editModules, setEditModules] = useState<string[]>([]);
  const [confirmRoleChange, setConfirmRoleChange] = useState<{ user_id: string; role: string } | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['team-users'],
    queryFn: () => TeamService.listUsers(),
  });

  const { data: planData } = useQuery({
    queryKey: ['plan-max-users', tenant?.plan_id],
    enabled: !!tenant?.plan_id,
    queryFn: () => BillingService.getPlanMaxUsers(tenant!.plan_id!),
  });

  const maxUsers = planData?.max_users || 10;
  const staffUsers = users.filter((u: any) => ['portero', 'cajero', 'operator'].includes(u.role) && u.is_active);
  const isAtLimit = staffUsers.length >= maxUsers;

  const availableModules = planModules.filter(m => !['dashboard', 'settings', 'my_plan'].includes(m));

  const createUserMutation = useMutation({
    mutationFn: async () => {
      await TeamService.createUser({ email: newEmail, password: newPassword, full_name: newName, role: newRole, modules: newModules.length > 0 ? newModules : null });
    },
    onSuccess: () => {
      toast.success('Usuario creado exitosamente');
      setDialogOpen(false); setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('portero'); setNewModules([]);
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      await TeamService.updateRole(user_id, role);
    },
    onSuccess: () => { toast.success('Rol actualizado'); setConfirmRoleChange(null); queryClient.invalidateQueries({ queryKey: ['team-users'] }); },
    onError: (e) => { toast.error(`Error: ${e.message}`); setConfirmRoleChange(null); },
  });

  const updateModulesMutation = useMutation({
    mutationFn: async ({ user_id, modules }: { user_id: string; modules: string[] | null }) => {
      await TeamService.updateModules(user_id, modules);
    },
    onSuccess: () => { toast.success('Módulos actualizados'); setModuleEditUser(null); queryClient.invalidateQueries({ queryKey: ['team-users'] }); },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ user_id, is_active }: { user_id: string; is_active: boolean }) => {
      await TeamService.toggleActive(user_id, is_active);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team-users'] }),
  });

  const getRoleLabel = (role: string) => {
    if (role === 'operator') return 'Portero';
    if (role === 'viewer' || role === 'conductor') return 'Conductor';
    return ROLE_LABELS[role as AppRole] || role;
  };

  const openModuleEdit = (user: TeamUser) => {
    setModuleEditUser(user);
    setEditModules(user.user_modules || [...availableModules]);
  };

  const columns: Column<TeamUser>[] = [
    { key: 'full_name', label: 'Nombre', render: (r) => r.full_name || '—' },
    { key: 'email', label: 'Email', render: (r) => r.email || '—', hideOnMobile: true },
    {
      key: 'role', label: 'Rol', render: (r) => {
        if (r.role === 'admin') return <Badge>{getRoleLabel(r.role)}</Badge>;
        return (
          <Select value={r.role} onValueChange={(v) => setConfirmRoleChange({ user_id: r.id, role: v })}>
            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue>{getRoleLabel(r.role)}</SelectValue></SelectTrigger>
            <SelectContent>{ASSIGNABLE_ROLES.map((ar) => <SelectItem key={ar.value} value={ar.value}>{ar.label}</SelectItem>)}</SelectContent>
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
    { key: 'created_at', label: 'Creado', render: (r) => formatDateTime(r.created_at), hideOnMobile: true },
  ];

  if (isLoading) return <TableSkeleton columns={5} rows={5} />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">Equipo</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Personal del parqueadero · {staffUsers.length}/{maxUsers} usuarios</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={isAtLimit} className="w-full sm:w-auto">
          <UserPlus className="h-4 w-4 mr-1" /> Nuevo Usuario
        </Button>
      </div>

      {isAtLimit && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">Has alcanzado el límite de <strong>{maxUsers}</strong> usuarios para tu plan.</AlertDescription>
        </Alert>
      )}

      <DataTable columns={columns} data={users} searchPlaceholder="Buscar usuarios..."
        actions={(row) => row.role !== 'admin' ? (
          <Button size="sm" variant="ghost" onClick={() => openModuleEdit(row)} className="text-xs">Módulos</Button>
        ) : null}
      />

      {/* Create User Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Nuevo Usuario</DialogTitle><DialogDescription>Crea un usuario para tu equipo ({staffUsers.length}/{maxUsers})</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre completo</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label>Contraseña</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
            <div className="space-y-2"><Label>Rol</Label>
              <Select value={newRole} onValueChange={setNewRole}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ASSIGNABLE_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {availableModules.length > 0 && (
              <div className="space-y-2">
                <Label>Módulos permitidos</Label>
                <p className="text-xs text-muted-foreground">Selecciona los módulos que este usuario podrá ver</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {availableModules.map(mod => (
                    <label key={mod} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={newModules.includes(mod)} onCheckedChange={(c) => {
                        setNewModules(prev => c ? [...prev, mod] : prev.filter(m => m !== mod));
                      }} />
                      <span className="truncate">{MODULE_LABELS_ES[mod] || mod}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createUserMutation.mutate()} disabled={!newName || !newEmail || !newPassword || createUserMutation.isPending}>
              {createUserMutation.isPending ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Module Edit Dialog */}
      <Dialog open={!!moduleEditUser} onOpenChange={() => setModuleEditUser(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Módulos de {moduleEditUser?.full_name || 'Usuario'}</DialogTitle>
            <DialogDescription>Selecciona los módulos que puede acceder</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-auto">
            {availableModules.map(mod => (
              <label key={mod} className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted cursor-pointer">
                <Checkbox checked={editModules.includes(mod)} onCheckedChange={(c) => {
                  setEditModules(prev => c ? [...prev, mod] : prev.filter(m => m !== mod));
                }} />
                <span>{MODULE_LABELS_ES[mod] || mod}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleEditUser(null)}>Cancelar</Button>
            <Button onClick={() => moduleEditUser && updateModulesMutation.mutate({ user_id: moduleEditUser.id, modules: editModules.length > 0 ? editModules : null })}
              disabled={updateModulesMutation.isPending}>
              {updateModulesMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!confirmRoleChange} onOpenChange={() => setConfirmRoleChange(null)} title="Cambiar Rol"
        description={`¿Cambiar el rol de este usuario a ${confirmRoleChange ? getRoleLabel(confirmRoleChange.role) : ''}?`}
        onConfirm={() => { if (confirmRoleChange) updateRoleMutation.mutate(confirmRoleChange); }}
        loading={updateRoleMutation.isPending} />
    </div>
  );
}
