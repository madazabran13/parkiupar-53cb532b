import { createClient } from '@supabase/supabase-js';
import type { Parking, Spot, CreateParkingDTO, UpdateParkingDTO } from '../types/parqueadero.types.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export class ParqueaderoRepository {
  async findAllParkings(): Promise<Parking[]> {
    const { data, error } = await supabase.from('ms_parkings').select('*').eq('activo', true).order('nombre');
    if (error) throw error;
    return (data || []) as Parking[];
  }

  async findParkingById(id: string): Promise<Parking | null> {
    const { data, error } = await supabase.from('ms_parkings').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Parking | null;
  }

  async createParking(dto: CreateParkingDTO): Promise<Parking> {
    const { data, error } = await supabase.from('ms_parkings').insert(dto).select().single();
    if (error) throw error;
    return data as Parking;
  }

  async updateParking(id: string, dto: UpdateParkingDTO): Promise<Parking> {
    const { data, error } = await supabase.from('ms_parkings').update(dto).eq('id', id).select().single();
    if (error) throw error;
    return data as Parking;
  }

  async findSpotsByParking(parkingId: string): Promise<Spot[]> {
    const { data, error } = await supabase.from('parking_spaces').select('*').eq('tenant_id', parkingId).order('space_number');
    if (error) throw error;
    return (data || []).map(d => ({
      id: d.id,
      parking_id: d.tenant_id,
      numero: d.space_number,
      estado: d.status,
      tipo: 'car',
      created_at: d.created_at,
      updated_at: d.updated_at
    })) as any;
  }

  async findSpotById(id: string): Promise<Spot | null> {
    const { data, error } = await supabase.from('ms_spots').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Spot | null;
  }

  async updateSpotStatus(id: string, estado: string): Promise<Spot> {
    const { data, error } = await supabase.from('ms_spots')
      .update({ estado, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return data as Spot;
  }
}
