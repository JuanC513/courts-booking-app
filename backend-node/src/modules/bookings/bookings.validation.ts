import { ValidationError } from "../../errors/http-errors.js";
import {
  addError,
  ensureObject,
  type FieldErrors,
  readOptionalString,
  readRequiredDateTime,
  readRequiredId,
  rejectUnknownFields,
} from "../../validation/body.js";
import {
  type Query,
  readQueryDateTime,
  readQueryId,
  readQueryString,
} from "../../validation/query.js";
import {
  BOOKING_STATUSES,
  type BookingFilters,
  type BookingInput,
  type BookingStatus,
} from "./bookings.types.js";

const STATUS_MESSAGE = `Debe ser uno de: ${BOOKING_STATUSES.join(", ")}.`;

const HOUR_MS = 60 * 60 * 1000;
const MIN_HOURS = 1;
const MAX_HOURS = 3;

// Type guard: si devuelve true, TypeScript sabe que `value` es un BookingStatus
function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as readonly string[]).includes(value);
}

export function validateBookingFilters(query: Query): BookingFilters {
  const errors: FieldErrors = {};

  const userId = readQueryId(query, "userId", errors);
  const courtId = readQueryId(query, "courtId", errors);

  let status: BookingStatus | undefined;
  const rawStatus = readQueryString(query, "status", errors);
  if (rawStatus !== undefined) {
    if (isBookingStatus(rawStatus)) {
      status = rawStatus;
    } else {
      addError(errors, "status", STATUS_MESSAGE);
    }
  }

  const from = readQueryDateTime(query, "from", errors);
  const to = readQueryDateTime(query, "to", errors);

  if (from !== undefined && to !== undefined && to <= from) {
    addError(errors, "to", "Debe ser posterior a from.");
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  return { userId, courtId, status, from, to };
}

// Una hora en punto es un múltiplo exacto de una hora desde 1970-01-01T00:00:00Z
function isOnTheHour(date: Date): boolean {
  return date.getTime() % HOUR_MS === 0;
}

// Reglas de negocio del horario. Solo se revisan si las dos fechas tienen un formato válido.
function checkSchedule(startsAt: Date, endsAt: Date, errors: FieldErrors) {
  if (!isOnTheHour(startsAt)) {
    addError(errors, "startsAt", "Debe ser una hora en punto.");
  }
  if (!isOnTheHour(endsAt)) {
    addError(errors, "endsAt", "Debe ser una hora en punto.");
  }
  if (startsAt.getTime() < Date.now()) {
    addError(errors, "startsAt", "No puede estar en el pasado.");
  }

  // Si endsAt es anterior a startsAt, la duración es negativa y también cae aquí
  const hours = (endsAt.getTime() - startsAt.getTime()) / HOUR_MS;
  if (hours < MIN_HOURS || hours > MAX_HOURS) {
    addError(
      errors,
      "endsAt",
      `La reserva debe durar entre ${MIN_HOURS} y ${MAX_HOURS} horas.`,
    );
  }
}

export function validateBookingInput(body: unknown): BookingInput {
  const data = ensureObject(body);
  const errors: FieldErrors = {};

  rejectUnknownFields(
    data,
    ["userId", "courtId", "startsAt", "endsAt", "observation"],
    errors,
  );

  const userId = readRequiredId(data, "userId", errors);
  const courtId = readRequiredId(data, "courtId", errors);
  const startsAt = readRequiredDateTime(data, "startsAt", errors);
  const endsAt = readRequiredDateTime(data, "endsAt", errors);
  const observation = readOptionalString(data, "observation", 255, errors);

  if (startsAt !== undefined && endsAt !== undefined) {
    checkSchedule(startsAt, endsAt, errors);
  }

  if (
    userId === undefined ||
    courtId === undefined ||
    startsAt === undefined ||
    endsAt === undefined ||
    Object.keys(errors).length > 0
  ) {
    throw new ValidationError(errors);
  }

  return { userId, courtId, startsAt, endsAt, observation };
}

export function validateStatusUpdate(body: unknown): BookingStatus {
  const data = ensureObject(body);
  const errors: FieldErrors = {};

  rejectUnknownFields(data, ["status"], errors);

  let status: BookingStatus | undefined;
  const value = data.status;
  if (value === undefined) {
    addError(errors, "status", "Es obligatorio.");
  } else if (typeof value === "string" && isBookingStatus(value)) {
    status = value;
  } else {
    addError(errors, "status", STATUS_MESSAGE);
  }

  if (status === undefined || Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  return status;
}
