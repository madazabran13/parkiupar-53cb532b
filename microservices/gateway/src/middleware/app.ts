import express from "express";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// tus rutas
//app.use("/auth", authRoutes);
//app.use("/reservas", reservasRoutes);

app.listen(8080, () => {
  console.log("Gateway corriendo en puerto 8080");
});