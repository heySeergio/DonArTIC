export type BookingStatus = "pendiente" | "confirmada" | "cancelada";

export type Booking = {
  id: string;
  created_at: string;
  fecha: string; // YYYY-MM-DD
  aula: string;
  nombre: string;
  idea: string;
  num_alumnos: number;
  hora_inicio?: string; // HH:mm
  hora_fin?: string; // HH:mm
  status: BookingStatus;
};

