import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { CloseIcon, DoorEnterIcon, ClockIcon } from '../AdminIcons';
import styles from '../../styles/adminStyles';

/**
 * NotificationsModal — bottom sheet showing security & gate alerts.
 * Props: visible, onClose
 */
export default function NotificationsModal({ visible, onClose }) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Security & Gate Alerts</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <CloseIcon size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.notificationItem}>
              <View style={styles.notifIconCircle}>
                <DoorEnterIcon size={16} color="#2563eb" />
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>Turnstile Gate 1 Online</Text>
                <Text style={styles.notifSub}>Operating at nominal capacity.</Text>
                <Text style={styles.notifTime}>Just now</Text>
              </View>
            </View>

            <View style={styles.notificationItem}>
              <View style={[styles.notifIconCircle, { backgroundColor: '#fef3c7' }]}>
                <ClockIcon size={16} color="#d97706" />
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>Peak Entry Hour Active</Text>
                <Text style={styles.notifSub}>Traffic expected between 11:00 AM - 1:00 PM.</Text>
                <Text style={styles.notifTime}>25m ago</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
