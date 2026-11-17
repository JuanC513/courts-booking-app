import { addError, type FieldErrors } from "./body.js";
import { DATE_TIME_MESSAGE, parseDateTime } from "./date-time.js";
import { ID_MESSAGE, toId } from "./parse-id.js";

export type Query = Record<string, unknown>;

// Lee un parámetro de la query string como texto.
// Si viene repetido (?userId=1&userId=2), Express lo entrega como array: se rechaza.
export function readQueryString(
  query: Query,
  name: string,
  errors: FieldErrors,
): string | undefined {
  const value = query[name];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    addError(errors, name, "Debe indicarse una sola vez.");
    return undefined;
  }
  return value;
}

export function readQueryId(
  query: Query,
  name: string,
  errors: FieldErrors,
): number | undefined {
  const raw = readQueryString(query, name, errors);
  if (raw === undefined) {
    return undefined;
  }
  const id = toId(raw);
  if (id === undefined) {
    addError(errors, name, ID_MESSAGE);
  }
  return id;
}

export function readQueryDateTime(
  query: Query,
  name: string,
  errors: FieldErrors,
): Date | undefined {
  const raw = readQueryString(query, name, errors);
  if (raw === undefined) {
    return undefined;
  }
  const date = parseDateTime(raw);
  if (date === undefined) {
    addError(errors, name, DATE_TIME_MESSAGE);
  }
  return date;
}
