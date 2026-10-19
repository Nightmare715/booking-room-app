import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOut, updateProfile as updateFirebaseProfile } from 'firebase/auth';

import { useAppState, UserProfile } from '../context/AppStateContext';
import { auth } from '../config/firebase';

const ProfileScreen: React.FC = () => {
  const { profile, updateProfile } = useAppState();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<UserProfile>(profile);

  useEffect(() => {
    if (editing) setDraft(profile);
  }, [editing, profile]);

  const saveProfile = () => {
    const name = draft.name.trim();
    const phone = draft.phone.trim();
    if (!name) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    void updateFirebaseProfile(currentUser, { displayName: name })
      .then(() => {
        updateProfile({ name, email: currentUser.email ?? '', phone });
        setEditing(false);
      })
      .catch(() => {
        Alert.alert('Could not update profile', 'Please check your connection and try again.');
      });
  };

  const handleSignOut = () => {
    void signOut(auth).catch(() => {
      Alert.alert('Could not sign out', 'Please try again.');
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Profile</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="leaf-outline" size={38} color="#F4E7C8" />
          </View>
          <Text style={styles.name}>{auth.currentUser?.displayName || profile.name}</Text>
          <Text style={styles.email}>{auth.currentUser?.email || profile.email}</Text>
          <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
            <Ionicons name="create-outline" size={17} color="#FFFFFF" />
            <Text style={styles.editButtonText}>Edit profile</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Contact information</Text>
        <View style={styles.infoCard}>
          <ProfileRow
            icon="mail-outline"
            label="Email"
            value={auth.currentUser?.email || profile.email}
          />
          <View style={styles.divider} />
          <ProfileRow
            icon="call-outline"
            label="Phone"
            value={profile.phone || 'Not provided'}
          />
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={19} color="#FCA5A5" />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={19} color="#477454" />
          <Text style={styles.noticeText}>
            Your account is managed by Firebase. Phone number is stored for this app session only.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={editing}
        transparent
        animationType="slide"
        onRequestClose={() => setEditing(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Edit profile</Text>
            <Text style={styles.fieldLabel}>Full name</Text>
            <TextInput
              style={styles.input}
              value={draft.name}
              onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
              placeholder="Your name"
              placeholderTextColor="#9A9689"
              autoCapitalize="words"
            />
            <Text style={styles.fieldLabel}>Phone (optional)</Text>
            <TextInput
              style={styles.input}
              value={draft.phone}
              onChangeText={(phone) => setDraft((current) => ({ ...current, phone }))}
              placeholder="Phone number"
              placeholderTextColor="#9A9689"
              keyboardType="phone-pad"
            />
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setEditing(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
                <Text style={styles.saveText}>Save changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

interface ProfileRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

const ProfileRow: React.FC<ProfileRowProps> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>
      <Ionicons name={icon} size={19} color="#477454" />
    </View>
    <View style={styles.infoTextWrap}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4EFE4' },
  content: { padding: 20, paddingBottom: 30 },
  pageTitle: { fontSize: 29, fontWeight: '800', color: '#263D32', marginBottom: 20, letterSpacing: -0.5 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#FFFCF6',
    borderRadius: 24,
    padding: 26,
    borderWidth: 1,
    borderColor: '#E8DFCF',
  },
  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#315A45',
    marginBottom: 14,
  },
  name: { fontSize: 20, fontWeight: '700', color: '#263D32' },
  email: { fontSize: 14, color: '#817C70', marginTop: 5 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#315A45',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 18,
  },
  editButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 7 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#263D32', marginTop: 24, marginBottom: 10 },
  infoCard: { backgroundColor: '#FFFCF6', borderRadius: 20, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E8DFCF' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  infoIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#E4EEE2',
    marginRight: 12,
  },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#817C70' },
  infoValue: { fontSize: 14, color: '#35483A', fontWeight: '600', marginTop: 3 },
  divider: { height: 1, backgroundColor: '#E8DFCF' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 18, gap: 8 },
  noticeText: { flex: 1, color: '#817C70', fontSize: 13, lineHeight: 18 },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F7E8E1',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 22,
  },
  signOutText: { color: '#A74C36', fontWeight: '700', fontSize: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(36, 43, 33, 0.48)' },
  sheet: { backgroundColor: '#FBF8F1', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 30 },
  sheetHandle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: '#D0C5B1', marginBottom: 18 },
  sheetTitle: { fontSize: 21, fontWeight: '700', color: '#263D32', marginBottom: 18 },
  fieldLabel: { color: '#53634D', fontSize: 13, fontWeight: '600', marginBottom: 7 },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: '#E0D7C7',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFCF6',
    color: '#263D32',
    marginBottom: 15,
    fontSize: 15,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  cancelButton: { paddingHorizontal: 14, paddingVertical: 13 },
  cancelText: { color: '#53634D', fontWeight: '700' },
  saveButton: { flex: 1, alignItems: 'center', borderRadius: 11, paddingVertical: 14, backgroundColor: '#315A45' },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
});

export default ProfileScreen;
