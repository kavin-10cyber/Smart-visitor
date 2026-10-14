import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, SafeAreaView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import QRScanner from '../QRScanner';
import { ShieldIcon, CloseIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../AdminIcons';
import s from '../../styles/securityStyles';

/**
 * ScannerModal — full-screen QR camera scanner.
 * Props: visible, onClose, onScan, tokensList
 */
export function ScannerModal({ visible, onClose, onScan, tokensList = [] }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F8FC' }}>
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

import QRCode from 'react-native-qrcode-svg';

/**
 * VisitActionModal — visitor digital pass / ID Card modal (Screen 3 Reference).
 * Props: visit (object | null), onClose, onCheckOut, onCheckInScheduled
 */
export function VisitActionModal({ visit, onClose, onCheckOut, onCheckInScheduled }) {
  if (!visit) return null;

  const initials = (visit.full_name || 'V')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const formattedDate = visit.check_in
    ? new Date(visit.check_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : (visit.expected_date || 'Today');

  const formattedTime = visit.check_in
    ? new Date(visit.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    : (visit.time_window || 'Expected Arrival');

  const passId = visit.id ? `VID-${visit.id.substring(0, 8).toUpperCase()}` : 'VID-CAMPUS-01';

  return (
    <Modal visible={!!visit} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.modalHeaderRow}>
            <Text style={s.modalHeaderTitle}>Visitor Digital Pass</Text>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <CloseIcon size={18} color="#6C5CE7" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Top Visitor Profile (Reference UI Screen 3) */}
            <View style={s.modalProfileHeader}>
              <View style={s.modalProfileAvatar}>
                <Text style={s.modalProfileInitials}>{initials}</Text>
              </View>
              <Text style={s.modalProfileName}>{visit.full_name}</Text>
              <Text style={s.modalProfileDate}>
                {formattedDate} • {formattedTime} ({visit.expected_duration || '2 Hours'})
              </Text>
            </View>

            {/* Signature Purple Digital ID Card (Reference UI Screen 3) */}
            <View style={s.digitalIdCard}>
              <View style={s.digitalIdTopRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ShieldIcon size={16} color="#FFFFFF" />
                  <Text style={s.digitalIdCardTitle}>Campus Pass ID Card</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                    {visit.status === 'SCHEDULED' ? 'PASS ISSUED' : visit.status === 'ACTIVE' ? 'ACTIVE' : 'EXITED'}
                  </Text>
                </View>
              </View>

              <View style={s.digitalIdContentRow}>
                <View style={s.digitalIdLeftCol}>
                  <Text style={s.digitalIdFieldLabel}>Pass Number</Text>
                  <Text style={s.digitalIdFieldValue}>{passId}</Text>

                  <Text style={s.digitalIdFieldLabel}>Assigned Badge</Text>
                  <Text style={[s.digitalIdFieldValue, { fontSize: 18, color: '#FFFFFF' }]}>{visit.token_code}</Text>

                  <Text style={s.digitalIdFieldLabel}>Host / Destination</Text>
                  <Text style={s.digitalIdFieldValue} numberOfLines={1}>{visit.address || 'Admin Office'}</Text>

                  <Text style={s.digitalIdFieldLabel}>Purpose</Text>
                  <Text style={s.digitalIdFieldValue} numberOfLines={1}>{visit.purpose || 'General Visit'}</Text>
                </View>

                {/* Embedded Crisp QR Code */}
                <View style={s.digitalIdQrBox}>
                  <QRCode
                    value={visit.token_code || 'V-001'}
                    size={74}
                    color="#14172C"
                    backgroundColor="#FFFFFF"
                  />
                </View>
              </View>
            </View>

            {/* Actions */}
            {visit.status === 'SCHEDULED' ? (
              <TouchableOpacity
                style={[s.actionCheckOutBigBtn, { backgroundColor: '#16A34A' }]}
                activeOpacity={0.85}
                onPress={() => onCheckInScheduled && onCheckInScheduled(visit)}
              >
                <Text style={s.actionCheckOutBigBtnText}>Check In Visitor (Unlock Gate) ➔</Text>
              </TouchableOpacity>
            ) : visit.status === 'ACTIVE' ? (
              <TouchableOpacity style={s.actionCheckOutBigBtn} activeOpacity={0.85} onPress={() => onCheckOut(visit)}>
                <Text style={s.actionCheckOutBigBtnText}>Check Out Visitor (Release Badge) ↗</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.completedMessageBox}>
                <Text style={s.completedMessageText}>✓ Visitor Exited Campus & Badge Returned to Available Pool</Text>
              </View>
            )}
          </ScrollView>
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

/**
 * FilterModal — bottom sheet modal containing visitor status filter options.
 * Props: visible, onClose, selectedFilter, onSelectFilter, counts
 */
export function FilterModal({
  visible,
  onClose,
  selectedFilter = 'ALL',
  onSelectFilter,
  counts = {},
}) {
  const filterOptions = [
    {
      key: 'ALL',
      label: 'All Passes',
      desc: 'All visitors logged today',
      count: counts.all ?? 0,
      color: '#6C5CE7',
    },
    {
      key: 'ISSUED',
      label: 'Issued Passes',
      desc: 'Scheduled & awaiting check-in',
      count: counts.issued ?? 0,
      color: '#F59E0B',
    },
    {
      key: 'INSIDE',
      label: 'Inside Campus',
      desc: 'Currently active visitors',
      count: counts.inside ?? 0,
      color: '#10B981',
    },
    {
      key: 'EXITED',
      label: 'Exited',
      desc: 'Checked out visitors today',
      count: counts.exited ?? 0,
      color: '#64748B',
    },
    {
      key: 'VIP',
      label: 'VIP Passes',
      desc: 'High priority & VIP visitors today',
      count: counts.vip ?? 0,
      color: '#D97706',
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <View style={s.modalHeaderRow}>
            <View>
              <Text style={s.modalHeaderTitle}>Filter Visitors</Text>
              <Text style={s.modalHeaderSub}>Today's activity logs</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <CloseIcon size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={s.filterOptionsList}>
            {filterOptions.map((opt) => {
              const isSelected = selectedFilter === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    s.filterOptionRow,
                    isSelected && s.filterOptionRowActive,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => {
                    onSelectFilter(opt.key);
                    onClose();
                  }}
                >
                  <View style={s.filterOptionLeft}>
                    <View style={[s.filterOptionDot, { backgroundColor: opt.color }]} />
                    <View>
                      <Text style={[s.filterOptionLabel, isSelected && s.filterOptionLabelActive]}>
                        {opt.label}
                      </Text>
                      <Text style={s.filterOptionDesc}>{opt.desc}</Text>
                    </View>
                  </View>

                  <View style={s.filterOptionRight}>
                    <View style={[s.filterOptionCountBadge, isSelected && s.filterOptionCountBadgeActive]}>
                      <Text style={[s.filterOptionCountText, isSelected && s.filterOptionCountTextActive]}>
                        {opt.count}
                      </Text>
                    </View>
                    <View style={[s.filterRadioCircle, isSelected && s.filterRadioCircleActive]}>
                      {isSelected && <View style={s.filterRadioDot} />}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedFilter !== 'ALL' && (
            <TouchableOpacity
              style={s.filterResetBtn}
              onPress={() => {
                onSelectFilter('ALL');
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={s.filterResetBtnText}>Reset to All Passes</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * CalendarModal — bottom sheet modal allowing security officers to pick any date to view logs.
 * Props: visible, onClose, selectedDate, onSelectDate
 */
export function CalendarModal({
  visible,
  onClose,
  selectedDate = new Date(),
  onSelectDate,
  allowAllTime = false,
}) {
  const activeDate = selectedDate || new Date();
  const [currentYear, setCurrentYear] = useState(activeDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(activeDate.getMonth());

  useEffect(() => {
    const d = selectedDate || new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth());
  }, [selectedDate, visible]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const isSameDayHelper = (d1, d2) => {
    if (!d1 || !d2) return false;
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  const handlePickDate = (day) => {
    const picked = new Date(currentYear, currentMonth, day);
    onSelectDate(picked);
    onClose();
  };

  const handlePreset = (presetDate) => {
    onSelectDate(presetDate);
    setCurrentYear(presetDate.getFullYear());
    setCurrentMonth(presetDate.getMonth());
    onClose();
  };

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          {/* Header */}
          <View style={s.modalHeaderRow}>
            <View>
              <Text style={s.modalHeaderTitle}>Select Date</Text>
              <Text style={s.modalHeaderSub}>Filter visitor logs by day</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.modalCloseBtn}>
              <CloseIcon size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Presets */}
          <View style={s.calendarPresetsRow}>
            {allowAllTime && (
              <TouchableOpacity
                style={[
                  s.calendarPresetChip,
                  !selectedDate && s.calendarPresetChipActive,
                ]}
                onPress={() => {
                  onSelectDate(null);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    s.calendarPresetText,
                    !selectedDate && s.calendarPresetTextActive,
                  ]}
                >
                  All Time
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                s.calendarPresetChip,
                isSameDayHelper(selectedDate, today) && s.calendarPresetChipActive,
              ]}
              onPress={() => handlePreset(today)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  s.calendarPresetText,
                  isSameDayHelper(selectedDate, today) && s.calendarPresetTextActive,
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.calendarPresetChip,
                isSameDayHelper(selectedDate, yesterday) && s.calendarPresetChipActive,
              ]}
              onPress={() => handlePreset(yesterday)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  s.calendarPresetText,
                  isSameDayHelper(selectedDate, yesterday) && s.calendarPresetTextActive,
                ]}
              >
                Yesterday
              </Text>
            </TouchableOpacity>
          </View>

          {/* Month Navigation */}
          <View style={s.calendarMonthHeader}>
            <TouchableOpacity onPress={prevMonth} style={s.calendarNavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ChevronLeftIcon size={18} color="#6C5CE7" />
            </TouchableOpacity>

            <Text style={s.calendarMonthTitle}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>

            <TouchableOpacity onPress={nextMonth} style={s.calendarNavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ChevronRightIcon size={18} color="#6C5CE7" />
            </TouchableOpacity>
          </View>

          {/* Weekday Row */}
          <View style={s.calendarWeekdaysRow}>
            {WEEKDAYS.map((w, index) => (
              <Text key={`${w}-${index}`} style={s.calendarWeekdayText}>
                {w}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={s.calendarDaysGrid}>
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <View key={`empty-${i}`} style={s.calendarDayCell} />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const cellDate = new Date(currentYear, currentMonth, day);
              const isTodayCell = isSameDayHelper(cellDate, today);
              const isSelectedCell = isSameDayHelper(cellDate, selectedDate);

              return (
                <View key={`day-${day}`} style={s.calendarDayCell}>
                  <TouchableOpacity
                    style={[
                      s.calendarDayBtn,
                      isTodayCell && !isSelectedCell && s.calendarDayBtnToday,
                      isSelectedCell && s.calendarDayBtnSelected,
                    ]}
                    onPress={() => handlePickDate(day)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        s.calendarDayText,
                        isTodayCell && !isSelectedCell && s.calendarDayTextToday,
                        isSelectedCell && s.calendarDayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Reset button if custom non-today or non-all-time date selected */}
          {allowAllTime && selectedDate ? (
            <TouchableOpacity
              style={s.calendarResetBtn}
              onPress={() => {
                onSelectDate(null);
                onClose();
              }}
              activeOpacity={0.8}
            >
              <Text style={s.calendarResetBtnText}>Show All Lifetime Visitors</Text>
            </TouchableOpacity>
          ) : !isSameDayHelper(selectedDate, today) ? (
            <TouchableOpacity
              style={s.calendarResetBtn}
              onPress={() => handlePreset(today)}
              activeOpacity={0.8}
            >
              <Text style={s.calendarResetBtnText}>Reset to Today's Logs</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
