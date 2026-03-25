export type BookingStatus = "pendiente" | "confirmada" | "cancelada";

export type Booking = {
  id: string;
  created_at: string;
  fecha: string; // YYYY-MM-DD
  aula: string;
  nombre: string;
  idea: string;
  num_alumnos: number;
  status: BookingStatus;
};

