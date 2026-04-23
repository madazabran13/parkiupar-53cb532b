import express from 'express';
import cors from 'cors';
import { parqueaderoRouter } from './routes/parqueadero.routes.js';
import { errorHandler } from '@parkiupar/shared/middleware';


const app = express();
const PORT = Number(process.env.PORT || 3003);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ 
    ok: true, 
    service: 'ms-parqueaderos',
    instance: process.env.INSTANCE_NAME || 'unknown'
  });
});

app.use('/v1/parqueaderos', parqueaderoRouter);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[ms-parqueaderos] listening on port ${PORT}`);
});