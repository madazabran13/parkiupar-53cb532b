import type { Request, Response, NextFunction } from 'express';
import { ReservaService } from '../services/reserva.service.js';
import type { CreateReservationDTO } from '../types/reserva.types.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../../../shared/src/response.js';

function getSingleString(value: unknown, field: string): string {
  if (typeof value === 'string') return value;  

  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0];
  }

  throw new Error(`El parámetro "${field}" debe ser un string válido`);
}

function getOptionalSingleString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;

  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
}

export class ReservaController {
  constructor(private readonly service: ReservaService) {}

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const vehiculo_id = getOptionalSingleString(req.query.vehiculo_id);
      const parking_id = getOptionalSingleString(req.query.parking_id);
      const estado = getOptionalSingleString(req.query.estado);

      const filters = {
        vehiculo_id,
        parking_id,
        estado,
      };

      sendSuccess(res, await this.service.findAll(filters));
    } catch (err) {
      next(err);
    }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getSingleString(req.params.id, 'id');
      sendSuccess(res, await this.service.findById(id));
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getOptionalSingleString(req.headers['x-user-id']) || '';
      sendCreated(res, await this.service.create(req.body as CreateReservationDTO, userId));
    } catch (err) {
      next(err);
    }
  };

  checkout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getSingleString(req.params.id, 'id');
      sendSuccess(res, await this.service.checkout(id));
    } catch (err) {
      next(err);
    }
  };
}