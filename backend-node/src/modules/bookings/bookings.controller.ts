import type { Request, Response } from "express";
import { parseId } from "../../validation/parse-id.js";
import * as bookingService from "./bookings.service.js";
import {
  validateBookingFilters,
  validateBookingInput,
  validateStatusUpdate,
} from "./bookings.validation.js";

export async function list(req: Request, res: Response) {
  const filters = validateBookingFilters(req.query);
  const bookings = await bookingService.listBookings(filters);
  res.json(bookings);
}

export async function getById(req: Request<{ id: string }>, res: Response) {
  const id = parseId(req.params.id);
  const booking = await bookingService.getBooking(id);
  res.json(booking);
}

export async function create(req: Request, res: Response) {
  const input = validateBookingInput(req.body);
  const booking = await bookingService.createBooking(input);

  res.status(201).location(`/bookings/${booking.id}`).json(booking);
}

export async function updateStatus(
  req: Request<{ id: string }>,
  res: Response,
) {
  const id = parseId(req.params.id);
  const status = validateStatusUpdate(req.body);
  const booking = await bookingService.changeBookingStatus(id, status);
  res.json(booking);
}
