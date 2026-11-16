import { ValidationError } from "../../errors/http-errors.js";
import {
  addError,
  ensureObject,
  type FieldErrors,
  readRequiredString,
  rejectUnknownFields,
} from "../../validation/body.js";
import type { UserInput } from "./users.types.js";

// Validación sencilla: pepe@example.something, sin espacios
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUserInput(body: unknown): UserInput {
  const data = ensureObject(body);
  const errors: FieldErrors = {};

  rejectUnknownFields(data, ["name", "email"], errors);

  const name = readRequiredString(data, "name", 75, errors);

  // El email se guarda en minúsculas: de esa manera "Pepe@Example.com" y "pepe@example.com" son el mismo
  const email = readRequiredString(data, "email", 100, errors)?.toLowerCase();
  if (email !== undefined && !EMAIL_REGEX.test(email)) {
    addError(errors, "email", "Debe ser un email válido.");
  }

  if (
    name === undefined ||
    email === undefined ||
    Object.keys(errors).length > 0
  ) {
    throw new ValidationError(errors);
  }

  return { name, email };
}
