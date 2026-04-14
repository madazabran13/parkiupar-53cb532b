import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IncidentService } from '@/services/incident.service';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Bug, Lightbulb, AlertTriangle, MessageSquare, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { TableSkeleton } from '@/components/ui/PageSkeletons';

const CATEGORIES = [
  { value: 'bug', label: 'Error / Bug', icon: Bug },
  { value: 'suggestion', label: 'Sugerencia', icon: Lightbulb },
  { value: 'issue', label: 'Incidencia', icon: AlertTriangle },
  { value: 'other', label: 'Otro', icon: MessageSquare },
];

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  in_progress: { label: 'En progreso', variant: 'default' },
  resolved: { label: 'Resuelto', variant: 'outline' },
  rejected: { label: 'Rechazado', variant: 'destructive' },
};

export default function IncidentReports() {
  const { user, profile, role } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('bug');
  const [filter, setFilter] = useState('all');

  const isSuperadmin = role === 'superadmin';

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['incident-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('incident_reports').insert({
        user_id: user!.id,
        user_name: profile?.full_name || user!.email,
        tenant_id: profile?.tenant_id || null,
        title,
        description,
        category,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reporte enviado correctamente');
      setDialogOpen(false);
      setTitle('');
      setDescription('');
      setCategory('bug');
      queryClient.invalidateQueries({ queryKey: ['incident-reports'] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes?: string }) => {
      const update: any = { status };
      if (admin_notes !== undefined) update.admin_notes = admin_notes;
      const { error } = await supabase.from('incident_reports').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['incident-reports'] });
    },
    onError: (e) => toast.error(`Error: ${e.message}`),
  });

  const filtered = filter === 'all' ? reports : reports.filter((r: any) => r.status === filter);

  if (isLoading) return <TableSkeleton columns={4} rows={5} />;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Reportes de Incidencias</h1>
          <p className="text-sm text-muted-foreground">
            {isSuperadmin ? 'Gestiona los reportes de todos los usuarios' : 'Reporta fallos o sugerencias'}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nuevo Reporte
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'pending', label: 'Pendientes' },
          { key: 'in_progress', label: 'En progreso' },
          { key: 'resolved', label: 'Resueltos' },
          { key: 'rejected', label: 'Rechazados' },
        ].map(f => (
          <Button
            key={f.key}
            variant={filter === f.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f.key)}
            className="text-xs"
          >
            {f.label}
            {f.key !== 'all' && (
              <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
                {reports.filter((r: any) => r.status === f.key).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Reports list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bug className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No hay reportes {filter !== 'all' ? 'con este filtro' : 'aún'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((report: any) => {
            const cat = CATEGORIES.find(c => c.value === report.category);
            const CatIcon = cat?.icon || MessageSquare;
            const status = STATUS_MAP[report.status] || STATUS_MAP.pending;

            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <CatIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-sm">{report.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {report.user_name} · {formatDateTime(report.created_at)}
                          </p>
                        </div>
                        <Badge variant={status.variant} className="text-[10px] shrink-0">
                          {status.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{report.description}</p>

                      {report.admin_notes && (
                        <div className="mt-3 p-2.5 rounded-lg bg-muted/50 border border-border">
                          <p className="text-xs font-medium text-foreground mb-0.5">Respuesta del admin:</p>
                          <p className="text-xs text-muted-foreground">{report.admin_notes}</p>
                        </div>
                      )}

                      {/* Superadmin actions */}
                      {isSuperadmin && report.status === 'pending' && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => updateStatusMutation.mutate({ id: report.id, status: 'in_progress' })}
                          >
                            <Clock className="h-3 w-3 mr-1" /> En progreso
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => {
                              const notes = prompt('Nota de resolución (opcional):');
                              updateStatusMutation.mutate({ id: report.id, status: 'resolved', admin_notes: notes || undefined });
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Resolver
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 text-destructive"
                            onClick={() => {
                              const notes = prompt('Motivo del rechazo:');
                              if (notes) updateStatusMutation.mutate({ id: report.id, status: 'rejected', admin_notes: notes });
                            }}
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Rechazar
                          </Button>
                        </div>
                      )}
                      {isSuperadmin && report.status === 'in_progress' && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7"
                            onClick={() => {
                              const notes = prompt('Nota de resolución (opcional):');
                              updateStatusMutation.mutate({ id: report.id, status: 'resolved', admin_notes: notes || undefined });
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Resolver
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Reporte</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Categoría</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <span className="flex items-center gap-2">
                        <c.icon className="h-4 w-4" /> {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Resumen del problema" />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe el problema o sugerencia con detalle..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!title.trim() || !description.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Enviando...' : 'Enviar Reporte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
