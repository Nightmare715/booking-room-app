// src/components/RoomCard.tsx
// Component thẻ hiển thị một phòng học trong lưới 2 cột.
// Bao gồm: ảnh, tên phòng, địa điểm, sức chứa và badge trạng thái.

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Room, RoomCardProps } from '../types/room';

/**
 * Component badge hiển thị trạng thái đặt phòng.
 * - available -> badge xanh lá + icon tick (checkmark)
 * - occupied  -> badge đỏ + icon chấm tròn
 */
const StatusBadge: React.FC<{ status: Room['status'] }> = ({ status }) => {
  const isAvailable = status === 'available';
  const isBooked = status === 'booked';

  return (
    <View
      style={[
        styles.badge,
        isAvailable
          ? styles.badgeAvailable
          : isBooked
            ? styles.badgeBooked
            : styles.badgeOccupied,
      ]}
    >
      <Ionicons
        name={isAvailable ? 'checkmark-circle' : isBooked ? 'calendar' : 'ellipse'}
        size={12}
        color={isAvailable ? '#477454' : isBooked ? '#9A7040' : '#A74C36'}
      />
      <Text
        style={[
          styles.badgeText,
          isAvailable
            ? styles.badgeTextAvailable
            : isBooked
              ? styles.badgeTextBooked
              : styles.badgeTextOccupied,
        ]}
      >
        {isAvailable ? 'Available' : isBooked ? 'My booking' : 'Occupied'}
      </Text>
    </View>
  );
};

const RoomCard: React.FC<RoomCardProps> = ({ room, onPress }) => {
  return (
    <Animated.View entering={FadeInDown.duration(350)} style={styles.animatedCard}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => onPress?.(room)}
        accessibilityRole="button"
        accessibilityLabel={`Choose ${room.name}, ${room.capacity} seats, ${room.status}`}
      >
        <View style={styles.titleBar}>
          <Text style={styles.name} numberOfLines={1}>
            {room.name}
          </Text>
          <Ionicons name="people" size={15} color="#817C70" />
        </View>
        <View style={styles.roomDetails}>
          <Image
            source={{
              uri:
                room.imageUrl ??
                'https://via.placeholder.com/300x180?text=Room',
            }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.content}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color="#918B7E" />
              <Text style={styles.infoText} numberOfLines={2}>
                {room.building}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={14} color="#918B7E" />
              <Text style={styles.infoText} numberOfLines={1}>
                Capacity: {room.capacity} seats
              </Text>
            </View>
            {room.bookingCount !== undefined && (
              <View style={styles.infoRow}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#918B7E" />
                <Text style={styles.infoText} numberOfLines={1}>
                  {Math.max(0, room.capacity - room.bookingCount)} seats available
                </Text>
              </View>
            )}
          </View>
          <View style={styles.actionPanel}>
            <StatusBadge status={room.status} />
            <View style={styles.actionDivider} />
            <View style={styles.selectButton}>
              <Text style={styles.selectText}>CHỌN</Text>
              <Ionicons name="arrow-forward" size={13} color="#FFFCF6" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animatedCard: { width: '100%' },
  card: {
    backgroundColor: '#FFFCF6',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#5C4A30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E8DFCF',
    overflow: 'hidden',
  },
  titleBar: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 13,
    backgroundColor: '#EEE9DE',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DDCE',
  },
  roomDetails: {
    minHeight: 102,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  image: {
    width: 112,
    minHeight: 102,
    backgroundColor: '#E8DFCF',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  name: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#263D32',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
    gap: 5,
  },
  infoText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 14,
    color: '#625F54',
  },
  actionPanel: {
    width: 112,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#E8DFCF',
    backgroundColor: '#FBF8F1',
  },
  actionDivider: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: '#E8DFCF',
    marginVertical: 9,
  },
  selectButton: {
    minWidth: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#8D7A57',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectText: {
    color: '#FFFCF6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeAvailable: {
    backgroundColor: '#E4EEE2',
  },
  badgeOccupied: {
    backgroundColor: '#F7E8E1',
  },
  badgeBooked: {
    backgroundColor: '#F1E9D9',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '600',
    marginLeft: 3,
  },
  badgeTextAvailable: {
    color: '#477454',
  },
  badgeTextOccupied: {
    color: '#A74C36',
  },
  badgeTextBooked: {
    color: '#9A7040',
  },
});

export default RoomCard;