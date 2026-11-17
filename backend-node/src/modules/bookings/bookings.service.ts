import { NotFoundError } from "../../errors/http-errors.js";
import * as bookingRepository from "./bookings.repository.js";
import type { Booking, BookingFilters } from "./bookings.types.js";

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
