import type { Request, Response, NextFunction } from 'express';
import { VehiculoService } from '../services/vehiculo.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '../../../../shared/src/response.js';

export class VehiculoController {
  constructor(private readonly service: VehiculoService) {}

  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { placa, tipo, owner_id } = req.query as Record<string, string>;
      const data = await this.service.findAll({ placa, tipo, owner_id });
      sendSuccess(res, data);
    } catch (err) { next(err); }
  };

  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.findById(req.params.id as string);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.create(req.body);
      sendCreated(res, data);
    } catch (err) { next(err); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.update(req.params.id as string, req.body);
      sendSuccess(res, data);
    } catch (err) { next(err); }
  };

  softDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.softDelete(req.params.id as string);
      sendNoContent(res);
    } catch (err) { next(err); }
  };
}