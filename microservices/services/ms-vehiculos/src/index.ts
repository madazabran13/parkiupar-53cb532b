import express from 'express';
import { vehiculoRouter } from './routes/vehiculo.routes.js';
import { errorHandler } from '../../../shared/src/middleware.js';

const app = express();
const PORT = Number(process.env.PORT) || 3002;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'up', service: 'ms-vehiculos', timestamp: new Date().toISOString() });
});

app.use('/v1/vehicles', vehiculoRouter);

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MS-VEHICULOS] Listening on port ${PORT}`);
});

export default app;
