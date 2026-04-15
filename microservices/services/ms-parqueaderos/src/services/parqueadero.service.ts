import { ParqueaderoRepository } from '../repositories/parqueadero.repository.js';
import { NotFoundError } from '@parkiupar/shared/errors';
import type { Parking, Spot, CreateParkingDTO, UpdateParkingDTO } from '../types/parqueadero.types.js';

export class ParqueaderoService {
  constructor(private readonly repo: ParqueaderoRepository) {}

  async findAllParkings(): Promise<Parking[]> {
    return this.repo.findAllParkings();
  }

  async findParkingById(id: string): Promise<Parking & { spots: Spot[] }> {
    const parking = await this.repo.findParkingById(id);
    if (!parking) throw new NotFoundError('Parqueadero');
    const spots = await this.repo.findSpotsByParking(id);
    return { ...parking, spots };
  }

  async createParking(dto: CreateParkingDTO): Promise<Parking> {
    return this.repo.createParking(dto);
  }

  async updateParking(id: string, dto: UpdateParkingDTO): Promise<Parking> {
    const parking = await this.repo.findParkingById(id);
    if (!parking) throw new NotFoundError('Parqueadero');
    return this.repo.updateParking(id, dto);
  }

  async findSpots(parkingId: string): Promise<Spot[]> {
    const parking = await this.repo.findParkingById(parkingId);
    if (!parking) throw new NotFoundError('Parqueadero');
    return this.repo.findSpotsByParking(parkingId);
  }

  async updateSpotStatus(spotId: string, estado: string): Promise<Spot> {
    const spot = await this.repo.findSpotById(spotId);
    if (!spot) throw new NotFoundError('Espacio');
    return this.repo.updateSpotStatus(spotId, estado);
  }
}
