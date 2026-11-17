import {
  isExclusionViolation,
  isForeignKeyViolation,
} from "../../db/pg-errors.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../errors/http-errors.js";
import * as bookingRepository from "./bookings.repository.js";
import type {
  Booking,
  BookingFilters,
  BookingInput,
  BookingStatus,
} from "./bookings.types.js";

export async function listBookings(
  filters: BookingFilters,
): Promise<Booking[]> {
  return bookingRepository.findAll(filters);
}

export async function getBooking(id: number): Promise<Booking> {
  const booking = await bookingRepository.findById(id);
  if (!booking) {
    throw new NotFoundError(`No existe la reserva ${id}.`);
  }
  return booking;
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  try {
    return await bookingRepository.create(input);
  } catch (err) {
    if (isExclusionViolation(err, "ex_bookings_no_overlap")) {
      throw new ConflictError(
        `La cancha ${input.courtId} ya tiene una reserva confirmada que se cruza con ese horario.`,
      );
    }
    // Un id inexistente en el cuerpo es un dato inválido (400), no una URL inexistente (404)
    if (isForeignKeyViolation(err, "fk_bookings_users")) {
      throw new ValidationError({
        userId: [`No existe el usuario ${input.userId}.`],
      });
    }
    if (isForeignKeyViolation(err, "fk_bookings_courts")) {
      throw new ValidationError({
        courtId: [`No existe la cancha ${input.courtId}.`],
      });
    }
    throw err;
  }
}

export async function changeBookingStatus(
  id: number,
  status: BookingStatus,
): Promise<Booking> {
  // La única transición permitida: confirmed → cancelled
  if (status === "cancelled") {
    const cancelled = await bookingRepository.cancel(id);
    if (cancelled) {
      return cancelled;
    }
  }

  // No hubo cambio: se averigua por qué para responder con el error correcto
  const booking = await bookingRepository.findById(id);
  if (!booking) {
    throw new NotFoundError(`No existe la reserva ${id}.`);
  }
  if (booking.status === "cancelled") {
    throw new ConflictError(
      `La reserva ${id} está cancelada y no puede cambiar de estado.`,
    );
  }
  if (status === "confirmed") {
    throw new ConflictError(`La reserva ${id} ya está confirmada.`);
  }
  throw new ConflictError(`La reserva ${id} ya empezó y no se puede cancelar.`);
}
