import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { CloseIcon, PhoneIcon, CheckOutIcon } from '../AdminIcons';
import { getAvatarPalette, getInitials, formatDisplayTime } from './VisitorCard';
import styles from '../../styles/adminStyles';

/**
 * VisitorDetailsModal — bottom sheet showing visitor profile, contact actions, and check-out.
 * Props: visitor, onClose, onCall, onSms, onCheckOut
 */
export default function VisitorDetailsModal({ visitor, onClose, onCall, onSms, onCheckOut }) {
  return (
    <Modal
      visible={!!visitor}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Visitor Profile & Pass</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <CloseIcon size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {visitor && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeroRow}>
                <View
                  style={[
                    styles.avatarBoxLarge,
                    { backgroundColor: getAvatarPalette(visitor.full_name).bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarTextLarge,
                      { color: getAvatarPalette(visitor.full_name).text },
                    ]}
                  >
                    {getInitials(visitor.full_name)}
                  </Text>
                </View>
                <View style={styles.modalHeroTextCol}>
                  <Text style={styles.modalVisitorName}>{visitor.full_name}</Text>
                  <Text style={styles.modalVisitorToken}>
                    Token: <Text style={styles.tokenHighlight}>{visitor.token_code}</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.modalInfoList}>
                <View style={styles.modalInfoItem}>
                  <Text style={styles.modalLabel}>Purpose of Visit</Text>
                  <Text style={styles.modalVal}>{visitor.purpose || 'General Visit'}</Text>
                </View>
                <View style={styles.modalInfoItem}>
                  <Text style={styles.modalLabel}>Host Department / Address</Text>
                  <Text style={styles.modalVal}>{visitor.address || 'Administrative Block'}</Text>
                </View>
                <View style={styles.modalInfoItem}>
                  <Text style={styles.modalLabel}>Check-In Time</Text>
                  <Text style={styles.modalVal}>{formatDisplayTime(visitor.check_in)}</Text>
                </View>
                <View style={styles.modalInfoItem}>
                  <Text style={styles.modalLabel}>Expected Duration</Text>
                  <Text style={styles.modalVal}>{visitor.expected_duration || '2 Hours'}</Text>
                </View>
              </View>

              <View style={styles.modalActionButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCallBtn}
                  onPress={() => onCall(visitor.mobile)}
                >
                  <PhoneIcon size={16} color="#ffffff" />
                  <Text style={styles.modalCallBtnText}>Call Visitor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSmsBtn}
                  onPress={() => onSms(visitor.mobile)}
                >
                  <Text style={styles.modalSmsBtnText}>Send SMS</Text>
                </TouchableOpacity>
              </View>

              {visitor.status === 'ACTIVE' && (
                <TouchableOpacity
                  style={styles.modalCheckOutBtn}
                  onPress={() => onCheckOut(visitor)}
                >
                  <CheckOutIcon size={16} color="#ffffff" />
                  <Text style={styles.modalCheckOutBtnText}>Check Out Visitor Now</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
