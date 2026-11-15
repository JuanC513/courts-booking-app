import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db/pool.js";

const { rows } = await pool.query<{ database: string }>(
  "SELECT current_database() AS database",
);
console.log(`Conectado a PostgreSQL (base de datos: ${rows[0].database})`);

app.listen(config.port, () => {
  console.log(`API escuchando en http://localhost:${config.port}`);
});
