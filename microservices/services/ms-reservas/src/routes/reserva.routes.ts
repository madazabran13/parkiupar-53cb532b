import { Router } from 'express';
import { ReservaController } from '../controllers/reserva.controller.js';
import { ReservaService } from '../services/reserva.service.js';
import { ReservaRepository } from '../repositories/reserva.repository.js';
import { validate } from '@parkiupar/shared/middleware';
import { createReservationSchema } from '../schemas/reserva.schema.js';

const repo = new ReservaRepository();
const service = new ReservaService(repo);
const controller = new ReservaController(service);

const router = Router();

router.get('/', controller.findAll);
router.get('/:id', controller.findById);
router.post('/', validate(createReservationSchema), controller.create);
router.put('/:id/checkout', controller.checkout);

export { router as reservaRouter };
