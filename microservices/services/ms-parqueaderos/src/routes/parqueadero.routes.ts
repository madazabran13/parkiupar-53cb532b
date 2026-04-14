import { Router } from 'express';
import { ParqueaderoController } from '../controllers/parqueadero.controller.js';
import { ParqueaderoService } from '../services/parqueadero.service.js';
import { ParqueaderoRepository } from '../repositories/parqueadero.repository.js';
import { validate, guardInternal } from '../../../../shared/src/middleware.js';
import { createParkingSchema, updateParkingSchema, updateSpotStatusSchema } from '../schemas/parqueadero.schema.js';

const repo = new ParqueaderoRepository();
const service = new ParqueaderoService(repo);
const controller = new ParqueaderoController(service);

const router = Router();

router.get('/', controller.findAllParkings);
router.get('/:id', controller.findParkingById);
router.post('/', validate(createParkingSchema), controller.createParking);
router.put('/:id', validate(updateParkingSchema), controller.updateParking);
router.get('/:id/spots', controller.findSpots);

// Spots routes
const spotsRouter = Router();
spotsRouter.put('/:id/status', validate(updateSpotStatusSchema), controller.updateSpotStatus);

export { router as parqueaderoRouter, spotsRouter };
