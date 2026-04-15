import { Router } from 'express';
import { VehiculoController } from '../controllers/vehiculo.controller.js';
import { VehiculoService } from '../services/vehiculo.service.js';
import { VehiculoRepository } from '../repositories/vehiculo.repository.js';
import { validate } from '@parkiupar/shared/middleware';
import { createVehicleSchema, updateVehicleSchema } from '../schemas/vehiculo.schema.js';

const repo = new VehiculoRepository();
const service = new VehiculoService(repo);
const controller = new VehiculoController(service);

const router = Router();

router.get('/', controller.findAll);
router.get('/:id', controller.findById);
router.post('/', validate(createVehicleSchema), controller.create);
router.put('/:id', validate(updateVehicleSchema), controller.update);
router.delete('/:id', controller.softDelete);

export { router as vehiculoRouter };
