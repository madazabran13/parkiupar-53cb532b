import express from 'express';
import { authRouter } from './routes/auth.routes.js';
import { errorHandler } from '../../../shared/src/middleware.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'up', service: 'ms-auth', timestamp: new Date().toISOString() });
});

app.use('/v1/auth', authRouter);

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MS-AUTH] Listening on port ${PORT}`);
});

export default app;
