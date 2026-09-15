import React from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, SafeAreaView,
} from 'react-native';
import QRScanner from '../QRScanner';
import { ShieldIcon, CloseIcon } from '../AdminIcons';
import s from '../../styles/securityStyles';

/**
 * ScannerModal — full-screen QR camera scanner.
 * Props: visible, onClose, onScan, tokensList
 */
export function ScannerModal({ visible, onClose, onScan, tokensList = [] }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.scannerModalSafeArea}>
        <View style={s.scannerModalHeader}>
          <View style={s.scannerHeaderLeft}>
            <View style={s.scannerShieldBox}>
              <ShieldIcon size={16} color="#ffffff" />
            </View>
            <View>
              <Text style={s.scannerModalTitle}>Scan Visitor QR Badge</Text>
              <Text style={s.scannerModalSub}>Gate 1 Optical Scanner • Live</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.scannerModalCloseBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <CloseIcon size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <QRScanner
          onScan={onScan}
          availableTokens={tokensList}
          onClose={onClose}
        />
      </SafeAreaView>
    </Modal>
  );
}

/**
 * CheckInModal — bottom sheet form for new visitor check-in.
 * Props: visible, onClose, availableTokens, regTokenCode,
 *        regFullName, regMobile, regHost, regPurpose,
 *        setters for each, onSubmit, submittingCheckIn
 */
export function CheckInModal({
  visible, onClose,
  availableTokens, regTokenCode,
  regFullName, setRegFullName,
  regMobile, setRegMobile,
  regHost, setRegHost,
  regPurpose, setRegPurpose,
  onSubmit, submittingCheckIn,
}) {
  const tokenCount = availableTokens.length;
  const displayToken = regTokenCode || availableTokens[0]?.token_code || 'V-001';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.modalHeaderRow}>
            <Text style={s.modalHeaderTitle}>Visitor Check-In Registration</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <CloseIcon size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.formInputLabel}>Assigned Badge / QR Token *</Text>
            <View style={s.tokenDisplayBox}>
              <Text style={s.tokenDisplayText}>{displayToken}</Text>
              <Text style={s.tokenDisplaySub}>{tokenCount} tokens available in gate fleet</Text>
            </View>

            <Text style={s.formInputLabel}>Visitor Full Name *</Text>
            <TextInput
              style={s.formTextInput}
              placeholder="e.g. Arun Kumar"
              placeholderTextColor="#94a3b8"
              value={regFullName}
              onChangeText={setRegFullName}
            />

            <Text style={s.formInputLabel}>Mobile Number *</Text>
            <TextInput
              style={s.formTextInput}
              placeholder="e.g. 9840122345"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={regMobile}
              onChangeText={setRegMobile}
            />

            <Text style={s.formInputLabel}>Host Person / Destination Dept</Text>
            <TextInput
              style={s.formTextInput}
              placeholder="e.g. Dr. Aris (Computer Science)"
              placeholderTextColor="#94a3b8"
              value={regHost}
              onChangeText={setRegHost}
            />

            <Text style={s.formInputLabel}>Purpose of Visit</Text>
            <TextInput
              style={s.formTextInput}
              placeholder="e.g. General Campus Visit"
              placeholderTextColor="#94a3b8"
              value={regPurpose}
              onChangeText={setRegPurpose}
            />

            <TouchableOpacity style={s.submitCheckInBtn} onPress={onSubmit} disabled={submittingCheckIn}>
              {submittingCheckIn ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={s.submitCheckInBtnText}>Authorize Gate Pass & Open Barrier</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/**
 * VisitActionModal — visitor quick-actions modal (checkout / view).
 * Props: visit (object | null), onClose, onCheckOut
 */
export function VisitActionModal({ visit, onClose, onCheckOut }) {
  return (
    <Modal visible={!!visit} animationType="fade" transparent onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.modalHeaderRow}>
            <Text style={s.modalHeaderTitle}>Visitor Gate Record</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <CloseIcon size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {visit && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={s.actionHeroBox}>
                <Text style={s.actionHeroName}>{visit.full_name}</Text>
                <Text style={s.actionHeroToken}>
                  Token: <Text style={s.actionTokenBold}>{visit.token_code}</Text>
                </Text>
                <View style={[s.actionStatusPill, visit.status === 'ACTIVE' ? s.statusActivePill : s.statusDonePill]}>
                  <Text style={[s.actionStatusPillText, visit.status === 'ACTIVE' ? s.statusActiveText : s.statusDoneText]}>
                    {visit.status === 'ACTIVE' ? 'CURRENTLY ON CAMPUS' : 'EXITED CAMPUS'}
                  </Text>
                </View>
              </View>

              <View style={s.actionDetailsList}>
                <View style={s.actionDetailItem}>
                  <Text style={s.actionDetailLabel}>Host Person / Dept</Text>
                  <Text style={s.actionDetailVal}>{visit.address || 'Admin Office'}</Text>
                </View>
                <View style={s.actionDetailItem}>
                  <Text style={s.actionDetailLabel}>Purpose</Text>
                  <Text style={s.actionDetailVal}>{visit.purpose || 'General Visit'}</Text>
                </View>
                <View style={s.actionDetailItem}>
                  <Text style={s.actionDetailLabel}>Entry Timestamp</Text>
                  <Text style={s.actionDetailVal}>
                    {visit.check_in
                      ? new Date(visit.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                      : '--:--'}
                  </Text>
                </View>
              </View>

              {visit.status === 'ACTIVE' ? (
                <TouchableOpacity style={s.actionCheckOutBigBtn} onPress={() => onCheckOut(visit)}>
                  <Text style={s.actionCheckOutBigBtnText}>Check Out Visitor (Release Badge)</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.completedMessageBox}>
                  <Text style={s.completedMessageText}>✓ Visit Completed and Badge Reclaimed</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

/**
 * OfficerModal — security officer profile/menu bottom sheet.
 * Props: visible, onClose, onSync, onLogout
 */
export function OfficerModal({ visible, onClose, onSync, onLogout }) {
  const { UserTabIcon, LogoutIcon } = require('../AdminIcons');
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.modalHeaderRow}>
            <Text style={s.modalHeaderTitle}>Security Officer Desk</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <CloseIcon size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={s.officerMenuContent}>
            <View style={s.officerProfileHeader}>
              <View style={s.officerAvatarLarge}>
                <UserTabIcon size={28} color="#ffffff" />
              </View>
              <View>
                <Text style={s.officerName}>Officer Station #1</Text>
                <Text style={s.officerRole}>Gate 1 Entrance • Guard ID: SEC-402</Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.officerActionRow}
              onPress={() => { onClose(); onSync(); }}
            >
              <Text style={s.officerActionText}>↻ Sync System State</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.officerActionRow, { borderBottomWidth: 0, marginTop: 8 }]}
              onPress={() => { onClose(); onLogout(); }}
            >
              <LogoutIcon size={18} color="#ef4444" />
              <Text style={[s.officerActionText, { color: '#ef4444', fontWeight: '700' }]}>
                Log Out from Security Desk
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
