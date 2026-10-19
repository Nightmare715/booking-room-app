import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Booking } from '../context/AppStateContext';

interface BookingStore {
  bookingsByUser: Record<string, Booking[]>;
  replaceBookings: (userId: string, bookings: Booking[]) => void;
  addBooking: (userId: string, booking: Booking) => void;
  removeBooking: (userId: string, bookingId: string) => void;
}

export const useBookingStore = create<BookingStore>()(
  persist(
    (set) => ({
      bookingsByUser: {},
      replaceBookings: (userId, bookings) =>
        set((state) => ({
          bookingsByUser: { ...state.bookingsByUser, [userId]: bookings },
        })),
      addBooking: (userId, booking) =>
        set((state) => ({
          bookingsByUser: {
            ...state.bookingsByUser,
            [userId]: [
              ...(state.bookingsByUser[userId] ?? []).filter(
                (existing) => existing.id !== booking.id,
              ),
              booking,
            ],
          },
        })),
      removeBooking: (userId, bookingId) =>
        set((state) => ({
          bookingsByUser: {
            ...state.bookingsByUser,
            [userId]: (state.bookingsByUser[userId] ?? []).filter(
              (booking) => booking.id !== bookingId,
            ),
          },
        })),
    }),
    {
      name: 'study-room-bookings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ bookingsByUser: state.bookingsByUser }),
    },
  ),
);
