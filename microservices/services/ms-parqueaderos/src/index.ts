import express from 'express';
import { parqueaderoRouter, spotsRouter } from './routes/parqueadero.routes.js';
import { errorHandler } from '../../../shared/src/middleware.js';

const app = express();
const PORT = Number(process.env.PORT) || 3003;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'up', service: 'ms-parqueaderos', timestamp: new Date().toISOString() });
});

app.use('/v1/parkings', parqueaderoRouter);
app.use('/v1/spots', spotsRouter);

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MS-PARQUEADEROS] Listening on port ${PORT}`);
});

export default app;
