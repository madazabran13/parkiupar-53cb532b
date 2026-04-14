import type { Request, Response, NextFunction } from 'express';
import { ReservaService } from '../services/reserva.service.js';
import { sendSuccess, sendCreated } from '../../../../shared/src/response.js';

export class ReservaController {
  constructor(private readonly service: ReservaService) {}

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { vehiculo_id, parking_id, estado } = req.query as Record<string, string>;
      sendSuccess(res, await this.service.findAll({ vehiculo_id, parking_id, estado }));
    } catch (err) { next(err); }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await this.service.findById(req.params.id)); } catch (err) { next(err); }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      sendCreated(res, await this.service.create(req.body, userId));
    } catch (err) { next(err); }
  };

  checkout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await this.service.checkout(req.params.id)); } catch (err) { next(err); }
  };
}
