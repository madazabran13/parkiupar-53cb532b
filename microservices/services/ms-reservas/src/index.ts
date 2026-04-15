import express from 'express';
import cors from 'cors';
import { reservaRouter } from './routes/reserva.routes.js';
import { errorHandler } from '@parkiupar/shared/middleware';

const app = express();
const PORT = Number(process.env.PORT || 3004);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'ms-reservas' });
});

app.use('/v1/reservations', reservaRouter);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[ms-reservas] listening on port ${PORT}`);
});