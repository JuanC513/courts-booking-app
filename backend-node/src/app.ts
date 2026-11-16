import express from "express";
import { pool } from "./db/pool.js";
import { errorHandler } from "./middlewares/error-handler.js";
import { notFoundHandler } from "./middlewares/not-found.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { courtsRouter } from "./modules/courts/courts.routes.js";

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

// Siempre al final, y en este orden
app.use(notFoundHandler);
app.use(errorHandler);
