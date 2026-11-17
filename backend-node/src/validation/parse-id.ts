import { ValidationError } from "../errors/http-errors.js";

// El mayor valor que cabe en una columna `int` de PostgreSQL
const MAX_INT = 2_147_483_647;

export const ID_MESSAGE = "Debe ser un número entero positivo.";

// La regla de un id, para cuando ya es un número (por ejemplo, en un cuerpo JSON)
export function isValidId(value: number): boolean {
  return Number.isInteger(value) && value <= MAX_INT;
}

// Convierte un texto en id. Devuelve undefined si no es un entero positivo que quepa en `int`
export function toId(value: string): number | undefined {
  if (!/^[1-9]\d*$/.test(value)) {
    return undefined;
  }
  const id = Number(value);
  return isValidId(id) ? id : undefined;
}

// Para el :id de la URL: si no es válido, corta con un 400
export function parseId(value: string): number {
  const id = toId(value);
  if (id === undefined) {
    throw new ValidationError({ id: [ID_MESSAGE] });
  }
  return id;
}
