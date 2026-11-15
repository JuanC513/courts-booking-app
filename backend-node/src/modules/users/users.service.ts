import { NotFoundError } from "../../errors/http-errors.js";
import * as userRepository from "./users.repository.js";
import type { User } from "./users.types.js";

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
