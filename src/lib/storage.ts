"use client";

import type { Booking, BookingStatus } from "@/lib/types";
import type { OnboardingData } from "@/components/OnboardingForm";

const PROFILE_KEY = "donartic.profile";
const MY_BOOKINGS_KEY = "donartic.myBookings";
const NEXT_BOOKING_AFTER_KEY = "donartic.nextBookingAfter"; // YYYY-MM-DD

export function getProfile(): OnboardingData | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingData>;
    if (parsed?.aula && parsed?.nombre) return parsed as OnboardingData;
    return null;
  } catch {
    return null;
  }
}

export function saveProfile(data: OnboardingData) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(data));
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
}

export function loadMyBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(MY_BOOKINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Booking[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMyBookings(bookings: Booking[]) {
  localStorage.setItem(MY_BOOKINGS_KEY, JSON.stringify(bookings));
}

export function upsertMyBooking(booking: Booking) {
  const all = loadMyBookings();
  const idx = all.findIndex((b) => b.id === booking.id);
  if (idx >= 0) all[idx] = booking;
  else all.push(booking);
  saveMyBookings(all);
}

export function cancelMyBookingInCache(id: string, status: BookingStatus) {
  const all = loadMyBookings();
  const idx = all.findIndex((b) => b.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], status };
    saveMyBookings(all);
  }
}

export function getNextBookingAfterISO(): string | null {
  try {
    const raw = localStorage.getItem(NEXT_BOOKING_AFTER_KEY);
    if (!raw) return null;
    return raw;
  } catch {
    return null;
  }
}

export function setNextBookingAfterISO(isoDate: string) {
  localStorage.setItem(NEXT_BOOKING_AFTER_KEY, isoDate);
}

export function clearNextBookingAfterISO() {
  localStorage.removeItem(NEXT_BOOKING_AFTER_KEY);
}

