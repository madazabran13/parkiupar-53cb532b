import { createClient } from '@supabase/supabase-js';
import type { Vehicle, CreateVehicleDTO, UpdateVehicleDTO } from '../types/vehiculo.types.js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export class VehiculoRepository {
  async findAll(filters?: { placa?: string; tipo?: string; owner_id?: string }): Promise<Vehicle[]> {
    let query = supabase.from('ms_vehicles').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (filters?.placa) query = query.ilike('placa', `%${filters.placa}%`);
    if (filters?.tipo) query = query.eq('tipo', filters.tipo);
    if (filters?.owner_id) query = query.eq('owner_id', filters.owner_id);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Vehicle[];
  }

  async findById(id: string): Promise<Vehicle | null> {
    const { data, error } = await supabase.from('ms_vehicles').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
    if (error) throw error;
    return data as Vehicle | null;
  }

  async findActivePlaca(placa: string): Promise<Vehicle | null> {
    const { data, error } = await supabase.from('ms_vehicles').select('*').eq('placa', placa).is('deleted_at', null).maybeSingle();
    if (error) throw error;
    return data as Vehicle | null;
  }

  async create(dto: CreateVehicleDTO): Promise<Vehicle> {
    const { data, error } = await supabase.from('ms_vehicles').insert({
      placa: dto.placa, tipo: dto.tipo,
      marca: dto.marca || null, modelo: dto.modelo || null,
      color: dto.color || null, owner_id: dto.owner_id || null,
    }).select().single();
    if (error) throw error;
    return data as Vehicle;
  }

  async update(id: string, dto: UpdateVehicleDTO): Promise<Vehicle> {
    const { data, error } = await supabase.from('ms_vehicles')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id).is('deleted_at', null).select().single();
    if (error) throw error;
    return data as Vehicle;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase.from('ms_vehicles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id).is('deleted_at', null);
    if (error) throw error;
  }
}
