import { ValidationError } from "../errors/http-errors.js";

// El mayor valor que cabe en una columna `int` de PostgreSQL
const MAX_INT = 2_147_483_647;

export function parseId(value: string): number {
  const id = Number(value);
  if (!/^[1-9]\d*$/.test(value) || id > MAX_INT) {
    throw new ValidationError({ id: ["Debe ser un número entero positivo."] });
  }
  return id;
}
