import { ValidationError } from "../errors/http-errors.js";
import { DATE_TIME_MESSAGE, parseDateTime } from "./date-time.js";
import { ID_MESSAGE, isValidId } from "./parse-id.js";

export type FieldErrors = Record<string, string[]>;

export function addError(errors: FieldErrors, field: string, message: string) {
  (errors[field] ??= []).push(message);
}

// Comprueba que el cuerpo sea un objeto JSON y no un array, un número, null, etc.
// Si no lo es, no tiene sentido seguir validando y se corta.
export function ensureObject(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ValidationError({
      body: ["El cuerpo debe ser un objeto JSON."],
    });
  }
  return body as Record<string, unknown>;
}

// Rechaza propiedades que no están en el contrato (additionalProperties: false)
export function rejectUnknownFields(
  data: Record<string, unknown>,
  allowed: string[],
  errors: FieldErrors,
) {
  for (const key of Object.keys(data)) {
    if (!allowed.includes(key)) {
      addError(errors, key, "Propiedad no permitida.");
    }
  }
}

// Lee un texto obligatorio, sin espacios al inicio ni al final
export function readRequiredString(
  data: Record<string, unknown>,
  field: string,
  maxLength: number,
  errors: FieldErrors,
): string | undefined {
  const value = data[field];
  if (value === undefined) {
    addError(errors, field, "Es obligatorio.");
    return undefined;
  }
  if (typeof value !== "string") {
    addError(errors, field, "Debe ser un texto.");
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    addError(errors, field, "No puede estar vacío.");
    return undefined;
  }
  if (trimmed.length > maxLength) {
    addError(errors, field, `No puede superar los ${maxLength} caracteres.`);
    return undefined;
  }
  return trimmed;
}

// Lee un texto opcional. Si no viene, es null o queda vacío al quitar los espacios, devuelve null.
// Si es inválido agrega el error y también devuelve null: el error ya impide continuar.
export function readOptionalString(
  data: Record<string, unknown>,
  field: string,
  maxLength: number,
  errors: FieldErrors,
): string | null {
  const value = data[field];
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    addError(errors, field, "Debe ser un texto.");
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    addError(errors, field, `No puede superar los ${maxLength} caracteres.`);
    return null;
  }
  return trimmed.length > 0 ? trimmed : null;
}

// Lee un id obligatorio. En JSON debe llegar como número (1), no como texto ("1")
export function readRequiredId(
  data: Record<string, unknown>,
  field: string,
  errors: FieldErrors,
): number | undefined {
  const value = data[field];
  if (value === undefined) {
    addError(errors, field, "Es obligatorio.");
    return undefined;
  }
  if (typeof value !== "number" || !isValidId(value)) {
    addError(errors, field, ID_MESSAGE);
    return undefined;
  }
  return value;
}

// Lee una fecha y hora obligatoria. En JSON no existe el tipo fecha: llega como texto ISO 8601
export function readRequiredDateTime(
  data: Record<string, unknown>,
  field: string,
  errors: FieldErrors,
): Date | undefined {
  const value = data[field];
  if (value === undefined) {
    addError(errors, field, "Es obligatorio.");
    return undefined;
  }
  const date = typeof value === "string" ? parseDateTime(value) : undefined;
  if (date === undefined) {
    addError(errors, field, DATE_TIME_MESSAGE);
  }
  return date;
}
