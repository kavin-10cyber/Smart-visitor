import React, { useState, useEffect, useCallback } from 'react';
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
import {
  CloseIcon,
  CheckMarkIcon,
  ArrowRightIcon,
  CrownIcon,
} from '../AdminIcons';
import CalendarPicker, { formatDisplayDate } from './CalendarPicker';
import styles from '../../styles/adminStyles';

const CATEGORIES = [
  { key: 'VIP', label: 'VIP / Guest' },
  { key: 'Contractor', label: 'Contractor' },
  { key: 'Utility', label: 'Utility / Maintenance' },
];

const TIME_WINDOWS = [
  '09:00 AM - 01:00 PM',
  '01:00 PM - 05:00 PM',
  '09:00 AM - 06:00 PM',
  'Custom Time',
];

const POPULAR_HOSTS = [
  'Dr. Amar Karthik - Placement Cell',
  'Prof. Radhakrishnan - EE Dept',
  'Campus Director - Admin Office',
  'Estate & Facilities Office',
];

function IssueScheduledTokenModal({
  visible,
  onClose,
  availableTokens = [],
  onSubmit,
  isLoading,
}) {
  const [category, setCategory] = useState('VIP');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [company, setCompany] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [timeWindow, setTimeWindow] = useState('');
  const [host, setHost] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isVip, setIsVip] = useState(true);
  const [selectedTokenCode, setSelectedTokenCode] = useState('');

  // Auto-pick badge from available fleet
  useEffect(() => {
    if (availableTokens.length > 0) {
      if (!selectedTokenCode || !availableTokens.some((t) => t.token_code === selectedTokenCode)) {
        setSelectedTokenCode(availableTokens[0].token_code);
      }
    } else {
      setSelectedTokenCode('V-001');
    }
  }, [availableTokens, visible]);

  const handleCategorySelect = (newCat) => {
    setCategory(newCat);
    setIsVip(newCat === 'VIP');
  };

  const handleSubmit = () => {
    const tokenToUse = selectedTokenCode || availableTokens[0]?.token_code || 'V-001';
    onSubmit({
      category,
      full_name: fullName.trim(),
      mobile: mobile.trim(),
      company: company.trim(),
      vehicle_no: '',
      expected_date: expectedDate.trim() || 'Today',
      time_window: timeWindow.trim() || '09:00 AM - 01:00 PM',
      address: host.trim() || 'Dr. Amar Karthik - Placement Cell',
      gate: 'Gate 1 Entrance',
      purpose: purpose.trim() || `${category} Visit`,
      is_vip: isVip,
      token_code: tokenToUse,
      status: 'SCHEDULED',
    });
  };

  const tokenCount = availableTokens.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.scheduledModalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalHeaderTitle}>Issue Scheduled Token</Text>
              <Text style={styles.modalSubHeader}>
                Pre-approve VIP, contractor or utility access pass
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <CloseIcon size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 1. Category Selector */}
            <Text style={styles.formSectionHeading}>Category Selector</Text>
            <View style={styles.categoryTabsRow}>
              {CATEGORIES.map((cat) => {
                const isActive = category === cat.key;
                const isVipTab = cat.key === 'VIP';
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryTabItem,
                      isActive && styles.categoryTabItemActive,
                      isActive && isVipTab && styles.categoryTabItemActiveVip,
                    ]}
                    onPress={() => handleCategorySelect(cat.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.categoryTabText,
                        isActive && styles.categoryTabTextActive,
                        isActive && isVipTab && styles.categoryTabTextActiveVip,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Visitor Profile Fields */}
            <Text style={styles.formSectionHeading}>Visitor Profile</Text>

            <Text style={styles.formInputLabel}>Visitor / Lead Name *</Text>
            <TextInput
              style={styles.formTextInput}
              placeholder="e.g. Mr. Kannan"
              placeholderTextColor="#94a3b8"
              value={fullName}
              onChangeText={setFullName}
            />

            <View style={styles.twoColRow}>
              <View style={styles.colHalf}>
                <Text style={styles.formInputLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.formTextInput}
                  placeholder="e.g. 9840122345"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={mobile}
                  onChangeText={setMobile}
                />
              </View>
              <View style={styles.colHalf}>
                <Text style={styles.formInputLabel}>Company / Organization</Text>
                <TextInput
                  style={styles.formTextInput}
                  placeholder="e.g. Diebold / Tech Corp"
                  placeholderTextColor="#94a3b8"
                  value={company}
                  onChangeText={setCompany}
                />
              </View>
            </View>

            {/* 3. Scheduling & Location Fields */}
            <Text style={styles.formSectionHeading}>Scheduling & Location</Text>

            <CalendarPicker
              value={expectedDate}
              onChange={setExpectedDate}
              label="Expected Date"
              defaultExpanded={true}
            />

            <Text style={styles.formInputLabel}>Time Window</Text>
            <View style={styles.chipSelectRow}>
              {TIME_WINDOWS.slice(0, 3).map((tw) => (
                <TouchableOpacity
                  key={tw}
                  style={[
                    styles.chipSelectItem,
                    timeWindow === tw && styles.chipSelectItemActive,
                  ]}
                  onPress={() => setTimeWindow(tw)}
                >
                  <Text
                    style={[
                      styles.chipSelectText,
                      timeWindow === tw && styles.chipSelectTextActive,
                    ]}
                  >
                    {tw}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.formTextInput}
              placeholder="e.g. 09:00 AM - 01:00 PM"
              placeholderTextColor="#94a3b8"
              value={timeWindow}
              onChangeText={setTimeWindow}
            />

            <Text style={styles.formInputLabel}>Host / Department</Text>
            <TextInput
              style={styles.formTextInput}
              placeholder="e.g. Dr. Amar Karthik - Placement Cell"
              placeholderTextColor="#94a3b8"
              value={host}
              onChangeText={setHost}
            />
            <View style={styles.chipSelectRow}>
              {POPULAR_HOSTS.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[
                    styles.chipSelectItem,
                    host === h && styles.chipSelectItemActive,
                  ]}
                  onPress={() => setHost(h)}
                >
                  <Text
                    style={[
                      styles.chipSelectText,
                      host === h && styles.chipSelectTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 4. Purpose & Priority Badges */}
            <Text style={styles.formSectionHeading}>Purpose & Priority</Text>

            <Text style={styles.formInputLabel}>Purpose of Visit</Text>
            <TextInput
              style={styles.formTextInput}
              placeholder="e.g. ATM Cash Replenishment / Keynote Speaker"
              placeholderTextColor="#94a3b8"
              value={purpose}
              onChangeText={setPurpose}
            />

            {/* Priority Toggle */}
            <TouchableOpacity
              style={styles.priorityToggleBox}
              activeOpacity={0.8}
              onPress={() => setIsVip(!isVip)}
            >
              <View
                style={[
                  styles.priorityCheckbox,
                  isVip && styles.priorityCheckboxChecked,
                ]}
              >
                {isVip && <CheckMarkIcon size={14} color="#ffffff" />}
              </View>
              <View style={styles.priorityLabelCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <CrownIcon size={14} color="#5642DE" />
                  <Text style={styles.priorityMainTitle}>Mark as VIP Priority</Text>
                </View>
                <Text style={styles.prioritySubDescription}>
                  When toggled, highlights the record on the security guard app
                </Text>
              </View>
            </TouchableOpacity>

            {/* Modal Actions */}
            <TouchableOpacity
              style={styles.sendPassPrimaryBtn}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Text style={styles.sendPassPrimaryBtnText}>
                    Issue & Send Pass (SMS / WhatsApp)
                  </Text>
                  <ArrowRightIcon size={16} color="#ffffff" />
                </>
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

export default React.memo(IssueScheduledTokenModal);

