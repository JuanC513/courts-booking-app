import pg from "pg";
import { config } from "../config.js";

export const pool = new pg.Pool(config.db);

pool.on("error", (err) => {
  console.error("Error inesperado en una conexión inactiva del pool", err);
});
