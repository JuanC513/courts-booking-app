import {
  isForeignKeyViolation,
  isUniqueViolation,
} from "../../db/pg-errors.js";
import { ConflictError, NotFoundError } from "../../errors/http-errors.js";
import * as userRepository from "./users.repository.js";
import type { User, UserInput } from "./users.types.js";

export async function listUsers(): Promise<User[]> {
  return userRepository.findAll();
}

export async function getUser(id: number): Promise<User> {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new NotFoundError(`No existe el usuario ${id}.`);
  }
  return user;
}

export async function createUser(input: UserInput): Promise<User> {
  try {
    return await userRepository.create(input);
  } catch (err) {
    if (isUniqueViolation(err, "uq_users_email")) {
      throw new ConflictError(
        `Ya existe un usuario con el email ${input.email}.`,
      );
    }
    throw err;
  }
}

export async function replaceUser(id: number, input: UserInput): Promise<User> {
  let user: User | null;
  try {
    user = await userRepository.update(id, input);
  } catch (err) {
    if (isUniqueViolation(err, "uq_users_email")) {
      throw new ConflictError(`Otro usuario ya tiene el email ${input.email}.`);
    }
    throw err;
  }
  if (!user) {
    throw new NotFoundError(`No existe el usuario ${id}.`);
  }
  return user;
}

export async function deleteUser(id: number): Promise<void> {
  let deleted: boolean;
  try {
    deleted = await userRepository.remove(id);
  } catch (err) {
    if (isForeignKeyViolation(err, "fk_bookings_users")) {
      throw new ConflictError(
        `El usuario ${id} tiene reservas asociadas y no se puede eliminar.`,
      );
    }
    throw err;
  }
  if (!deleted) {
    throw new NotFoundError(`No existe el usuario ${id}.`);
  }
}
