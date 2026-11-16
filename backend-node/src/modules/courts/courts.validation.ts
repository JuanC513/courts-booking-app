import { ValidationError } from "../../errors/http-errors.js";
import {
  ensureObject,
  type FieldErrors,
  readRequiredString,
  rejectUnknownFields,
} from "../../validation/body.js";
import type { CourtInput } from "./courts.types.js";

export function validateCourtInput(body: unknown): CourtInput {
  const data = ensureObject(body);
  const errors: FieldErrors = {};

  rejectUnknownFields(data, ["name"], errors);

  const name = readRequiredString(data, "name", 100, errors);

  if (name === undefined || Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  return { name };
}
