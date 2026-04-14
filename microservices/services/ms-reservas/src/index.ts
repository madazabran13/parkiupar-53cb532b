import express from 'express';
import { reservaRouter } from './routes/reserva.routes.js';
import { errorHandler } from '../../../shared/src/middleware.js';

const app = express();
const PORT = Number(process.env.PORT) || 3004;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'up', service: 'ms-reservas', timestamp: new Date().toISOString() });
});

app.use('/v1/reservations', reservaRouter);

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MS-RESERVAS] Listening on port ${PORT}`);
});

export default app;
