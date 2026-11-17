// La lista de estados existe en ejecución (para validar) y de ella sale el tipo
export const BOOKING_STATUSES = ["confirmed", "cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface Booking {
  id: number;
  userId: number;
  courtId: number;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  observation: string | null;
  createdAt: Date;
}

// Filtros opcionales de GET /bookings
export interface BookingFilters {
  userId?: number;
  courtId?: number;
  status?: BookingStatus;
  from?: Date;
  to?: Date;
}

// Datos que envía el cliente para crear una reserva
export type BookingInput = Pick<
  Booking,
  "userId" | "courtId" | "startsAt" | "endsAt" | "observation"
>;
