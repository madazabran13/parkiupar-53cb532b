import type { Request, Response, NextFunction } from 'express';
import { ParqueaderoService } from '../services/parqueadero.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '@parkiupar/shared/response';

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
      // El frontend envía el tenantId como query param o como id de parking
      const rawId = req.query.tenantId || req.params.id;
      let id: string;
      
      if (Array.isArray(rawId)) {
        id = rawId[0] as string;
      } else if (typeof rawId === 'string') {
        id = rawId;
      } else {
        id = String(rawId);
      }
      
      if (!id || id === 'undefined') throw new Error('Tenant ID es requerido');
      
      const spots = await this.service.findSpots(id);
      sendSuccess(res, spots);
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