import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import {
  CloseIcon,
  PhoneIcon,
  CheckOutIcon,
  CrownIcon,
  BuildingIcon,
  ClockIcon,
  CalendarIcon,
} from '../AdminIcons';
import { getAvatarPalette, getInitials, formatDisplayTime } from './VisitorCard';
import styles from '../../styles/adminStyles';

/**
 * VisitorDetailsModal — Executive modal bottom sheet showing full visitor pass details.
 * Props: visitor, onClose, onCall, onSms, onCheckOut
 */
function VisitorDetailsModal({ visitor, onClose, onCall, onSms, onCheckOut }) {
  if (!visitor) return null;

  const visitorName = (
    visitor?.full_name ||
    visitor?.fullName ||
    visitor?.name ||
    visitor?.visitor_name ||
    'Visitor Name'
  ).trim() || 'Visitor Name';

  const isScheduled = visitor.status === 'SCHEDULED';
  const isInside = visitor.status === 'ACTIVE';
  const isVip = visitor.is_vip || visitor.category === 'VIP';
  const hostLabel =
    visitor.host || (visitor.address ? `${visitor.address}` : 'Dr. Amar Karthik (Placement Cell)');

  const dateDisplay = isScheduled
    ? (visitor.expected_date || 'Today')
    : (visitor.check_in ? new Date(visitor.check_in).toLocaleDateString() : 'Today');

  const timeDisplay = isScheduled
    ? (visitor.time_window || '09:00 AM - 01:00 PM')
    : formatDisplayTime(visitor.check_in);

  return (
    <Modal
      visible={!!visitor}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          {/* Header Row */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.modalHeaderTitle}>Visitor Profile & Pass</Text>
              {isVip && (
                <View style={styles.vipTagBadge}>
                  <CrownIcon size={12} color="#1d4ed8" />
                  <Text style={styles.vipTagBadgeText}>VIP GUEST</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <CloseIcon size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hero Profile Row */}
            <View style={styles.modalHeroRow}>
              <View
                style={[
                  styles.avatarBoxLarge,
                  { backgroundColor: getAvatarPalette(visitorName).bg },
                ]}
              >
                <Text
                  style={[
                    styles.avatarTextLarge,
                    { color: getAvatarPalette(visitorName).text },
                  ]}
                >
                  {getInitials(visitorName)}
                </Text>
              </View>
              <View style={styles.modalHeroTextCol}>
                <Text style={styles.modalVisitorName}>{visitorName}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <View style={styles.tokenPill}>
                    <Text style={styles.tokenPillText}>{visitor.token_code || 'V-000'}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      isScheduled
                        ? styles.statusPillScheduled
                        : isInside
                        ? styles.statusPillInside
                        : styles.statusPillDone,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        isScheduled
                          ? styles.statusDotScheduled
                          : isInside
                          ? styles.statusDotInside
                          : styles.statusDotDone,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        isScheduled
                          ? styles.statusPillTextScheduled
                          : isInside
                          ? styles.statusPillTextInside
                          : styles.statusPillTextDone,
                      ]}
                    >
                      {visitor.status || 'SCHEDULED'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Strict 2-Column Metadata Grid inside Modal with Separate Date & Time, and No Category */}
            <View style={styles.detailsGrid}>
              {/* Row 1 - Col 1: Host */}
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Host</Text>
                <Text style={styles.gridValue} numberOfLines={2}>
                  {hostLabel}
                </Text>
              </View>

              {/* Row 1 - Col 2: Organization */}
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Organization</Text>
                <View style={styles.gridValueRow}>
                  <BuildingIcon size={12} color="#64748b" />
                  <Text style={styles.gridValue} numberOfLines={1}>
                    {visitor.company || 'Campus Guest'}
                  </Text>
                </View>
              </View>

              {/* Row 2 - Col 1: Date (Separate) */}
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>
                  {isScheduled ? 'Expected Date' : 'Check-In Date'}
                </Text>
                <View style={styles.gridValueRow}>
                  <CalendarIcon size={12} color="#64748b" />
                  <Text style={styles.gridValue} numberOfLines={1}>
                    {dateDisplay}
                  </Text>
                </View>
              </View>

              {/* Row 2 - Col 2: Time (Separate) */}
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>
                  {isScheduled ? 'Time Window' : 'Check-In Time'}
                </Text>
                <View style={styles.gridValueRow}>
                  <ClockIcon size={12} color="#64748b" />
                  <Text style={styles.gridValue} numberOfLines={1}>
                    {timeDisplay}
                  </Text>
                </View>
              </View>

              {/* Row 3 - Col 1: Contact Phone */}
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Contact Phone</Text>
                <View style={styles.gridValueRow}>
                  <PhoneIcon size={12} color="#64748b" />
                  <Text style={styles.gridValue} numberOfLines={1}>
                    {visitor.mobile ? `+91 ${visitor.mobile}` : 'Not provided'}
                  </Text>
                </View>
              </View>

              {/* Row 3 - Col 2: Purpose of Visit */}
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Purpose of Visit</Text>
                <Text style={styles.gridValue} numberOfLines={2}>
                  {visitor.purpose || 'General Visit'}
                </Text>
              </View>
            </View>

            {/* Modal Contact Action Buttons */}
            <View style={styles.modalActionButtonsRow}>
              {visitor.mobile && (
                <>
                  <TouchableOpacity
                    style={styles.modalCallBtn}
                    onPress={() => onCall && onCall(visitor.mobile)}
                    activeOpacity={0.8}
                  >
                    <PhoneIcon size={15} color="#ffffff" />
                    <Text style={styles.modalCallBtnText}>Call Visitor</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalSmsBtn}
                    onPress={() => onSms && onSms(visitor.mobile)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.modalSmsBtnText}>Send SMS</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Check Out Button if Inside */}
            {visitor.status === 'ACTIVE' && (
              <TouchableOpacity
                style={styles.modalCheckOutBtn}
                onPress={() => onCheckOut && onCheckOut(visitor)}
                activeOpacity={0.8}
              >
                <CheckOutIcon size={16} color="#ffffff" />
                <Text style={styles.modalCheckOutBtnText}>Check Out Visitor Now</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default React.memo(VisitorDetailsModal);

