import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CloseIcon } from '../AdminIcons';
import CalendarPicker from './CalendarPicker';
import styles from '../../styles/adminStyles';

function RescheduleModal({
  visible,
  visit,
  onClose,
  onConfirm,
  isLoading,
}) {
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    if (visit) {
      setNewDate(visit.expected_date || '');
      setNewTime(visit.time_window || '09:00 AM - 01:00 PM');
    }
  }, [visit, visible]);

  if (!visit) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalCard, { maxHeight: '85%' }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalHeaderTitle}>Reschedule Token Pass</Text>
              <Text style={styles.modalSubHeader}>
                Badge: {visit.token_code} • {visit.full_name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <CloseIcon size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <CalendarPicker
              value={newDate}
              onChange={setNewDate}
              label="New Expected Date"
              defaultExpanded={true}
            />

            <Text style={styles.formInputLabel}>Time Window</Text>
            <TextInput
              style={styles.formTextInput}
              placeholder="e.g. 02:00 PM - 06:00 PM"
              placeholderTextColor="#94a3b8"
              value={newTime}
              onChangeText={setNewTime}
            />

            <TouchableOpacity
              style={styles.sendPassPrimaryBtn}
              onPress={() => onConfirm(visit, newDate, newTime)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.sendPassPrimaryBtnText}>Save Reschedule</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalSecondaryBtn}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelModalSecondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default React.memo(RescheduleModal);

