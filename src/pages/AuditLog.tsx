import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Shield, Search, Eye, ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const TABLE_LABELS: Record<string, string> = {
  customers: 'Clientes',
  parking_sessions: 'Sesiones',
  vehicles: 'Vehículos',
  tenants: 'Parqueadero',
  user_profiles: 'Usuarios',
  vehicle_rates: 'Tarifas',
};

const ACTION_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  INSERT: { label: 'Creación', variant: 'default' },
  UPDATE: { label: 'Actualización', variant: 'secondary' },
  DELETE: { label: 'Eliminación', variant: 'destructive' },
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function AuditLog() {
  const [search, setSearch] = useState('');
  const [tableFilter, setTableFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', tableFilter, actionFilter, search, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (tableFilter !== 'all') query = query.eq('table_name', tableFilter);
      if (actionFilter !== 'all') query = query.eq('action', actionFilter);
      if (search) query = query.or(`user_name.ilike.%${search}%,record_id.ilike.%${search}%`);

      const { data, count, error } = await query;
      if (error) throw error;
      return { logs: data || [], total: count || 0 };
    },
  });

  const fetchAllForExport = useCallback(async () => {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000);

    if (tableFilter !== 'all') query = query.eq('table_name', tableFilter);
    if (actionFilter !== 'all') query = query.eq('action', actionFilter);
    if (search) query = query.or(`user_name.ilike.%${search}%,record_id.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }, [tableFilter, actionFilter, search]);

  const exportCSV = useCallback(async () => {
    setExporting(true);
    try {
      const allLogs = await fetchAllForExport();
      const headers = ['Fecha', 'Usuario', 'Tabla', 'Acción', 'ID Registro', 'Campos modificados'];
      const rows = allLogs.map((log: any) => [
        format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
        log.user_name || 'Sistema',
        TABLE_LABELS[log.table_name] || log.table_name,
        ACTION_CONFIG[log.action]?.label || log.action,
        log.record_id || '',
        log.changed_fields?.join(', ') || '',
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${allLogs.length} registros exportados a CSV`);
    } catch {
      toast.error('Error al exportar CSV');
    } finally {
      setExporting(false);
    }
  }, [fetchAllForExport]);

  const exportPDF = useCallback(async () => {
    setExporting(true);
    try {
      const allLogs = await fetchAllForExport();
      const doc = new jsPDF({ orientation: 'landscape' });

      doc.setFontSize(16);
      doc.text('Registro de Auditoría', 14, 15);
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")} — ${allLogs.length} registros`, 14, 22);

      const tableData = allLogs.map((log: any) => [
        format(new Date(log.created_at), "dd/MM/yy HH:mm"),
        log.user_name || 'Sistema',
        TABLE_LABELS[log.table_name] || log.table_name,
        ACTION_CONFIG[log.action]?.label || log.action,
        log.record_id?.substring(0, 8) || '',
        (log.changed_fields?.join(', ') || '').substring(0, 40),
      ]);

      autoTable(doc, {
        head: [['Fecha', 'Usuario', 'Tabla', 'Acción', 'ID', 'Campos']],
        body: tableData,
        startY: 28,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      doc.save(`auditoria_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);
      toast.success(`${allLogs.length} registros exportados a PDF`);
    } catch {
      toast.error('Error al exportar PDF');
    } finally {
      setExporting(false);
    }
  }, [fetchAllForExport]);

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Auditoría</h1>
            <p className="text-sm text-muted-foreground">Historial de cambios en el sistema</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={exporting || isLoading}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exportando...' : 'Exportar'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por usuario o ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={tableFilter} onValueChange={(v) => { setTableFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tabla" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las tablas</SelectItem>
                {Object.entries(TABLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las acciones</SelectItem>
                {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Tabla</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Campos</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay registros de auditoría
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log: any) => {
                  const actionCfg = ACTION_CONFIG[log.action] || { label: log.action, variant: 'default' as const };
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium text-sm">{log.user_name || 'Sistema'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {TABLE_LABELS[log.table_name] || log.table_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={actionCfg.variant} className="text-xs">{actionCfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.changed_fields?.join(', ') || '—'}
                      </TableCell>
                      <TableCell>
                        <DetailDialog log={log} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} registros</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailDialog({ log }: { log: any }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalle de auditoría
            <Badge variant={ACTION_CONFIG[log.action]?.variant || 'default'} className="text-xs">
              {ACTION_CONFIG[log.action]?.label || log.action}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Tabla:</span>{' '}
              <span className="font-medium">{TABLE_LABELS[log.table_name] || log.table_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Usuario:</span>{' '}
              <span className="font-medium">{log.user_name || 'Sistema'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Fecha:</span>{' '}
              <span className="font-medium">{format(new Date(log.created_at), "dd MMM yyyy HH:mm:ss", { locale: es })}</span>
            </div>
            <div>
              <span className="text-muted-foreground">ID Registro:</span>{' '}
              <span className="font-mono text-xs">{log.record_id || '—'}</span>
            </div>
          </div>

          {log.changed_fields?.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Campos modificados:</p>
              <div className="flex flex-wrap gap-1">
                {log.changed_fields.map((f: string) => (
                  <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                ))}
              </div>
            </div>
          )}

          {log.old_data && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Datos anteriores:</p>
              <ScrollArea className="h-[150px] rounded border bg-muted/50 p-3">
                <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(log.old_data, null, 2)}</pre>
              </ScrollArea>
            </div>
          )}

          {log.new_data && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Datos nuevos:</p>
              <ScrollArea className="h-[150px] rounded border bg-muted/50 p-3">
                <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(log.new_data, null, 2)}</pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
