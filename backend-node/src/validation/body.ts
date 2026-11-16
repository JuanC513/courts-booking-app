import { ValidationError } from "../errors/http-errors.js";

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
