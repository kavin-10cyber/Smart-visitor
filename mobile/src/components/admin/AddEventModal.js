import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { CloseIcon, KeyIcon } from '../AdminIcons';

export default function AddEventModal({ visible, onClose, onSubmit, loading }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:30 AM - 04:30 PM');
  const [venue, setVenue] = useState('Main Campus Auditorium');
  const [attendees, setAttendees] = useState('200');
  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorPhone, setCoordinatorPhone] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  const autoGenerateCredentials = () => {
    const cleanPrefix = (title || 'event')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 8);
    const randNum = Math.floor(100 + Math.random() * 900);
    const genLogin = `${cleanPrefix || 'evt'}_${randNum}`;
    const genPass = `pass${Math.floor(1000 + Math.random() * 9000)}`;
    setLoginId(genLogin);
    setPassword(genPass);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Required Field', 'Please enter an Event Title.');
      return;
    }
    const finalLoginId = (loginId.trim() || `evt_${Date.now().toString().slice(-4)}`).toLowerCase();
    const finalPassword = password.trim() || 'event123';

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      date: date.trim(),
      time: time.trim(),
      venue: venue.trim(),
      expected_attendees: attendees.trim(),
      coordinator_name: coordinatorName.trim() || 'Event Coordinator',
      coordinator_phone: coordinatorPhone.trim(),
      login_id: finalLoginId,
      password: finalPassword,
    });
  };

  const handleModalClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleModalClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Create Campus Event</Text>
              <Text style={styles.sub}>Assign coordinator & access credentials</Text>
            </View>
            <TouchableOpacity onPress={handleModalClose} style={styles.closeBtn}>
              <CloseIcon size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Field: Title */}
            <Text style={styles.label}>Event Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. National Tech Conclave 2026"
              placeholderTextColor="#7B8CA3"
            />

            {/* Field: Description */}
            <Text style={styles.label}>Description & Agenda</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Brief description or purpose of this campus event..."
              placeholderTextColor="#7B8CA3"
              multiline={true}
              numberOfLines={3}
            />

            {/* Row: Date & Time */}
            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Event Date</Text>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#7B8CA3"
                />
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Time Window</Text>
                <TextInput
                  style={styles.input}
                  value={time}
                  onChangeText={setTime}
                  placeholder="10:00 AM - 05:00 PM"
                  placeholderTextColor="#7B8CA3"
                />
              </View>
            </View>

            {/* Row: Venue & Expected Attendees */}
            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Venue / Location</Text>
                <TextInput
                  style={styles.input}
                  value={venue}
                  onChangeText={setVenue}
                  placeholder="Auditorium Hall A"
                  placeholderTextColor="#7B8CA3"
                />
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Expected Attendees</Text>
                <TextInput
                  style={styles.input}
                  value={attendees}
                  onChangeText={setAttendees}
                  placeholder="200"
                  placeholderTextColor="#7B8CA3"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Coordinator Details */}
            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Coordinator Name</Text>
                <TextInput
                  style={styles.input}
                  value={coordinatorName}
                  onChangeText={setCoordinatorName}
                  placeholder="Dr. Sarah Jenkins"
                  placeholderTextColor="#7B8CA3"
                />
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Coordinator Phone</Text>
                <TextInput
                  style={styles.input}
                  value={coordinatorPhone}
                  onChangeText={setCoordinatorPhone}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#7B8CA3"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* ── Coordinator Credentials Section ── */}
            <View style={styles.credentialsBox}>
              <View style={styles.credHeaderRow}>
                <View style={styles.credTitleRow}>
                  <KeyIcon size={16} color="#0B2A5B" />
                  <Text style={styles.credTitle}>COORDINATOR LOGIN CREDENTIALS</Text>
                </View>
                <TouchableOpacity
                  style={styles.autoGenBtn}
                  onPress={autoGenerateCredentials}
                  activeOpacity={0.8}
                >
                  <Text style={styles.autoGenText}>Auto-Generate</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.credNotice}>
                Creates an event role account. When the coordinator logs in with this ID & Password, they can generate and download event QR passes.
              </Text>

              {/* Login ID */}
              <Text style={styles.credLabel}>Login ID / Username *</Text>
              <TextInput
                style={[styles.input, styles.credInput]}
                value={loginId}
                onChangeText={setLoginId}
                placeholder="e.g. tech2026 or coordinator_id"
                placeholderTextColor="#7B8CA3"
                autoCapitalize="none"
              />

              {/* Password */}
              <Text style={styles.credLabel}>Password *</Text>
              <TextInput
                style={[styles.input, styles.credInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="e.g. event123"
                placeholderTextColor="#7B8CA3"
                autoCapitalize="none"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Create Event & Credentials</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    maxHeight: '90%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  sub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F7F9FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0F172A',
    marginBottom: 12,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfCol: {
    flex: 1,
  },
  credentialsBox: {
    backgroundColor: '#F7F6FE',
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6E1FA',
  },
  credHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  credTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  credTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B2A5B',
    letterSpacing: 0.5,
  },
  autoGenBtn: {
    backgroundColor: '#0B2A5B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  autoGenText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  credNotice: {
    fontSize: 11.5,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  credLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  credInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D8D1F8',
    marginBottom: 8,
  },
  submitBtn: {
    backgroundColor: '#0B2A5B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#0B2A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
