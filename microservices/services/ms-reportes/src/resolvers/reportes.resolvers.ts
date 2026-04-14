import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export const resolvers = {
  Query: {
    ocupacion: async (_: unknown, args: { parkingId: string; desde: string; hasta: string }) => {
      const { data: reservations } = await supabase
        .from('ms_reservations')
        .select('*')
        .eq('parking_id', args.parkingId)
        .gte('entrada_at', args.desde)
        .lte('entrada_at', args.hasta)
        .is('deleted_at', null);

      const records = reservations || [];
      const totalReservas = records.length;
      const minutosPromedio = totalReservas > 0
        ? records.reduce((sum: number, r: { minutos: number | null }) => sum + (r.minutos || 0), 0) / totalReservas
        : 0;

      // Group by day
      const dayMap = new Map<string, number>();
      for (const r of records) {
        const fecha = (r as { entrada_at: string }).entrada_at.split('T')[0];
        dayMap.set(fecha, (dayMap.get(fecha) || 0) + 1);
      }
      const ocupacionPorDia = Array.from(dayMap.entries())
        .map(([fecha, reservas]) => ({ fecha, reservas }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));

      return { parkingId: args.parkingId, totalReservas, minutosPromedio, ocupacionPorDia };
    },

    topVehiculos: async (_: unknown, args: { limit?: number }) => {
      const limit = args.limit || 10;
      const { data: reservations } = await supabase
        .from('ms_reservations')
        .select('vehiculo_id')
        .is('deleted_at', null);

      // Count by vehicle
      const countMap = new Map<string, number>();
      for (const r of (reservations || [])) {
        const vid = (r as { vehiculo_id: string }).vehiculo_id;
        countMap.set(vid, (countMap.get(vid) || 0) + 1);
      }

      const sorted = Array.from(countMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

      // Get plates
      const vehicleIds = sorted.map(([id]) => id);
      const { data: vehicles } = await supabase
        .from('ms_vehicles')
        .select('id, placa')
        .in('id', vehicleIds);

      const plateMap = new Map((vehicles || []).map((v: { id: string; placa: string }) => [v.id, v.placa]));

      return sorted.map(([vehiculoId, totalReservas]) => ({
        vehiculoId,
        placa: plateMap.get(vehiculoId) || 'N/A',
        totalReservas,
      }));
    },

    ingresosPorParqueadero: async (_: unknown, args: { parkingId: string; periodo: string }) => {
      // Get parking tariffs
      const { data: parking } = await supabase
        .from('ms_parkings')
        .select('tarifa_carro')
        .eq('id', args.parkingId)
        .single();

      const tarifaPorHora = parking?.tarifa_carro || 0;

      // Get finished reservations in period
      const now = new Date();
      let desde: string;
      if (args.periodo === 'dia') {
        desde = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      } else if (args.periodo === 'semana') {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        desde = d.toISOString();
      } else {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1);
        desde = d.toISOString();
      }

      const { data: reservations } = await supabase
        .from('ms_reservations')
        .select('minutos')
        .eq('parking_id', args.parkingId)
        .eq('estado', 'finalizada')
        .gte('salida_at', desde)
        .is('deleted_at', null);

      const totalMinutos = (reservations || []).reduce(
        (sum: number, r: { minutos: number | null }) => sum + (r.minutos || 0), 0
      );
      const ingresoEstimado = (totalMinutos / 60) * tarifaPorHora;

      return { parkingId: args.parkingId, ingresoEstimado, periodo: args.periodo };
    },
  },

  Mutation: {
    exportarReportePDF: async (_: unknown, _args: { filtros: { parkingId?: string; desde?: string; hasta?: string } }) => {
      // Placeholder: in a real scenario, generate PDF and return URL
      return {
        url: `https://api.parkiupar.com/reports/generated-${Date.now()}.pdf`,
        generadoEn: new Date().toISOString(),
      };
    },
  },
};
