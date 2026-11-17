import type { Request, Response } from "express";
import { parseId } from "../../validation/parse-id.js";
import * as bookingService from "./bookings.service.js";
import { validateBookingFilters } from "./bookings.validation.js";

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
