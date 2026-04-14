export interface Parking {
  id: string;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  capacidad_total: number;
  tarifa_carro: number;
  tarifa_moto: number;
  tarifa_bicicleta: number;
  activo: boolean;
  created_at: string;
}

export interface Spot {
  id: string;
  parking_id: string;
  numero: string;
  tipo: string;
  estado: 'disponible' | 'ocupado' | 'mantenimiento';
  updated_at: string;
}

export interface CreateParkingDTO {
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  capacidad_total: number;
  tarifa_carro: number;
  tarifa_moto: number;
  tarifa_bicicleta: number;
}

export interface UpdateParkingDTO {
  nombre?: string;
  direccion?: string;
  lat?: number;
  lng?: number;
  capacidad_total?: number;
  tarifa_carro?: number;
  tarifa_moto?: number;
  tarifa_bicicleta?: number;
  activo?: boolean;
}

export interface UpdateSpotStatusDTO {
  estado: 'disponible' | 'ocupado' | 'mantenimiento';
}
