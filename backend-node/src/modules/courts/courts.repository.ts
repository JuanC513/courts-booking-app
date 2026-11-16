import { pool } from "../../db/pool.js";
import type { Court, CourtInput } from "./courts.types.js";

// Las columnas ya coinciden con el dominio (id, name): no hace falta un tipo Row ni un toCourt
export async function findAll(): Promise<Court[]> {
  const { rows } = await pool.query<Court>(
    "SELECT id, name FROM courts ORDER BY id",
  );

  return rows;
}

export async function findById(id: number): Promise<Court | null> {
  const { rows } = await pool.query<Court>(
    `SELECT id, name FROM courts WHERE id= $1`,
    [id],
  );

  return rows[0] ?? null;
}

export async function create(input: CourtInput): Promise<Court> {
  const { rows } = await pool.query<Court>(
    `INSERT INTO courts (name)
    VALUES ($1)
    RETURNING id, name`,
    [input.name],
  );

  return rows[0];
}

export async function update(
  id: number,
  input: CourtInput,
): Promise<Court | null> {
  const { rows } = await pool.query<Court>(
    `UPDATE courts
    SET name = $1
    WHERE id = $2
    RETURNING id, name`,
    [input.name, id],
  );

  return rows[0] ?? null;
}

export async function remove(id: number): Promise<boolean> {
  const { rowCount } = await pool.query(
    "DELETE FROM courts WHERE id = $1",
    [id],
  );

  return rowCount === 1;
}
