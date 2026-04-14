export interface Reservation {
  id: string;
  vehiculo_id: string;
  spot_id: string;
  parking_id: string;
  user_id: string;
  entrada_at: string;
  salida_at: string | null;
  minutos: number | null;
  estado: 'activa' | 'finalizada';
  created_at: string;
  deleted_at: string | null;
}

export interface CreateReservationDTO {
  vehiculo_id: string;
  spot_id: string;
  parking_id: string;
}

export interface ReservationFilters {
  vehiculo_id?: string;
  parking_id?: string;
  estado?: string;
}
