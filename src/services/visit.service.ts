import { supabase } from '@/integrations/supabase/client';

export interface VisitRecord {
  id: string;
  plate: string;
  vehicle_type: string;
  entry_time: string;
  exit_time: string | null;
  hours_parked: number | null;
  total_amount: number | null;
  status: string;
  space_number: string | null;
  space_reservation_id: string | null;
  notes: string | null;
  tenant: {
    id: string;
    name: string;
    address: string | null;
    city: string;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'expired' | 'cancelled';

export interface ReservationRecord {
  id: string;
  plate: string | null;
  vehicle_type: string;
  status: ReservationStatus | string;
  reserved_at: string;
  expires_at: string;
  confirmed_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  space: {
    id: string;
    space_number: string;
  } | null;
  tenant: {
    id: string;
    name: string;
    address: string | null;
    city: string;
    phone: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

export const VisitService = {
  async listForConductor(phone: string | null): Promise<VisitRecord[]> {
    if (!phone) return [];

    const { data, error } = await supabase
      .from('parking_sessions')
      .select(`
        id,
        plate,
        vehicle_type,
        entry_time,
        exit_time,
        hours_parked,
        total_amount,
        status,
        space_number,
        space_reservation_id,
        notes,
        tenant:tenants!parking_sessions_tenant_id_fkey ( id, name, address, city, phone, latitude, longitude )
      `)
      .eq('customer_phone', phone)
      .order('entry_time', { ascending: false });

    if (error) throw error;
    // Postgres numeric llega como string en JSON; coerciono a number una sola vez.
    return (data || []).map((r: any) => ({
      ...r,
      hours_parked: r.hours_parked != null ? Number(r.hours_parked) : null,
      total_amount: r.total_amount != null ? Number(r.total_amount) : null,
    })) as unknown as VisitRecord[];
  },

  async listReservationsForConductor(phone: string | null): Promise<ReservationRecord[]> {
    if (!phone) return [];

    // Traigo TODAS las reservas (incluyendo completed). En el frontend, si la
    // reserva tiene una visita vinculada, se hidrata con los datos reales de la
    // visita pero se mantiene como tipo "Reserva" en el listado.
    const { data, error } = await supabase
      .from('space_reservations')
      .select(`
        id,
        plate,
        vehicle_type,
        status,
        reserved_at,
        expires_at,
        confirmed_at,
        customer_name,
        customer_phone,
        space:parking_spaces!space_reservations_space_id_fkey ( id, space_number ),
        tenant:tenants!space_reservations_tenant_id_fkey ( id, name, address, city, phone, latitude, longitude )
      `)
      .eq('customer_phone', phone)
      .order('reserved_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as ReservationRecord[];
  },
};
