import express from "express";
import swaggerUi from "swagger-ui-express";
import { pool } from "./db/pool.js";
import { openApiSpec } from "./openapi.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { courtsRouter } from "./modules/courts/courts.routes.js";
import { bookingsRouter } from "./modules/bookings/bookings.routes.js";

export const app = express();

app.disable("x-powered-by");

app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "ok" });
  } catch {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

app.use("/users", usersRouter);
app.use("/courts", courtsRouter);
app.use("/bookings", bookingsRouter);

// Documentación interactiva del contrato
app.get("/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Siempre al final, y en este orden
app.use(notFoundHandler);
app.use(errorHandler);
