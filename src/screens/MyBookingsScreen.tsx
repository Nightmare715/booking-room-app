import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Booking, useAppState } from '../context/AppStateContext';
import { Room } from '../types/room';

const formatDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatBookingTime = (booking: Booking) => {
  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  return `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`;
};

const MyBookingsScreen: React.FC = () => {
  const {
    rooms,
    bookings,
    cancelBooking,
    extendBooking,
    loading,
    error,
    refreshData,
  } = useAppState();
  const [selectedBookingId, setSelectedBookingId] = React.useState<string | null>(null);
  const [bookingToCancel, setBookingToCancel] = React.useState<Booking | null>(null);
  const [cancelling, setCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);
  const [extensionMinutes, setExtensionMinutes] = React.useState('30');
  const [extending, setExtending] = React.useState(false);
  const sortedBookings = [...bookings].sort((a, b) =>
    `${a.date} ${a.slot}`.localeCompare(`${b.date} ${b.slot}`),
  );
  const selectedBooking = bookings.find((item) => item.id === selectedBookingId);

  const statusLabel = (status: Booking['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return 'Đã đặt';
      case 'IN_USE':
        return 'Đang sử dụng';
      case 'COMPLETED':
        return 'Đã xong';
      case 'NO_SHOW':
        return 'Đã bị hủy do quá giờ check-in';
    }
  };

  const handleExtend = async () => {
    const minutes = Number(extensionMinutes);
    if (!selectedBooking || !Number.isInteger(minutes) || minutes <= 0) {
      Alert.alert('Thời gian không hợp lệ', 'Vui lòng nhập số phút gia hạn lớn hơn 0.');
      return;
    }
    setExtending(true);
    try {
      await extendBooking(selectedBooking.id, minutes);
      Alert.alert('Gia hạn thành công', `Đã gia hạn thêm ${minutes} phút.`);
    } catch (extendError: unknown) {
      Alert.alert(
        'Không thể gia hạn',
        extendError instanceof Error
          ? extendError.message
          : 'Vui lòng thử lại.',
      );
    } finally {
      setExtending(false);
    }
  };

  const confirmCancel = async () => {
    if (!bookingToCancel || cancelling) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelBooking(bookingToCancel.id);
      setBookingToCancel(null);
    } catch (cancelError: unknown) {
      setCancelError(
        cancelError instanceof Error ? cancelError.message : 'Please try again.',
      );
    } finally {
      setCancelling(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <Text style={styles.subtitle}>
          {bookings.length} {bookings.length === 1 ? 'reservation' : 'reservations'}
        </Text>
      </View>
      {loading && (
        <View style={styles.statusRow}>
          <ActivityIndicator color="#477454" />
          <Text style={styles.statusText}>Loading bookings from Firestore...</Text>
        </View>
      )}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => void refreshData().catch(() => undefined)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={sortedBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          sortedBookings.length === 0 && styles.emptyList,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={30} color="#477454" />
            </View>
            <Text style={styles.emptyTitle}>
              {loading
                ? 'Loading bookings'
                : error
                  ? 'Could not load bookings'
                  : 'No bookings yet'}
            </Text>
            {!loading && !error && (
              <Text style={styles.emptyText}>
                Browse rooms and reserve an available time slot to see it here.
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const room: Room | undefined = rooms.find((entry) => entry.id === item.roomId);
          return (
            <View style={styles.bookingCard}>
              <TouchableOpacity
                style={styles.bookingContent}
                onPress={() => setSelectedBookingId(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`View booking details for ${room?.name ?? item.roomName}`}
              >
                <View style={styles.bookingIcon}>
                  <Ionicons name="business-outline" size={22} color="#477454" />
                </View>
                <View style={styles.bookingDetails}>
                  <View style={styles.titleRow}>
                    <Text style={styles.roomName}>{room?.name ?? item.roomName}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        item.status === 'IN_USE' && styles.inUseBadge,
                        (item.status === 'NO_SHOW' || item.status === 'COMPLETED') &&
                          styles.inactiveBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.bookingStatusText,
                          item.status === 'IN_USE' && styles.inUseText,
                          (item.status === 'NO_SHOW' || item.status === 'COMPLETED') &&
                            styles.inactiveText,
                        ]}
                      >
                        {statusLabel(item.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.roomLocation}>{room?.building ?? item.building}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="calendar-outline" size={14} color="#918B7E" />
                    <Text style={styles.metaText}>{formatDate(item.date)}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={14} color="#918B7E" />
                    <Text style={styles.metaText}>{formatBookingTime(item)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              {item.status === 'CONFIRMED' && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setCancelError(null);
                    setBookingToCancel(item);
                  }}
                  accessibilityLabel={`Cancel booking for ${room?.name ?? item.roomName}`}
                  accessibilityRole="button"
                >
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
      <Modal
        visible={bookingToCancel !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!cancelling) setBookingToCancel(null);
        }}
      >
        <View style={styles.confirmBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            disabled={cancelling}
            onPress={() => setBookingToCancel(null)}
            accessibilityLabel="Dismiss cancellation confirmation"
          />
          <View style={styles.confirmDialog} accessibilityRole="alert">
            <Text style={styles.confirmTitle}>Cancel booking?</Text>
            <Text style={styles.confirmMessage}>
              Your booking for{' '}
              {bookingToCancel
                ? rooms.find((room) => room.id === bookingToCancel.roomId)?.name ??
                  bookingToCancel.roomName
                : ''}{' '}
              will be removed.
            </Text>
            {cancelError && <Text style={styles.cancelError}>{cancelError}</Text>}
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.keepButton}
                disabled={cancelling}
                onPress={() => setBookingToCancel(null)}
                accessibilityRole="button"
              >
                <Text style={styles.keepButtonText}>Keep booking</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmCancelButton, cancelling && styles.disabledButton]}
                disabled={cancelling}
                onPress={() => void confirmCancel()}
                accessibilityRole="button"
              >
                {cancelling ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmCancelText}>Cancel booking</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={selectedBooking !== undefined}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBookingId(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectedBookingId(null)}
          />
          {selectedBooking && (
            <View style={styles.detailSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.detailTitle}>
                {rooms.find((room) => room.id === selectedBooking.roomId)?.name ??
                  selectedBooking.roomName}
              </Text>
              <Text style={styles.detailSubtitle}>{statusLabel(selectedBooking.status)}</Text>
              <Text style={styles.detailMeta}>
                {formatDate(selectedBooking.date)} · {formatBookingTime(selectedBooking)}
              </Text>
              {selectedBooking.status === 'CONFIRMED' && (
                <View style={styles.qrPanel}>
                  <QRCode
                    value={selectedBooking.id}
                    size={210}
                    backgroundColor="#FFFFFF"
                    color="#263D32"
                  />
                  <Text style={styles.qrHint}>
                    Đưa mã QR này cho máy quét để check-in. Mã chỉ sử dụng được một lần.
                  </Text>
                </View>
              )}
              {selectedBooking.status === 'IN_USE' && (
                <View style={styles.extensionPanel}>
                  <Text style={styles.extensionTitle}>Gia hạn thời gian</Text>
                  <Text style={styles.extensionHint}>
                    Yêu cầu gia hạn chỉ được duyệt khi khung giờ tiếp theo còn trống.
                  </Text>
                  <View style={styles.extensionRow}>
                    <TextInput
                      style={styles.extensionInput}
                      value={extensionMinutes}
                      onChangeText={setExtensionMinutes}
                      keyboardType="number-pad"
                      accessibilityLabel="Extension duration in minutes"
                    />
                    <Text style={styles.minuteLabel}>phút</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.extendButton, extending && styles.disabledButton]}
                    disabled={extending}
                    onPress={() => void handleExtend()}
                  >
                    <Text style={styles.extendButtonText}>
                      {extending ? 'Đang kiểm tra...' : 'Yêu cầu gia hạn'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {selectedBooking.status === 'NO_SHOW' && (
                <Text style={styles.noShowMessage}>
                  Đã bị hủy do quá giờ check-in. Khung giờ đã được giải phóng.
                </Text>
              )}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedBookingId(null)}
              >
                <Text style={styles.closeButtonText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4EFE4' },
  header: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 18 },
  title: { fontSize: 29, fontWeight: '800', color: '#263D32', letterSpacing: -0.5 },
  subtitle: { color: '#817C70', marginTop: 5, fontSize: 14 },
  listContent: { paddingHorizontal: 18, paddingBottom: 28 },
  emptyList: { flexGrow: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E9E2D3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { color: '#263D32', fontSize: 18, fontWeight: '700' },
  emptyText: { color: '#817C70', textAlign: 'center', lineHeight: 20, marginTop: 8 },
  separator: { height: 12 },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFCF6',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8DFCF',
    shadowColor: '#5C4A30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  bookingContent: { flexDirection: 'row', alignItems: 'flex-start', flex: 1 },
  bookingIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E4EEE2',
    marginRight: 12,
  },
  bookingDetails: { flex: 1 },
  roomName: { fontSize: 16, color: '#263D32', fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  statusBadge: { borderRadius: 10, backgroundColor: '#F1E9D9', paddingHorizontal: 8, paddingVertical: 3 },
  inUseBadge: { backgroundColor: '#E4EEE2' },
  inactiveBadge: { backgroundColor: '#EEEAE2' },
  bookingStatusText: { color: '#9A7040', fontSize: 10, fontWeight: '700' },
  inUseText: { color: '#477454' },
  inactiveText: { color: '#918B7E' },
  roomLocation: { color: '#817C70', fontSize: 13, marginTop: 3, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaText: { color: '#625F54', fontSize: 13, marginLeft: 6 },
  cancelButton: { padding: 8, marginLeft: 4 },
  confirmBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(36, 43, 33, 0.48)',
  },
  confirmDialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 22,
    backgroundColor: '#FBF8F1',
  },
  confirmTitle: { color: '#263D32', fontSize: 19, fontWeight: '700' },
  confirmMessage: { color: '#625F54', fontSize: 14, lineHeight: 21, marginTop: 10 },
  cancelError: { color: '#A74C36', fontSize: 13, lineHeight: 19, marginTop: 12 },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
  keepButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: '#E9E2D3',
  },
  keepButtonText: { color: '#263D32', fontWeight: '700', fontSize: 13 },
  confirmCancelButton: {
    minHeight: 44,
    minWidth: 122,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: '#B83B32',
  },
  confirmCancelText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 18, paddingBottom: 10 },
  statusText: { color: '#817C70', fontSize: 13 },
  errorBox: { marginHorizontal: 16, marginBottom: 10, padding: 12, borderRadius: 12, backgroundColor: '#F7E8E1' },
  errorText: { color: '#A74C36', fontSize: 13 },
  retryText: { color: '#477454', fontWeight: '700', marginTop: 8 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(36, 43, 33, 0.48)',
  },
  detailSheet: {
    alignItems: 'center',
    backgroundColor: '#FBF8F1',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 30,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0C5B1',
    marginBottom: 18,
  },
  detailTitle: { color: '#263D32', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  detailSubtitle: { color: '#477454', fontSize: 14, fontWeight: '700', marginTop: 6 },
  detailMeta: { color: '#817C70', fontSize: 13, marginTop: 8, marginBottom: 20 },
  qrPanel: {
    alignItems: 'center',
    width: '100%',
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#F1EBDD',
  },
  qrHint: { color: '#817C70', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 16 },
  extensionPanel: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F1EBDD',
  },
  extensionTitle: { color: '#263D32', fontSize: 16, fontWeight: '700' },
  extensionHint: { color: '#817C70', lineHeight: 19, marginTop: 6 },
  extensionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14 },
  extensionInput: {
    width: 110,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E0D7C7',
    borderRadius: 10,
    backgroundColor: '#FFFCF6',
    color: '#263D32',
    fontSize: 16,
  },
  minuteLabel: { color: '#625F54', marginLeft: 10 },
  extendButton: {
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#315A45',
    padding: 13,
    marginTop: 14,
  },
  disabledButton: { opacity: 0.6 },
  extendButtonText: { color: '#FFFFFF', fontWeight: '700' },
  noShowMessage: {
    color: '#A74C36',
    textAlign: 'center',
    lineHeight: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F7E8E1',
  },
  closeButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 10,
    backgroundColor: '#E9E2D3',
    padding: 13,
    marginTop: 18,
  },
  closeButtonText: { color: '#53634D', fontWeight: '700' },
});

export default MyBookingsScreen;
