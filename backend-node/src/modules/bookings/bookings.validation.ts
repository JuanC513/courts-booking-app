import { ValidationError } from "../../errors/http-errors.js";
import { addError, type FieldErrors } from "../../validation/body.js";
import {
  type Query,
  readQueryDateTime,
  readQueryId,
  readQueryString,
} from "../../validation/query.js";
import {
  BOOKING_STATUSES,
  type BookingFilters,
  type BookingStatus,
} from "./bookings.types.js";

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
      addError(
        errors,
        "status",
        `Debe ser uno de: ${BOOKING_STATUSES.join(", ")}.`,
      );
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
