import { pool } from "../../db/pool.js";
import type { User } from "./users.types.js";

// Forma de una fila tal como la devuelve PostgreSQL (snake_case)
interface UserRow {
  id: number;
  name: string;
  email: string;
  created_at: Date;
}

// Convierte una fila de la base de datos al objeto que usa el resto de la app (camelCase)
function toUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  };
}

export async function findAll(): Promise<User[]> {
  const { rows } = await pool.query<UserRow>(
    "SELECT id, name, email, created_at FROM users ORDER BY id",
  );
  return rows.map(toUser);
}

export async function findById(id: number): Promise<User | null> {
  const { rows } = await pool.query<UserRow>(
    "SELECT id, name, email, created_at FROM users WHERE id= $1",
    [id],
  );
  return rows[0] ? toUser(rows[0]) : null;
}
