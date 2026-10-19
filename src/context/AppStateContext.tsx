import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { auth } from '../config/firebase';
import {
  addBooking as addFirestoreBooking,
  cancelBooking as cancelFirestoreBooking,
  DEFAULT_BOOKING_SLOT,
  getBookings,
  getBookingEndTime,
  getDateKey,
  extendBooking as extendFirestoreBooking,
  subscribeToBookings,
} from '../services/bookingService';
import {
  addRoom as addFirestoreRoom,
  deleteRoom as deleteFirestoreRoom,
  getRooms,
  seedRoomsIfEmpty,
  updateRoom as updateFirestoreRoom,
} from '../services/roomService';
import { Room } from '../types/room';
import { useBookingStore } from '../stores/bookingStore';

const EMPTY_BOOKINGS: Booking[] = [];
const EMPTY_ROOMS: Room[] = [];

export type BookingStatus = 'CONFIRMED' | 'IN_USE' | 'COMPLETED' | 'NO_SHOW';

export interface Booking {
  id: string;
  roomId: string;
  roomName: string;
  building: string;
  date: string;
  slot: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  seatNumber?: number;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
}

interface AppStateContextValue {
  rooms: Room[];
  bookings: Booking[];
  profile: UserProfile;
  loading: boolean;
  availabilityLoading: boolean;
  error: string | null;
  availabilityDate: string;
  availabilitySlot: string;
  refreshData: (date?: string, slot?: string) => Promise<void>;
  refreshRooms: (date: string, slot: string) => Promise<void>;
  addRoom: (room: Omit<Room, 'id'>) => Promise<Room>;
  updateRoom: (roomId: string, changes: Partial<Omit<Room, 'id'>>) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  createBooking: (room: Room, date: string, slot: string) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  extendBooking: (bookingId: string, minutes: number) => Promise<void>;
  updateProfile: (profile: UserProfile) => void;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

const getSignedInUserId = (): string => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('You must be signed in to manage bookings.');
  return userId;
};

export const AppStateProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const queryClient = useQueryClient();
  const currentUser = auth.currentUser;
  const userId = currentUser?.uid;
  const bookings = useBookingStore((state) =>
    userId ? state.bookingsByUser[userId] ?? EMPTY_BOOKINGS : EMPTY_BOOKINGS,
  );
  const replaceBookings = useBookingStore((state) => state.replaceBookings);
  const addStoredBooking = useBookingStore((state) => state.addBooking);
  const removeStoredBooking = useBookingStore((state) => state.removeBooking);
  const [profile, setProfile] = useState<UserProfile>({
    name: currentUser?.displayName ?? 'Study Room User',
    email: currentUser?.email ?? '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availabilityDate, setAvailabilityDate] = useState(getDateKey());
  const [availabilitySlot, setAvailabilitySlot] = useState(DEFAULT_BOOKING_SLOT);
  const roomsQuery = useQuery({
    queryKey: ['rooms', availabilityDate, availabilitySlot],
    queryFn: () => getRooms(availabilityDate, availabilitySlot),
    enabled: false,
  });
  const rooms = roomsQuery.data ?? EMPTY_ROOMS;
  const availabilityRequest = useRef(0);

  const refreshRooms = useCallback(async (date: string, slot: string) => {
    const requestId = ++availabilityRequest.current;
    setAvailabilityLoading(true);
    setError(null);
    try {
      const loadedRooms = await getRooms(date, slot);
      if (requestId !== availabilityRequest.current) return;
      queryClient.setQueryData(['rooms', date, slot], loadedRooms);
      setAvailabilityDate(date);
      setAvailabilitySlot(slot);
    } catch (loadError: unknown) {
      if (requestId !== availabilityRequest.current) return;
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Could not load room availability from Firestore.';
      setError(message);
      throw loadError;
    } finally {
      if (requestId === availabilityRequest.current) {
        setAvailabilityLoading(false);
      }
    }
  }, [queryClient]);

  const refreshData = useCallback(async (
    date = getDateKey(),
    slot = DEFAULT_BOOKING_SLOT,
  ) => {
    setLoading(true);
    setError(null);
    try {
      await seedRoomsIfEmpty();
      const signedInUserId = getSignedInUserId();
      const [, loadedBookings] = await Promise.all([
        queryClient.fetchQuery({
          queryKey: ['rooms', date, slot],
          queryFn: () => getRooms(date, slot),
          staleTime: 10_000,
        }),
        getBookings(signedInUserId),
      ]);
      replaceBookings(signedInUserId, loadedBookings);
      setAvailabilityDate(date);
      setAvailabilitySlot(slot);
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : 'Could not load data from Firestore.';
      setError(message);
      throw loadError;
    } finally {
      setLoading(false);
    }
  }, [queryClient, replaceBookings]);

  useEffect(() => {
    void refreshData().catch(() => {
      // The error is exposed in context for the screen to show a retry action.
    });
  }, [refreshData]);

  useEffect(() => {
    if (!userId) return undefined;
    return subscribeToBookings(
      userId,
      (items) => replaceBookings(userId, items),
      (loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not listen for booking updates.',
        );
      },
    );
  }, [replaceBookings, userId]);

  useEffect(() => {
    const now = Date.now();
    const availabilityBoundaries = [
      Date.parse(getBookingEndTime(availabilityDate, availabilitySlot)),
      ...bookings
        .filter(
          (booking) =>
            booking.date === availabilityDate &&
            booking.slot === availabilitySlot &&
            (booking.status === 'CONFIRMED' || booking.status === 'IN_USE'),
        )
        .map((booking) =>
          booking.status === 'CONFIRMED'
            ? Date.parse(booking.startTime) + 15 * 60 * 1000
            : Date.parse(booking.endTime),
        ),
    ].filter((boundary) => Number.isFinite(boundary) && boundary > now);
    if (availabilityBoundaries.length === 0) return;
    const msUntilExpiry = Math.min(...availabilityBoundaries) - now + 1;

    const timer = setTimeout(() => {
      void refreshData(availabilityDate, availabilitySlot).catch(() => undefined);
    }, msUntilExpiry);
    return () => clearTimeout(timer);
  }, [availabilityDate, availabilitySlot, bookings, refreshData]);

  const addRoom = useCallback(async (room: Omit<Room, 'id'>) => {
    const savedRoom = await addFirestoreRoom(room);
    await queryClient.invalidateQueries({ queryKey: ['rooms'] });
    return savedRoom;
  }, [queryClient]);

  const updateRoom = useCallback(
    async (roomId: string, changes: Partial<Omit<Room, 'id'>>) => {
      await updateFirestoreRoom(roomId, changes);
      await queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    [queryClient],
  );

  const deleteRoom = useCallback(async (roomId: string) => {
    await deleteFirestoreRoom(roomId);
    await queryClient.invalidateQueries({ queryKey: ['rooms'] });
  }, [queryClient]);

  const createBooking = useCallback(
    async (room: Room, date: string, slot: string) => {
      const userId = getSignedInUserId();
      const booking = await addFirestoreBooking(room, date, slot, userId);
      addStoredBooking(userId, booking);
      if (availabilityDate === date && availabilitySlot === slot) {
        void refreshRooms(date, slot).catch(() => undefined);
      }
    },
    [addStoredBooking, availabilityDate, availabilitySlot, refreshRooms],
  );

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      const booking = bookings.find((item) => item.id === bookingId);
      await cancelFirestoreBooking(bookingId, getSignedInUserId());
      removeStoredBooking(getSignedInUserId(), bookingId);
      if (
        booking &&
        availabilityDate === booking.date &&
        availabilitySlot === booking.slot
      ) {
        void refreshRooms(booking.date, booking.slot).catch(() => undefined);
      }
    },
    [availabilityDate, availabilitySlot, bookings, refreshRooms, removeStoredBooking],
  );

  const extendBooking = useCallback(
    async (bookingId: string, minutes: number) => {
      const booking = bookings.find((item) => item.id === bookingId);
      await extendFirestoreBooking(bookingId, minutes);
      if (
        booking &&
        availabilityDate === booking.date &&
        availabilitySlot === booking.slot
      ) {
        void refreshRooms(booking.date, booking.slot).catch(() => undefined);
      }
    },
    [availabilityDate, availabilitySlot, bookings, refreshRooms],
  );

  const value = useMemo<AppStateContextValue>(
    () => ({
      rooms,
      bookings,
      profile,
      loading,
      availabilityLoading,
      error,
      availabilityDate,
      availabilitySlot,
      refreshData,
      refreshRooms,
      addRoom,
      updateRoom,
      deleteRoom,
      createBooking,
      cancelBooking,
      extendBooking,
      updateProfile: setProfile,
    }),
    [
      rooms,
      bookings,
      profile,
      loading,
      availabilityLoading,
      error,
      availabilityDate,
      availabilitySlot,
      refreshData,
      refreshRooms,
      addRoom,
      updateRoom,
      deleteRoom,
      createBooking,
      cancelBooking,
      extendBooking,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = (): AppStateContextValue => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used inside AppStateProvider.');
  }
  return context;
};
