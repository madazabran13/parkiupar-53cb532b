import express from 'express';
import cors from 'cors';

const app = express();
const PORT = Number(process.env.PORT || 3005);

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'ms-reportes' });
});

// aquí luego montas tus rutas reales
// app.use('/reservations', reservationRoutes);

app.listen(PORT, () => {
  console.log(`[ms-reportes] listening on port ${PORT}`);
});