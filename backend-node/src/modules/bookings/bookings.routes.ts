import { Router } from "express";
import * as bookingController from "./bookings.controller.js";

export const bookingsRouter = Router();

bookingsRouter.get("/", bookingController.list);
bookingsRouter.get("/:id", bookingController.getById);
