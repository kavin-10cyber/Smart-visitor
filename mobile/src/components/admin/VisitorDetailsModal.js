import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import QRCode from '../QRCodeSafe';
import {
  CloseIcon,
  PhoneIcon,
  CheckOutIcon,
  CrownIcon,
  ShieldIcon,
} from '../AdminIcons';
import { getAvatarPalette, getInitials, formatDisplayTime } from './VisitorCard';

/**
 * VisitorDetailsModal — Digital ID Card pass details (Matching Reference UI Screen 3).
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
  const hostLabel = visitor.host || (visitor.address ? `${visitor.address}` : 'Admin Office');

  const dateDisplay = isScheduled
    ? (visitor.expected_date || 'Today')
    : (() => {
        if (!visitor.check_in) return 'Today';
        try {
          const d = new Date(visitor.check_in);
          return isNaN(d.getTime())
            ? 'Today'
            : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (_) {
          return 'Today';
        }
      })();

  const timeDisplay = isScheduled
    ? (visitor.time_window || '09:00 AM - 01:00 PM')
    : formatDisplayTime(visitor.check_in);

  const passId = visitor.id ? `VID-${visitor.id.substring(0, 8).toUpperCase()}` : 'VID-CAMPUS-01';

  return (
    <Modal
      visible={!!visitor}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={modalStyles.modalBackdrop}>
        <View style={modalStyles.modalCard}>
          {/* Header Row */}
          <View style={modalStyles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={modalStyles.modalHeaderTitle}>Visitor Digital Pass</Text>
              {isVip && (
                <View style={modalStyles.vipTagBadge}>
                  <CrownIcon size={12} color="#E11D48" />
                  <Text style={modalStyles.vipTagBadgeText}>VIP GUEST</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={modalStyles.modalCloseBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <CloseIcon size={18} color="#0B2A5B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hero Profile Row (Screen 3 Reference) */}
            <View style={modalStyles.profileHeader}>
              <View
                style={[
                  modalStyles.avatarBoxLarge,
                  { backgroundColor: getAvatarPalette(visitorName).bg },
                ]}
              >
                <Text
                  style={[
                    modalStyles.avatarTextLarge,
                    { color: getAvatarPalette(visitorName).text },
                  ]}
                >
                  {getInitials(visitorName)}
                </Text>
              </View>
              <Text style={modalStyles.profileName}>{visitorName}</Text>
              <Text style={modalStyles.profileDate}>
                {dateDisplay} • {timeDisplay} ({visitor.expected_duration || '2 Hours'})
              </Text>
            </View>

            {/* Signature Purple Digital ID Card (Screen 3 Reference) */}
            <View style={modalStyles.digitalIdCard}>
              <View style={modalStyles.digitalIdTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ShieldIcon size={16} color="#FFFFFF" />
                  <Text style={modalStyles.digitalIdCardTitle}>Campus Pass ID Card</Text>
                </View>
                <View style={modalStyles.digitalIdStatusBadge}>
                  <Text style={modalStyles.digitalIdStatusText}>
                    {visitor.status || 'ACTIVE'}
                  </Text>
                </View>
              </View>

              <View style={modalStyles.digitalIdContentRow}>
                <View style={modalStyles.digitalIdLeftCol}>
                  <Text style={modalStyles.digitalIdFieldLabel}>Pass Number</Text>
                  <Text style={modalStyles.digitalIdFieldValue}>{passId}</Text>

                  {!isScheduled && (
                    <>
                      <Text style={modalStyles.digitalIdFieldLabel}>Assigned Badge</Text>
                      <Text style={[modalStyles.digitalIdFieldValue, { fontSize: 18, color: '#FFFFFF' }]}>
                        {visitor.token_code || 'V-000'}
                      </Text>
                    </>
                  )}

                  <Text style={modalStyles.digitalIdFieldLabel}>Host / Dept</Text>
                  <Text style={modalStyles.digitalIdFieldValue} numberOfLines={1}>
                    {hostLabel}
                  </Text>

                  <Text style={modalStyles.digitalIdFieldLabel}>Purpose</Text>
                  <Text style={modalStyles.digitalIdFieldValue} numberOfLines={1}>
                    {visitor.purpose || 'General Visit'}
                  </Text>
                </View>

                {/* Embedded Crisp White QR Code Container */}
                <View style={modalStyles.digitalIdQrBox}>
                  <QRCode
                    value={visitor.token_code || 'V-001'}
                    size={76}
                    color="#10233F"
                    backgroundColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>

            {/* Contact Actions Row */}
            {visitor.mobile && (
              <View style={modalStyles.contactActionsRow}>
                <TouchableOpacity
                  style={modalStyles.callBtn}
                  onPress={() => onCall && onCall(visitor.mobile)}
                  activeOpacity={0.8}
                >
                  <PhoneIcon size={15} color="#FFFFFF" />
                  <Text style={modalStyles.callBtnText}>Call Visitor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={modalStyles.smsBtn}
                  onPress={() => onSms && onSms(visitor.mobile)}
                  activeOpacity={0.8}
                >
                  <Text style={modalStyles.smsBtnText}>Send SMS / WhatsApp</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Check Out Button if Inside */}
            {isInside && (
              <TouchableOpacity
                style={modalStyles.checkOutBtn}
                onPress={() => onCheckOut && onCheckOut(visitor)}
                activeOpacity={0.85}
              >
                <CheckOutIcon size={16} color="#FFFFFF" />
                <Text style={modalStyles.checkOutBtnText}>Check Out Visitor (Release Badge) ↗</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 23, 44, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10233F',
    letterSpacing: -0.2,
  },
  vipTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE4E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  vipTagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E11D48',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5FA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarBoxLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#0B2A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarTextLarge: {
    fontSize: 22,
    fontWeight: '800',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10233F',
  },
  profileDate: {
    fontSize: 13,
    fontWeight: '500',
    color: '#52657D',
    marginTop: 3,
  },

  // Signature Digital ID Card (Screen 3)
  digitalIdCard: {
    backgroundColor: '#0B2A5B',
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    shadowColor: '#0B2A5B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  digitalIdTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  digitalIdCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  digitalIdStatusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  digitalIdStatusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  digitalIdContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  digitalIdLeftCol: {
    flex: 1,
    paddingRight: 12,
  },
  digitalIdFieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 6,
  },
  digitalIdFieldValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  digitalIdQrBox: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  // Contact actions
  contactActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  callBtn: {
    flex: 1,
    backgroundColor: '#0B2A5B',
    borderRadius: 16,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
  smsBtn: {
    flex: 1,
    backgroundColor: '#F1F5FA',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smsBtnText: {
    color: '#0B2A5B',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Check out button
  checkOutBtn: {
    backgroundColor: '#071D40',
    borderRadius: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  checkOutBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
});

export default React.memo(VisitorDetailsModal);
