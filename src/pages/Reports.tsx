import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/hooks/useTenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Download, DollarSign, Car, BarChart3, Hash } from 'lucide-react';
import { formatCurrency, formatDateTime, formatDuration, formatDate } from '@/lib/utils/formatters';
import { VEHICLE_TYPE_LABELS } from '@/types';
import { ReportsSkeleton } from '@/components/ui/PageSkeletons';
import type { ParkingSession, VehicleType } from '@/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

type Period = 'today' | 'week' | 'month' | 'custom';

export default function Reports() {
  const { tenantId } = useAuth();
  const { tenant, planModules } = useTenant();
  const canDownload = planModules.length === 0 || planModules.includes('reports_download');
  const [period, setPeriod] = useState<Period>('today');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'today': return { from: startOfDay(now), to: endOfDay(now) };
      case 'week': return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'month': return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'custom': return {
        from: customFrom ? new Date(customFrom) : startOfDay(now),
        to: customTo ? new Date(customTo + 'T23:59:59') : endOfDay(now),
      };
    }
  }, [period, customFrom, customTo]);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['report-sessions', tenantId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from('parking_sessions')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('status', 'completed')
        .gte('exit_time', dateRange.from.toISOString())
        .lte('exit_time', dateRange.to.toISOString())
        .order('exit_time', { ascending: false });
      return (data || []) as unknown as ParkingSession[];
    },
  });

  const filtered = vehicleFilter === 'all' ? sessions : sessions.filter((s) => s.vehicle_type === vehicleFilter);
  const totalRevenue = filtered.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const avgPerService = filtered.length > 0 ? totalRevenue / filtered.length : 0;

  const byType = (['car', 'motorcycle', 'truck', 'bicycle'] as VehicleType[]).map((type) => {
    const typeSessions = filtered.filter((s) => s.vehicle_type === type);
    return {
      type,
      label: VEHICLE_TYPE_LABELS[type],
      count: typeSessions.length,
      revenue: typeSessions.reduce((sum, s) => sum + (s.total_amount || 0), 0),
    };
  }).filter((d) => d.count > 0);

  const columns: Column<ParkingSession>[] = [
    { key: 'plate', label: 'Placa', render: (r) => <Badge variant="outline" className="font-mono">{r.plate}</Badge> },
    { key: 'vehicle_type', label: 'Tipo', render: (r) => VEHICLE_TYPE_LABELS[r.vehicle_type] },
    { key: 'customer_name', label: 'Cliente' },
    { key: 'entry_time', label: 'Entrada', render: (r) => formatDateTime(r.entry_time) },
    { key: 'exit_time', label: 'Salida', render: (r) => r.exit_time ? formatDateTime(r.exit_time) : '—' },
    { key: 'hours_parked', label: 'Duración', render: (r) => r.exit_time ? formatDuration(r.entry_time, r.exit_time) : '—' },
    { key: 'total_amount', label: 'Total', render: (r) => r.total_amount != null ? formatCurrency(r.total_amount) : '—' },
  ];

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(tenant?.name || 'ParkingPro', 14, 18);
    doc.setFontSize(10);
    doc.text('Reporte de Ingresos', 14, 28);
    doc.text(`Generado: ${formatDate(new Date())}`, pageWidth - 14, 28, { align: 'right' });

    // Period
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Período: ${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`, 14, 45);

    // Summary cards
    let y = 55;
    doc.setFontSize(10);
    doc.text(`Ingresos totales: ${formatCurrency(totalRevenue)}`, 14, y);
    doc.text(`Vehículos atendidos: ${filtered.length}`, 14, y + 7);
    doc.text(`Promedio por servicio: ${formatCurrency(avgPerService)}`, 14, y + 14);

    // By type breakdown
    y += 28;
    if (byType.length > 0) {
      doc.setFontSize(11);
      doc.text('Desglose por tipo:', 14, y);
      y += 7;
      byType.forEach((bt) => {
        doc.setFontSize(9);
        doc.text(`${bt.label}: ${bt.count} servicios - ${formatCurrency(bt.revenue)}`, 20, y);
        y += 6;
      });
    }

    // Table
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [['Placa', 'Tipo', 'Cliente', 'Entrada', 'Salida', 'Total']],
      body: filtered.map((s) => [
        s.plate,
        VEHICLE_TYPE_LABELS[s.vehicle_type],
        s.customer_name || '—',
        formatDateTime(s.entry_time),
        s.exit_time ? formatDateTime(s.exit_time) : '—',
        s.total_amount != null ? formatCurrency(s.total_amount) : '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    doc.save(`reporte-${tenant?.slug || 'parking'}-${formatDate(new Date())}.pdf`);
  };

  if (isLoading) return <ReportsSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Reportes</h1>
          <p className="text-sm text-muted-foreground">Genera reportes de ingresos y actividad</p>
        </div>
        <Button onClick={exportPDF} disabled={filtered.length === 0} className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-1" /> Exportar PDF
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-end gap-3">
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label className="text-xs">Período</Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {period === 'custom' && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-full sm:w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-full sm:w-40" />
            </div>
          </>
        )}
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <Label className="text-xs">Tipo de vehículo</Label>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vehículos Atendidos</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{filtered.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Promedio/Servicio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(avgPerService)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Registros</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{filtered.length}</div></CardContent>
        </Card>
      </div>

      {/* By type breakdown */}
      {byType.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {byType.map((bt) => (
            <Badge key={bt.type} variant="outline" className="px-3 py-2 text-sm">
              {bt.label}: {bt.count} servicios · {formatCurrency(bt.revenue)}
            </Badge>
          ))}
        </div>
      )}

      {/* Detailed table */}
      <DataTable columns={columns} data={filtered} loading={isLoading} searchPlaceholder="Buscar en reportes..." />
    </div>
  );
}
