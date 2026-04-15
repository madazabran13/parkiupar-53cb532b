import express from 'express';
import cors from 'cors';
import { vehiculoRouter } from './routes/vehiculo.routes.js';
import { errorHandler } from '../../../shared/src/middleware.js';


const app = express();
const PORT = Number(process.env.PORT || 3004);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'ms-vehiculos' });
});

app.use('/v1/vehicles', vehiculoRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[ms-vehiculos] listening on port ${PORT}`);
});