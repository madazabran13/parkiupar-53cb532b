import type { Request, Response, NextFunction } from 'express';
import { ParqueaderoService } from '../services/parqueadero.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../../../shared/src/response.js';

function getSingleString(value: unknown, field: string): string {
  if (typeof value === 'string') return value;

  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
    return value[0];
  }

  throw new Error(`El parámetro "${field}" debe ser un string válido`);
}

export class ParqueaderoController {
  constructor(private readonly service: ParqueaderoService) {}

  findAllParkings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendSuccess(res, await this.service.findAllParkings());
    } catch (err) {
      next(err);
    }
  };

  findParkingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getSingleString(req.params.id, 'id');
      sendSuccess(res, await this.service.findParkingById(id));
    } catch (err) {
      next(err);
    }
  };

  createParking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sendCreated(res, await this.service.createParking(req.body));
    } catch (err) {
      next(err);
    }
  };

  updateParking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getSingleString(req.params.id, 'id');
      sendSuccess(res, await this.service.updateParking(id, req.body));
    } catch (err) {
      next(err);
    }
  };

  findSpots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getSingleString(req.params.id, 'id');
      sendSuccess(res, await this.service.findSpots(id));
    } catch (err) {
      next(err);
    }
  };

  updateSpotStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getSingleString(req.params.id, 'id');
      const estado = getSingleString(req.body.estado, 'estado');
      sendSuccess(res, await this.service.updateSpotStatus(id, estado));
    } catch (err) {
      next(err);
    }
  };
}