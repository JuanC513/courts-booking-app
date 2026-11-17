import { pool } from "../../db/pool.js";
import type {
  Booking,
  BookingFilters,
  BookingStatus,
} from "./bookings.types.js";

interface BookingRow {
  id: number;
  user_id: number;
  court_id: number;
  starts_at: Date;
  ends_at: Date;
  status: BookingStatus;
  observation: string | null;
  created_at: Date;
}

// Columnas que se leen en todas las consultas: se escriben una sola vez
const COLUMNS =
  "id, user_id, court_id, starts_at, ends_at, status, observation, created_at";

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    userId: row.user_id,
    courtId: row.court_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    observation: row.observation,
    createdAt: row.created_at,
  };
}

export async function findAll(filters: BookingFilters): Promise<Booking[]> {
  // Se arma el WHERE solo con los filtros que llegaron.
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filters.userId !== undefined) {
    values.push(filters.userId);
    conditions.push(`user_id = $${values.length}`);
  }
  if (filters.courtId !== undefined) {
    values.push(filters.courtId);
    conditions.push(`court_id = $${values.length}`);
  }
  if (filters.status !== undefined) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters.from !== undefined) {
    values.push(filters.from);
    conditions.push(`ends_at > $${values.length}`);
  }
  if (filters.to !== undefined) {
    values.push(filters.to);
    conditions.push(`starts_at < $${values.length}`);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await pool.query<BookingRow>(
    `SELECT ${COLUMNS} FROM bookings ${where} ORDER BY starts_at, id`,
    values,
  );

  return rows.map(toBooking);
}

export async function findById(id: number): Promise<Booking | null> {
  const { rows } = await pool.query<BookingRow>(
    `SELECT ${COLUMNS} FROM bookings WHERE id = $1`,
    [id],
  );

  return rows[0] ? toBooking(rows[0]) : null;
}
