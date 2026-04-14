import { createClient } from '@supabase/supabase-js';
import type { Reservation, CreateReservationDTO, ReservationFilters } from '../types/reserva.types.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export class ReservaRepository {
  async findAll(filters?: ReservationFilters): Promise<Reservation[]> {
    let query = supabase.from('ms_reservations').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (filters?.vehiculo_id) query = query.eq('vehiculo_id', filters.vehiculo_id);
    if (filters?.parking_id) query = query.eq('parking_id', filters.parking_id);
    if (filters?.estado) query = query.eq('estado', filters.estado);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Reservation[];
  }

  async findById(id: string): Promise<Reservation | null> {
    const { data, error } = await supabase.from('ms_reservations').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
    if (error) throw error;
    return data as Reservation | null;
  }

  async findActiveByVehicle(vehiculoId: string): Promise<Reservation | null> {
    const { data, error } = await supabase.from('ms_reservations').select('*')
      .eq('vehiculo_id', vehiculoId).eq('estado', 'activa').is('deleted_at', null).maybeSingle();
    if (error) throw error;
    return data as Reservation | null;
  }

  async create(dto: CreateReservationDTO, userId: string): Promise<Reservation> {
    const { data, error } = await supabase.from('ms_reservations').insert({
      vehiculo_id: dto.vehiculo_id,
      spot_id: dto.spot_id,
      parking_id: dto.parking_id,
      user_id: userId,
      estado: 'activa',
      entrada_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return data as Reservation;
  }

  async checkout(id: string, minutos: number): Promise<Reservation> {
    const { data, error } = await supabase.from('ms_reservations').update({
      estado: 'finalizada',
      salida_at: new Date().toISOString(),
      minutos,
    }).eq('id', id).select().single();
    if (error) throw error;
    return data as Reservation;
  }
}
