/**
 * Reserva Service — Business logic with inter-service HTTP communication.
 */
import { ReservaRepository } from '../repositories/reserva.repository.js';
import { ConflictError, NotFoundError, ValidationError } from '@parkiupar/shared/errors';
import type { Reservation, CreateReservationDTO, ReservationFilters } from '../types/reserva.types.js';

const INTERNAL_SECRET = process.env.INTERNAL_SECRET || '';
const MS_VEHICULOS_URL = process.env.MS_VEHICULOS_URL || 'http://ms-vehiculos:3002';
const MS_PARQUEADEROS_URL = process.env.MS_PARQUEADEROS_URL || 'http://ms-parqueaderos:3003';

async function internalFetch(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET,
      ...(options?.headers || {}),
    },
  });
}

export class ReservaService {
  constructor(private readonly repo: ReservaRepository) {}

  async findAll(filters?: ReservationFilters): Promise<Reservation[]> {
    return this.repo.findAll(filters);
  }

  async findById(id: string): Promise<Reservation> {
    const reservation = await this.repo.findById(id);
    if (!reservation) throw new NotFoundError('Reserva');
    return reservation;
  }

  async create(dto: CreateReservationDTO, userId: string): Promise<Reservation> {
    // 1. Verify vehicle exists via ms-vehiculos
    const vehicleRes = await internalFetch(`${MS_VEHICULOS_URL}/v1/vehicles/${dto.vehiculo_id}`);
    if (!vehicleRes.ok) throw new ValidationError('Vehículo no encontrado');

    // 2. Verify spot is available via ms-parqueaderos
    const spotRes = await internalFetch(`${MS_PARQUEADEROS_URL}/v1/spots/${dto.spot_id}`);
    if (!spotRes.ok) throw new ValidationError('Espacio no encontrado');
    const spotData = await spotRes.json();
    if (spotData.data?.estado !== 'disponible') throw new ConflictError('El espacio no está disponible');

    // 3. Check no active reservation for this vehicle
    const active = await this.repo.findActiveByVehicle(dto.vehiculo_id);
    if (active) throw new ConflictError('El vehículo ya tiene una reserva activa');

    // 4. Create reservation
    const reservation = await this.repo.create(dto, userId);

    // 5. Mark spot as occupied
    await internalFetch(`${MS_PARQUEADEROS_URL}/v1/spots/${dto.spot_id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ estado: 'ocupado' }),
    });

    return reservation;
  }

  async checkout(id: string): Promise<Reservation> {
    const reservation = await this.findById(id);
    if (reservation.estado === 'finalizada') throw new ConflictError('La reserva ya está finalizada');

    // Calculate minutes
    const entradaMs = new Date(reservation.entrada_at).getTime();
    const ahoraMs = Date.now();
    const minutos = Math.ceil((ahoraMs - entradaMs) / 60000);

    // Update reservation
    const updated = await this.repo.checkout(id, minutos);

    // Release spot
    await internalFetch(`${MS_PARQUEADEROS_URL}/v1/spots/${reservation.spot_id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ estado: 'disponible' }),
    });

    return updated;
  }
}
