import type { Request, Response, NextFunction } from 'express';
import { ParqueaderoService } from '../services/parqueadero.service.js';
import { sendSuccess, sendCreated } from '../../../../shared/src/response.js';

export class ParqueaderoController {
  constructor(private readonly service: ParqueaderoService) {}

  findAllParkings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await this.service.findAllParkings()); } catch (err) { next(err); }
  };

  findParkingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await this.service.findParkingById(req.params.id)); } catch (err) { next(err); }
  };

  createParking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendCreated(res, await this.service.createParking(req.body)); } catch (err) { next(err); }
  };

  updateParking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await this.service.updateParking(req.params.id, req.body)); } catch (err) { next(err); }
  };

  findSpots = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await this.service.findSpots(req.params.id)); } catch (err) { next(err); }
  };

  updateSpotStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await this.service.updateSpotStatus(req.params.id, req.body.estado)); } catch (err) { next(err); }
  };
}
