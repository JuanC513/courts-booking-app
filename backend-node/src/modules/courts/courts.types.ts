export interface Court {
  id: number;
  name: string;
}

// Datos que envía el cliente para crear o reemplazar una cancha
export type CourtInput = Pick<Court, "name">;
