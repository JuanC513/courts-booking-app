import { isForeignKeyViolation } from "../../db/pg-errors.js";
import { ConflictError, NotFoundError } from "../../errors/http-errors.js";
import * as courtRepository from "./courts.repository.js";
import type { Court, CourtInput } from "./courts.types.js";

export async function listCourts(): Promise<Court[]> {
  return courtRepository.findAll();
}

export async function getCourt(id: number): Promise<Court> {
  const court = await courtRepository.findById(id);
  if (!court) {
    throw new NotFoundError(`No existe la cancha ${id}.`);
  }
  return court;
}

// Sin try/catch: courts no tiene UNIQUE, así que no hay error de PostgreSQL que traducir
export async function createCourt(input: CourtInput): Promise<Court> {
  return courtRepository.create(input);
}

export async function replaceCourt(
  id: number,
  input: CourtInput,
): Promise<Court> {
  const court = await courtRepository.update(id, input);

  if (!court) {
    throw new NotFoundError(`No existe la cancha ${id}.`);
  }

  return court;
}

export async function deleteCourt(id: number): Promise<void> {
  let deleted: boolean;
  try {
    deleted = await courtRepository.remove(id);
  } catch (err) {
    if (isForeignKeyViolation(err, "fk_bookings_courts")) {
      throw new ConflictError(
        `La cancha ${id} tiene reservas asociadas y no se puede eliminar.`,
      );
    }
    throw err;
  }
  if (!deleted) {
    throw new NotFoundError(`No existe la cancha ${id}.`);
  }
}
