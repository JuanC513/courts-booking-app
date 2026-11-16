export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

// Datos que envía el cliente para crear o reemplazar un usuario
export type UserInput = Pick<User, "name" | "email">;
