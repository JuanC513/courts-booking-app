import { pool } from "../../db/pool.js";
import type { User, UserInput } from "./users.types.js";

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

export async function create(input: UserInput): Promise<User> {
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (name, email)
    VALUES ($1, $2)
    RETURNING id, name, email, created_at`,
    [input.name, input.email],
  );
  return toUser(rows[0]);
}

export async function update(
  id: number,
  input: UserInput,
): Promise<User | null> {
  const { rows } = await pool.query<UserRow>(
    `UPDATE users
    SET name = $1, email = $2
    WHERE id = $3
    RETURNING id, name, email, created_at
    `,
    [input.name, input.email, id],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function remove(id: number): Promise<boolean> {
  const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [
    id,
  ]);
  return rowCount === 1;
}
