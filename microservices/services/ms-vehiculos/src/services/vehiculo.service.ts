import { VehiculoRepository } from '../repositories/vehiculo.repository.js';
import { ConflictError, NotFoundError } from '../../../../shared/src/errors.js';
import type { Vehicle, CreateVehicleDTO, UpdateVehicleDTO } from '../types/vehiculo.types.js';

export class VehiculoService {
  constructor(private readonly repo: VehiculoRepository) {}

  async findAll(filters?: { placa?: string; tipo?: string; owner_id?: string }): Promise<Vehicle[]> {
    return this.repo.findAll(filters);
  }

  async findById(id: string): Promise<Vehicle> {
    const vehicle = await this.repo.findById(id);
    if (!vehicle) throw new NotFoundError('Vehículo');
    return vehicle;
  }

  async create(dto: CreateVehicleDTO): Promise<Vehicle> {
    const existing = await this.repo.findActivePlaca(dto.placa);
    if (existing) throw new ConflictError(`La placa ${dto.placa} ya existe`);
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateVehicleDTO): Promise<Vehicle> {
    await this.findById(id); // Ensure exists
    if (dto.placa) {
      const existing = await this.repo.findActivePlaca(dto.placa);
      if (existing && existing.id !== id) throw new ConflictError(`La placa ${dto.placa} ya existe`);
    }
    return this.repo.update(id, dto);
  }

  async softDelete(id: string): Promise<void> {
    await this.findById(id);
    await this.repo.softDelete(id);
  }
}
