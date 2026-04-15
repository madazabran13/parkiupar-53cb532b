import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes.js';
import { errorHandler } from '@parkiupar/shared/middleware';


const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'ms-auth' });
});

app.use('/v1/auth', authRouter);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[ms-auth] listening on port ${PORT}`);
});