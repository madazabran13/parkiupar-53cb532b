export interface Vehicle {
  id: string;
  placa: string;
  tipo: 'carro' | 'moto' | 'bicicleta';
  marca: string | null;
  modelo: string | null;
  color: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateVehicleDTO {
  placa: string;
  tipo: 'carro' | 'moto' | 'bicicleta';
  marca?: string;
  modelo?: string;
  color?: string;
  owner_id?: string;
}

export interface UpdateVehicleDTO {
  placa?: string;
  tipo?: 'carro' | 'moto' | 'bicicleta';
  marca?: string;
  modelo?: string;
  color?: string;
  owner_id?: string;
}
