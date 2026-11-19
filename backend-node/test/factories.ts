import { pool } from "../src/db/pool.js";

// Funciones para preparar datos de prueba directamente en la base, sin pasar por la API.
// Cada una inserta una fila con valores por defecto razonables y devuelve su id.

let emailCounter = 0;

export async function createUser(
  data: { name?: string; email?: string } = {},
): Promise<number> {
  // Un email distinto en cada llamada, para no chocar con uq_users_email
  const email = data.email ?? `usuario${++emailCounter}@example.com`;
  const { rows } = await pool.query<{ id: number }>(
    "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
    [data.name ?? "Usuario de prueba", email],
  );
  return rows[0].id;
}

export async function createCourt(
  data: { name?: string } = {},
): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    "INSERT INTO courts (name) VALUES ($1) RETURNING id",
    [data.name ?? "Cancha de prueba"],
  );
  return rows[0].id;
}

// Sin pasar por la API, se pueden crear reservas que la API rechazaría (por ejemplo, en el pasado).
// Solo se aplican las restricciones de la base de datos.
export async function createBooking(data: {
  userId: number;
  courtId: number;
  startsAt: string;
  endsAt: string;
  status?: "confirmed" | "cancelled";
}): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO bookings (user_id, court_id, starts_at, ends_at, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      data.userId,
      data.courtId,
      data.startsAt,
      data.endsAt,
      data.status ?? "confirmed",
    ],
  );
  return rows[0].id;
}
