import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  CompositeNavigationProp,
  useNavigation,
} from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import SearchBar from '../components/SearchBar';
import FilterButton from '../components/FilterButton';
import NotificationBadge from '../components/NotificationBadge';
import RoomCard from '../components/RoomCard';
import { useAppState } from '../context/AppStateContext';
import { DEFAULT_ROOM_TIME_SLOTS, Room } from '../types/room';
import { auth } from '../config/firebase';
import {
  BookingConflictError,
  getBookingTimeRange,
} from '../services/bookingService';
import { showBookingFailure, showBookingSuccess } from '../utils/bookingAlert';
import { getRooms } from '../services/roomService';
import type { RootStackParamList, RootTabParamList } from '../navigation/types';

type AvailabilityFilter = 'all' | 'available' | 'unavailable';
type BrowseNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, 'BrowseRooms'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const getDateOptions = () => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const toDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
  return [
    { key: toDateKey(today), label: 'Today' },
    { key: toDateKey(tomorrow), label: 'Tomorrow' },
  ];
};

const BrowseRoomsScreen: React.FC = () => {
  const {
    rooms,
    bookings,
    profile,
    createBooking,
    loading,
    availabilityLoading,
    availabilityDate,
    availabilitySlot,
    error,
    refreshData,
    refreshRooms,
  } = useAppState();
  const navigation = useNavigation<BrowseNavigation>();
  const roomsQuery = useQuery({
    queryKey: ['rooms', availabilityDate, availabilitySlot],
    queryFn: () => getRooms(availabilityDate, availabilitySlot),
    enabled: !loading,
    staleTime: 10_000,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>('all');
  const [capacityFilter, setCapacityFilter] = useState(0);
  const [draftAvailability, setDraftAvailability] =
    useState<AvailabilityFilter>('all');
  const [draftCapacity, setDraftCapacity] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const dateOptions = useMemo(getDateOptions, []);
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].key);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [now, setNow] = useState(Date.now());
  const displayRooms = roomsQuery.data ?? rooms;
  const currentSelectedRoom = selectedRoom
    ? displayRooms.find((room) => room.id === selectedRoom.id) ?? selectedRoom
    : null;
  const selectedRoomTimeSlots =
    currentSelectedRoom?.timeSlots ?? DEFAULT_ROOM_TIME_SLOTS;
  const availabilityReady =
    availabilityDate === selectedDate &&
    availabilitySlot === selectedSlot &&
    !availabilityLoading;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedRoom || !selectedSlot || availabilityReady) return;
    void refreshRooms(selectedDate, selectedSlot).catch(() => undefined);
  }, [
    selectedRoom?.id,
    selectedDate,
    selectedSlot,
    availabilityReady,
    refreshRooms,
  ]);

  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return displayRooms.filter((room) => {
      const matchesQuery =
        !query ||
        room.name.toLocaleLowerCase().includes(query) ||
        room.building.toLocaleLowerCase().includes(query);
      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available'
          ? room.status === 'available'
          : room.status === 'occupied');
      return (
        matchesQuery &&
        matchesAvailability &&
        room.capacity >= capacityFilter
      );
    });
  }, [availabilityFilter, capacityFilter, displayRooms, searchQuery]);
  const draftResultCount = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return displayRooms.filter((room) => {
      const matchesQuery =
        !query ||
        room.name.toLocaleLowerCase().includes(query) ||
        room.building.toLocaleLowerCase().includes(query);
      const matchesAvailability =
        draftAvailability === 'all' ||
        (draftAvailability === 'available'
          ? room.status === 'available'
          : room.status === 'occupied');
      return matchesQuery && matchesAvailability && room.capacity >= draftCapacity;
    }).length;
  }, [displayRooms, draftAvailability, draftCapacity, searchQuery]);

  const openRoom = (room: Room) => {
    const initialSlot = (room.timeSlots ?? DEFAULT_ROOM_TIME_SLOTS)[0] ?? '';
    setSelectedRoom(room);
    setSelectedDate(dateOptions[0].key);
    setSelectedSlot(initialSlot);
    if (initialSlot) {
      void refreshRooms(dateOptions[0].key, initialSlot).catch(() => undefined);
    }
  };

  const handleBooking = async () => {
    if (!selectedRoom) return;
    setBookingSubmitting(true);
    try {
      await createBooking(selectedRoom, selectedDate, selectedSlot);
      setSelectedRoom(null);
      showBookingSuccess(selectedRoom.name, selectedDate, selectedSlot);
    } catch (bookingError: unknown) {
      void refreshRooms(selectedDate, selectedSlot).catch(() => undefined);
      const message =
        bookingError instanceof BookingConflictError
          ? bookingError.message
          : bookingError instanceof Error
            ? bookingError.message
            : 'Could not create this booking. Please try again.';
      showBookingFailure(message);
    } finally {
      setBookingSubmitting(false);
    }
  };

  const isSlotFull = (room: Room, date: string, slot: string) =>
    availabilityReady &&
    availabilityDate === date &&
    availabilitySlot === slot &&
    (room.bookingCount ?? 0) >= room.capacity;

  const hasOwnBooking = (room: Room, date: string, slot: string) =>
    bookings.some(
      (booking) =>
        booking.roomId === room.id &&
        booking.date === date &&
        booking.slot === slot &&
        (booking.status === 'CONFIRMED' || booking.status === 'IN_USE'),
    );

  const isPastSlot = (date: string, slot: string) => {
    if (!slot) return true;
    const { startTime, endTime } = getBookingTimeRange(date, slot);
    const start = Date.parse(startTime);
    const end = Date.parse(endTime);
    const isCurrentOrUpcoming =
      (start <= now && now < end) || (now < start && now < end);
    return !isCurrentOrUpcoming;
  };

  const selectSlot = (slot: string) => setSelectedSlot(slot);

  const openFilters = () => {
    setDraftAvailability(availabilityFilter);
    setDraftCapacity(capacityFilter);
    setShowFilters(true);
  };

  const refreshRoomList = async () => {
    try {
      await refreshData(availabilityDate, availabilitySlot);
      await roomsQuery.refetch();
    } catch {
      // The context and query expose their errors to the screen.
    }
  };

  const firstName = profile.name.trim().split(/\s+/)[0] || 'there';
  const currentUserId = auth.currentUser?.uid;
  const screenError =
    error ??
    (roomsQuery.error instanceof Error ? roomsQuery.error.message : null);
  const isLoadingRooms = loading || roomsQuery.isPending;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.greetingRow}>
          <View style={styles.avatar}>
            <Ionicons name="leaf-outline" size={21} color="#F4E7C8" />
          </View>
          <View style={styles.greetingCopy}>
            <Text style={styles.greeting}>Welcome back, {firstName}</Text>
            <Text style={styles.greetingSubtitle}>Your next quiet corner awaits</Text>
          </View>
          {currentUserId && (
            <NotificationBadge
              userId={currentUserId}
              onPress={() =>
                navigation.navigate('Notifications', { userId: currentUserId })
              }
            />
          )}
        </View>

        <View style={styles.heroBanner}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>MAKE SPACE FOR YOU</Text>
            <Text style={styles.heroTitle}>A little room to think.</Text>
          </View>
          <View style={styles.heroIcon}>
            <Ionicons name="book-outline" size={24} color="#F3E6C8" />
          </View>
        </View>

        <View style={styles.categoryRow}>
          {([
            ['all', 'All rooms'],
            ['available', 'Available'],
            ['unavailable', 'Occupied'],
          ] as [AvailabilityFilter, string][]).map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[
                styles.categoryTab,
                availabilityFilter === value && styles.categoryTabSelected,
              ]}
              onPress={() => setAvailabilityFilter(value)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.categoryText,
                  availabilityFilter === value && styles.categoryTextSelected,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchRow}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search rooms..."
          />
          <FilterButton onPress={openFilters} />
        </View>
      </View>

      {isLoadingRooms && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#477454" />
          <Text style={styles.loadingText}>Loading rooms from Firestore...</Text>
        </View>
      )}
      {screenError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{screenError}</Text>
          <TouchableOpacity
            onPress={() => void refreshRoomList()}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={roomsQuery.isRefetching || availabilityLoading}
            onRefresh={() => void refreshRoomList()}
            tintColor="#477454"
            colors={['#477454']}
          />
        }
        ListHeaderComponent={
          <View style={styles.listHeading}>
            <View>
              <Text style={styles.listTitle}>Study spaces</Text>
              <Text style={styles.listSubtitle}>Find your place to focus</Text>
            </View>
            <View style={styles.roomCount}>
              <Text style={styles.roomCountText}>{filteredRooms.length} places</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <RoomCard
            room={item}
            onPress={openRoom}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={38} color="#918B7E" />
            <Text style={styles.emptyTitle}>
              {isLoadingRooms
                ? 'Loading rooms'
                : screenError
                  ? 'Could not load rooms'
                  : 'No rooms found'}
            </Text>
            {!isLoadingRooms && !screenError && (
              <Text style={styles.emptyText}>Try changing your search or filters.</Text>
            )}
          </View>
        }
      />

      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowFilters(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Filter rooms</Text>
            <Text style={styles.sectionLabel}>Availability</Text>
            <View style={styles.optionsRow}>
              {([
                ['all', 'All rooms'],
                ['available', 'Available'],
                ['unavailable', 'Unavailable'],
              ] as [AvailabilityFilter, string][]).map(([value, label]) => (
                <ChoiceChip
                  key={value}
                  label={label}
                  selected={draftAvailability === value}
                  onPress={() => setDraftAvailability(value)}
                />
              ))}
            </View>
            <Text style={styles.sectionLabel}>Minimum capacity</Text>
            <View style={styles.optionsRow}>
              {[0, 10, 25, 50].map((value) => (
                <ChoiceChip
                  key={value}
                  label={value === 0 ? 'Any' : `${value}+`}
                  selected={draftCapacity === value}
                  onPress={() => setDraftCapacity(value)}
                />
              ))}
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setDraftAvailability('all');
                  setDraftCapacity(0);
                }}
              >
                <Text style={styles.resetText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  setAvailabilityFilter(draftAvailability);
                  setCapacityFilter(draftCapacity);
                  setShowFilters(false);
                }}
              >
                <Text style={styles.primaryButtonText}>Show {draftResultCount} rooms</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={selectedRoom !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRoom(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedRoom(null)} />
          {selectedRoom && (
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedRoom(null)}
                accessibilityLabel="Close room details"
              >
                <Ionicons name="close" size={22} color="#53634D" />
              </TouchableOpacity>
                <ScrollView
                  style={styles.detailScroll}
                  contentContainerStyle={styles.detailContent}
                  showsVerticalScrollIndicator
                >
                  <Image
                    source={{ uri: selectedRoom.imageUrl }}
                    style={styles.detailImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.sheetTitle}>{selectedRoom.name}</Text>
                  <Text style={styles.detailText}>
                    {selectedRoom.building} · {selectedRoom.capacity} seats
                  </Text>
                  <Text style={styles.sectionLabel}>Choose a day</Text>
                  <View style={styles.optionsRow}>
                    {dateOptions.map((option) => (
                      <ChoiceChip
                        key={option.key}
                        label={option.label}
                        selected={selectedDate === option.key}
                        onPress={() => setSelectedDate(option.key)}
                      />
                    ))}
                  </View>
                  <Text style={styles.sectionLabel}>Choose a time</Text>
                  <View style={styles.optionsColumn}>
                    {selectedRoomTimeSlots.map((slot) => {
                      const slotFull = isSlotFull(
                        currentSelectedRoom ?? selectedRoom,
                        selectedDate,
                        slot,
                      );
                      const slotEnded = isPastSlot(selectedDate, slot);
                      const ownBooking = hasOwnBooking(selectedRoom, selectedDate, slot);
                      const currentCount =
                        availabilityReady && availabilitySlot === slot
                          ? currentSelectedRoom?.bookingCount ?? 0
                          : undefined;
                      const capacity =
                        currentSelectedRoom?.capacity ?? selectedRoom.capacity;
                      const label = slotEnded
                        ? `${slot} · Ended`
                        : ownBooking
                          ? `${slot} · Your booking`
                          : slotFull
                            ? `${slot} · Fully booked`
                            : currentCount !== undefined
                              ? `${slot} · ${Math.max(0, capacity - currentCount)} seats available`
                              : `${slot} · Available`;
                      return (
                        <ChoiceChip
                          key={slot}
                          label={label}
                          selected={selectedSlot === slot}
                          disabled={slotFull || slotEnded || ownBooking}
                          onPress={() => selectSlot(slot)}
                        />
                      );
                    })}
                    {selectedRoomTimeSlots.length === 0 && (
                      <Text style={styles.loadingText}>No time slots configured.</Text>
                    )}
                </View>
                  {availabilityLoading && (
                    <View style={styles.slotLoading}>
                      <ActivityIndicator size="small" color="#477454" />
                      <Text style={styles.loadingText}>Checking capacity...</Text>
                    </View>
                  )}
                </ScrollView>
                <View style={styles.bookingFooter}>
                <TouchableOpacity
                  style={[
                      styles.primaryButton,
                      styles.bookButton,
                      (!availabilityReady ||
                        isSlotFull(
                          currentSelectedRoom ?? selectedRoom,
                          selectedDate,
                          selectedSlot,
                        ) ||
                        isPastSlot(selectedDate, selectedSlot) ||
                        hasOwnBooking(selectedRoom, selectedDate, selectedSlot)) &&
                        styles.disabledButton,
                    ]}
                    disabled={
                      bookingSubmitting ||
                      !availabilityReady ||
                      isSlotFull(
                        currentSelectedRoom ?? selectedRoom,
                        selectedDate,
                        selectedSlot,
                      ) ||
                      isPastSlot(selectedDate, selectedSlot) ||
                      hasOwnBooking(selectedRoom, selectedDate, selectedSlot)
                    }
                    onPress={handleBooking}
                  >
                    <Text style={styles.primaryButtonText}>
                      {bookingSubmitting
                        ? 'Booking...'
                        : !selectedSlot
                          ? 'No time slots configured'
                          : isSlotFull(
                              currentSelectedRoom ?? selectedRoom,
                              selectedDate,
                              selectedSlot,
                            )
                            ? `Fully booked (${currentSelectedRoom?.bookingCount ?? 0}/${currentSelectedRoom?.capacity ?? selectedRoom.capacity})`
                            : isPastSlot(selectedDate, selectedSlot)
                              ? 'Khung giờ đã kết thúc'
                              : 'Đặt phòng'}
                    </Text>
                  </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

interface ChoiceChipProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}

const ChoiceChip: React.FC<ChoiceChipProps> = ({
  label,
  selected,
  disabled = false,
  onPress,
}) => (
  <TouchableOpacity
    style={[
      styles.chip,
      selected && styles.chipSelected,
      disabled && styles.chipDisabled,
    ]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text
      style={[
        styles.chipText,
        selected && styles.chipTextSelected,
        disabled && styles.chipTextDisabled,
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4EFE4' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: '#F4EFE4',
    borderBottomWidth: 1,
    borderBottomColor: '#E8DFCF',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 17,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#315A45',
  },
  greetingCopy: { flex: 1, marginLeft: 12 },
  greeting: { color: '#263D32', fontSize: 17, fontWeight: '800' },
  greetingSubtitle: { color: '#817C70', fontSize: 12, marginTop: 3 },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#315A45',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 17,
  },
  heroCopy: { flex: 1 },
  heroEyebrow: { color: '#D8C9A7', fontSize: 9, fontWeight: '800', letterSpacing: 1.8 },
  heroTitle: { color: '#FFFCF6', fontSize: 19, fontWeight: '700', marginTop: 5 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#456C53',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E8DFCF',
  },
  categoryTab: {
    paddingTop: 3,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  categoryTabSelected: { borderBottomColor: '#477454' },
  categoryText: { color: '#817C70', fontSize: 13, fontWeight: '500' },
  categoryTextSelected: { color: '#315A45', fontWeight: '800' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 13,
    paddingBottom: 15,
  },
  listContent: { paddingHorizontal: 18, paddingTop: 13, paddingBottom: 24, flexGrow: 1 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14 },
  listTitle: { color: '#263D32', fontSize: 20, fontWeight: '800' },
  listSubtitle: { color: '#8C887B', fontSize: 12, marginTop: 3 },
  roomCount: { backgroundColor: '#E9E2D3', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7 },
  roomCountText: { color: '#53634D', fontSize: 11, fontWeight: '700' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 70 },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '700', color: '#35483A' },
  emptyText: { marginTop: 5, fontSize: 13, color: '#817C70', textAlign: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 18, paddingBottom: 10 },
  loadingText: { color: '#817C70', fontSize: 13 },
  slotLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  errorBox: { marginHorizontal: 16, marginBottom: 10, padding: 12, borderRadius: 12, backgroundColor: '#F7E8E1' },
  errorText: { color: '#A74C36', fontSize: 13 },
  retryText: { color: '#477454', fontWeight: '700', marginTop: 8 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(36, 43, 33, 0.48)' },
  sheet: {
    backgroundColor: '#FBF8F1',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    height: '85%',
    maxHeight: '90%',
  },
  detailScroll: { flex: 1 },
  detailContent: { paddingBottom: 8 },
  bookingFooter: {
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FBF8F1',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0C5B1',
    marginBottom: 18,
  },
  sheetTitle: { fontSize: 21, fontWeight: '800', color: '#263D32', marginBottom: 8 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#53634D', marginTop: 18, marginBottom: 10 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionsColumn: { gap: 8, alignItems: 'flex-start' },
  chip: {
    borderWidth: 1,
    borderColor: '#E5DDCE',
    backgroundColor: '#FFFCF6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipSelected: { borderColor: '#477454', backgroundColor: '#E4EEE2' },
  chipDisabled: { backgroundColor: '#F0ECE4', borderColor: '#E5DDCE' },
  chipText: { fontSize: 13, color: '#625F54', fontWeight: '500' },
  chipTextSelected: { color: '#315A45', fontWeight: '700' },
  chipTextDisabled: { color: '#A49F92' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28 },
  resetButton: { paddingHorizontal: 14, paddingVertical: 13 },
  resetText: { fontWeight: '700', color: '#53634D' },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#315A45',
  },
  primaryButtonText: { color: '#FFFCF6', fontWeight: '700', fontSize: 15 },
  detailImage: { width: '100%', height: 190, borderRadius: 18, marginBottom: 16 },
  detailText: { color: '#817C70', fontSize: 14 },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFCF6E8',
  },
  bookButton: { flex: 0 },
  disabledButton: { backgroundColor: '#9B9B87' },
});

export default BrowseRoomsScreen;
