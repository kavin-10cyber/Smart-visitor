import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  Alert,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { api } from '../services/api';
import {
  ShieldIcon,
  BellIcon,
  CloseIcon,
  ArrowUpRightIcon,
  PlusIcon,
  QrNavIcon,
  CrownIcon,
  WrenchIcon,
  BuildingIcon,
  HomeTabIcon,
  HistoryTabIcon,
  ArrivalsTabIcon,
  UserTabIcon,
  AlertTriangleIcon,
  CheckOutIcon,
  LogoutIcon,
  FilterSlidersIcon,
  CalendarIcon,
  SearchIcon,
  CheckCircleIcon,
} from '../components/AdminIcons';

// Extracted components & styles
import s from '../styles/securityStyles';
import {
  ScannerModal,
  CheckInModal,
  VisitActionModal,
  OfficerModal,
  FilterModal,
  CalendarModal,
} from '../components/security/SecurityModals';

function formatDisplayTime(isoString) {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return isoString;
  }
}

function formatDateTime(isoString) {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return isoString;
  }
}

function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isMatchingLogDate(v, targetDate) {
  if (!v) return false;
  const target = targetDate || new Date();
  const isTargetToday = isSameDay(target, new Date());

  // Active visits currently inside the campus are relevant to today's active count/logs
  if (isTargetToday && v.status === 'ACTIVE') return true;

  // If scheduled for Today
  if (isTargetToday && v.expected_date === 'Today') return true;
  if (v.expected_date && v.expected_date !== 'Today') {
    const d = new Date(v.expected_date);
    if (!isNaN(d.getTime()) && isSameDay(d, target)) return true;
  }

  // Check check_in, check_out, or created_at timestamps
  const timestamps = [v.check_in, v.check_out, v.created_at].filter(Boolean);
  for (const t of timestamps) {
    const d = new Date(t);
    if (!isNaN(d.getTime()) && isSameDay(d, target)) return true;
  }

  return false;
}

function formatLogDateLabel(date) {
  if (!date) return 'Today';
  const today = new Date();
  if (isSameDay(date, today)) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SecurityPortal({ onLogout, officer = {} }) {
  const officerName = officer.name || 'Security Officer';
  const officerUsername = officer.username || 'DEMO';
  const officerInitials = officerName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');

  // Filters & Search
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Log Date for Recent Visitors
  const [selectedLogDate, setSelectedLogDate] = useState(new Date());
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // History Tab Filters, Search & Date
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historySelectedFilter, setHistorySelectedFilter] = useState('ALL');
  const [historySelectedDate, setHistorySelectedDate] = useState(null); // null means All Time / Lifetime
  const [historySelectedCategory, setHistorySelectedCategory] = useState(null);
  const [showHistoryCalendarModal, setShowHistoryCalendarModal] = useState(false);
  const [showHistoryFilterModal, setShowHistoryFilterModal] = useState(false);

  // Arrivals Tab Filters
  const [arrivalsSearchQuery, setArrivalsSearchQuery] = useState('');
  const [arrivalsSelectedCategory, setArrivalsSelectedCategory] = useState(null);
  const [arrivalsSelectedFilter, setArrivalsSelectedFilter] = useState('ALL');
  const [showArrivalsFilterModal, setShowArrivalsFilterModal] = useState(false);

  // Data
  const [tokensList, setTokensList] = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);
  const [scheduledVisits, setScheduledVisits] = useState([]);
  const [historyVisits, setHistoryVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedVisitForAction, setSelectedVisitForAction] = useState(null);

  // Check-In Form State
  const [regFullName, setRegFullName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regHost, setRegHost] = useState('');
  const [regPurpose, setRegPurpose] = useState('General Visit');
  const [regTokenCode, setRegTokenCode] = useState('');
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  // Derived counts
  const availableTokens = useMemo(
    () => tokensList.filter((t) => t.status === 'AVAILABLE'),
    [tokensList]
  );

  const isSelectedDateToday = useMemo(
    () => isSameDay(selectedLogDate, new Date()),
    [selectedLogDate]
  );

  // Visitor logs filtered by selectedLogDate
  const dateActive = useMemo(
    () => (isSelectedDateToday ? activeVisits : activeVisits.filter((v) => isMatchingLogDate(v, selectedLogDate))),
    [activeVisits, selectedLogDate, isSelectedDateToday]
  );
  const dateScheduled = useMemo(
    () => scheduledVisits.filter((v) => isMatchingLogDate(v, selectedLogDate)),
    [scheduledVisits, selectedLogDate]
  );
  const dateHistory = useMemo(
    () => historyVisits.filter((v) => isMatchingLogDate(v, selectedLogDate)),
    [historyVisits, selectedLogDate]
  );
  const dateTotalCount = dateActive.length + dateScheduled.length + dateHistory.length;

  // Hero card stats (always reflects Today)
  const todayTotalCount = useMemo(() => {
    const today = new Date();
    return (
      activeVisits.length +
      scheduledVisits.filter((v) => isMatchingLogDate(v, today)).length +
      historyVisits.filter((v) => isMatchingLogDate(v, today)).length
    );
  }, [activeVisits, scheduledVisits, historyVisits]);

  const dateVipCount = useMemo(
    () => [...dateActive, ...dateScheduled, ...dateHistory].filter(
      (v) => v.is_vip || v.category === 'VIP' || v.purpose?.toLowerCase().includes('vip')
    ).length,
    [dateActive, dateScheduled, dateHistory]
  );

  const filterCounts = useMemo(
    () => ({
      all: dateTotalCount,
      issued: dateScheduled.length,
      inside: dateActive.length,
      exited: dateHistory.length,
      vip: dateVipCount,
    }),
    [dateTotalCount, dateScheduled.length, dateActive.length, dateHistory.length, dateVipCount]
  );

  const selectedFilterName = useMemo(() => {
    switch (selectedFilter) {
      case 'ISSUED': return 'Issued Passes';
      case 'INSIDE': return 'Inside Campus';
      case 'EXITED': return 'Exited';
      case 'VIP': return 'VIP Passes';
      default: return 'All Passes';
    }
  }, [selectedFilter]);

  const recentActivities = useMemo(() => {
    let list = [];
    if (selectedFilter === 'INSIDE') {
      list = dateActive;
    } else if (selectedFilter === 'EXPECTED' || selectedFilter === 'ISSUED') {
      list = dateScheduled;
    } else if (selectedFilter === 'EXITED') {
      list = dateHistory;
    } else if (selectedFilter === 'VIP') {
      list = [...dateActive, ...dateScheduled, ...dateHistory].filter(
        (v) => v.is_vip || v.category === 'VIP' || v.purpose?.toLowerCase().includes('vip')
      );
    } else {
      list = [...dateActive, ...dateScheduled, ...dateHistory];
    }

    if (selectedCategory) {
      list = list.filter((v) => {
        if (selectedCategory === 'VIP') return v.is_vip || v.category === 'VIP';
        if (selectedCategory === 'Contractor') return v.category === 'Contractor' || v.purpose?.toLowerCase().includes('contract');
        if (selectedCategory === 'General') return v.category === 'General';
        return true;
      });
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        item.full_name?.toLowerCase().includes(q) ||
        item.mobile?.toLowerCase().includes(q) ||
        item.token_code?.toLowerCase().includes(q) ||
        item.address?.toLowerCase().includes(q) ||
        item.purpose?.toLowerCase().includes(q)
    );
  }, [dateActive, dateScheduled, dateHistory, selectedFilter, selectedCategory, searchQuery]);

  // Lifetime Visitors for History Tab
  const lifetimeVisits = useMemo(() => {
    const combined = [...activeVisits, ...scheduledVisits, ...historyVisits];
    return combined.sort((a, b) => {
      const timeA = new Date(a.check_in || a.created_at || a.expected_date || a.check_out || 0).getTime();
      const timeB = new Date(b.check_in || b.created_at || b.expected_date || b.check_out || 0).getTime();
      return timeB - timeA;
    });
  }, [activeVisits, scheduledVisits, historyVisits]);

  const historySelectedFilterName = useMemo(() => {
    switch (historySelectedFilter) {
      case 'INSIDE': return 'Inside Campus';
      case 'EXITED': return 'Exited';
      case 'ISSUED': return 'Issued / Scheduled';
      case 'VIP': return 'VIP Passes';
      default: return 'All Passes';
    }
  }, [historySelectedFilter]);

  const historyFilterCounts = useMemo(() => {
    const baseList = historySelectedDate
      ? lifetimeVisits.filter((v) => isMatchingLogDate(v, historySelectedDate))
      : lifetimeVisits;
    return {
      all: baseList.length,
      inside: baseList.filter((v) => v.status === 'ACTIVE').length,
      exited: baseList.filter((v) => v.status === 'COMPLETED' || v.status === 'EXITED').length,
      issued: baseList.filter((v) => v.status === 'SCHEDULED').length,
      vip: baseList.filter((v) => v.is_vip || v.category === 'VIP' || v.purpose?.toLowerCase().includes('vip')).length,
    };
  }, [lifetimeVisits, historySelectedDate]);

  const arrivalsSelectedFilterName = useMemo(() => {
    switch (arrivalsSelectedFilter) {
      case 'INSIDE': return 'Inside Campus';
      case 'EXITED': return 'Exited';
      case 'ISSUED': return 'Expected / Scheduled';
      case 'VIP': return 'VIP Passes';
      default: return 'All Arrivals';
    }
  }, [arrivalsSelectedFilter]);

  const arrivalsFilterCounts = useMemo(() => {
    const today = new Date();
    const base = scheduledVisits.filter((v) => isMatchingLogDate(v, today));
    return {
      all: base.length,
      inside: base.filter((v) => v.status === 'ACTIVE').length,
      exited: base.filter((v) => v.status === 'COMPLETED' || v.status === 'EXITED').length,
      issued: base.filter((v) => v.status === 'SCHEDULED').length,
      vip: base.filter((v) => v.is_vip || v.category === 'VIP' || v.purpose?.toLowerCase().includes('vip')).length,
    };
  }, [scheduledVisits]);

  const filteredHistoryVisits = useMemo(() => {
    let list = lifetimeVisits;

    if (historySelectedDate) {
      list = list.filter((v) => isMatchingLogDate(v, historySelectedDate));
    }

    if (historySelectedFilter === 'INSIDE') {
      list = list.filter((v) => v.status === 'ACTIVE');
    } else if (historySelectedFilter === 'EXITED') {
      list = list.filter((v) => v.status === 'COMPLETED' || v.status === 'EXITED');
    } else if (historySelectedFilter === 'EXPECTED' || historySelectedFilter === 'ISSUED') {
      list = list.filter((v) => v.status === 'SCHEDULED');
    } else if (historySelectedFilter === 'VIP') {
      list = list.filter((v) => v.is_vip || v.category === 'VIP' || v.purpose?.toLowerCase().includes('vip'));
    }

    if (historySelectedCategory) {
      list = list.filter((v) => {
        if (historySelectedCategory === 'VIP') return v.is_vip || v.category === 'VIP';
        if (historySelectedCategory === 'Contractor')
          return v.category === 'Contractor' || v.purpose?.toLowerCase().includes('contract');
        if (historySelectedCategory === 'General') return v.category === 'General';
        return true;
      });
    }

    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.full_name?.toLowerCase().includes(q) ||
          item.mobile?.toLowerCase().includes(q) ||
          item.token_code?.toLowerCase().includes(q) ||
          item.address?.toLowerCase().includes(q) ||
          item.purpose?.toLowerCase().includes(q) ||
          item.host_name?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [lifetimeVisits, historySelectedDate, historySelectedFilter, historySelectedCategory, historySearchQuery]);

  // Data Loading
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tokenRes, visitRes] = await Promise.all([
        api.getTokens().catch(() => ({ success: false, tokens: [] })),
        api.getVisits().catch(() => ({ success: false, activeVisits: [], scheduledVisits: [], historyVisits: [] })),
      ]);
      if (tokenRes?.success) setTokensList(tokenRes.tokens || []);
      if (visitRes?.success) {
        setActiveVisits(visitRes.activeVisits || []);
        setScheduledVisits(visitRes.scheduledVisits || []);
        setHistoryVisits(visitRes.historyVisits || []);
      }
    } catch (err) {
      console.error('Error loading security data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll every 30 seconds instead of 4s to reduce network latency & battery drain
    const interval = setInterval(() => {
      loadData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
  };

  // Handlers
  const handleScanSuccess = async (tokenCode) => {
    setShowScannerModal(false);
    setLoading(true);
    try {
      const res = await api.verifyToken(tokenCode);
      if (!res.exists && !res.activeVisit && !res.scheduledVisit) {
        Alert.alert('Invalid QR Token', `Badge "${tokenCode}" is not registered in the system.`);
        return;
      }
      if (res.scheduledVisit) {
        setSelectedVisitForAction(res.scheduledVisit);
      } else if (res.status === 'IN USE' && res.activeVisit) {
        setSelectedVisitForAction(res.activeVisit);
      } else {
        setRegTokenCode(tokenCode);
        setRegFullName('');
        setRegMobile('');
        setRegHost('');
        setRegPurpose('General Visit');
        setShowCheckInModal(true);
      }
    } catch {
      Alert.alert('Verification Failed', 'Could not verify token with Supabase Cloud');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInScheduled = async (visit) => {
    try {
      setLoading(true);
      const res = await api.checkInScheduledVisit(visit);
      if (res.success) {
        Alert.alert(
          'Pass Checked In 🔓',
          `Badge ${visit.token_code} issued to ${visit.full_name}.\nGate 1 turnstile barrier unlocked.`
        );
        setSelectedVisitForAction(null);
        await loadData(true);
      } else {
        Alert.alert('Check-In Error', res.message || 'Could not check in visitor');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to check in visitor');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSubmit = async () => {
    if (!regFullName.trim() || !regMobile.trim()) {
      Alert.alert('Required Fields', 'Please enter visitor name and mobile number.');
      return;
    }
    const tokenToUse = regTokenCode || (availableTokens[0] ? availableTokens[0].token_code : null);
    if (!tokenToUse) {
      Alert.alert('No Badges Available', 'All badges are currently in use. Please check out an active visitor first.');
      return;
    }

    setSubmittingCheckIn(true);
    try {
      const res = await api.checkInVisitor({
        token_code: tokenToUse,
        full_name: regFullName.trim(),
        mobile: regMobile.trim(),
        address: regHost.trim() || 'Campus Host',
        purpose: regPurpose || 'General Visit',
        status: 'ACTIVE',
        gate: 'Gate 1 Entrance',
      });
      if (res.success) {
        setShowCheckInModal(false);
        Alert.alert('Pass Issued Successfully', `Badge ${tokenToUse} issued to ${regFullName.trim()}.\nGate 1 barrier unlocked.`);
        await loadData(true);
      } else {
        Alert.alert('Check-In Error', res.message || 'Could not issue pass.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to submit check-in to Supabase Cloud');
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  const handleCheckOutConfirm = async (visit) => {
    Alert.alert(
      'Confirm Check-Out',
      `Check out visitor ${visit.full_name} and release badge #${visit.token_code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check Out',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.checkOutVisitor(visit.token_code);
              if (res.success) {
                Alert.alert('Exit Recorded', `Badge ${visit.token_code} is now AVAILABLE.`);
                setSelectedVisitForAction(null);
                loadData(true);
              } else {
                Alert.alert('Check-Out Error', res.message || 'Could not complete checkout');
              }
            } catch {
              Alert.alert('Error', 'Failed to check out visitor');
            }
          },
        },
      ]
    );
  };

  // ── Tab Renders ───────────────────────────────────────────────
  const renderDashboardTab = () => (
    <ScrollView
      style={s.scrollArea}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C5CE7']} tintColor="#6C5CE7" />
      }
    >
      {/* Featured Vibrant Purple Hero Card (Reference UI Screen 1) */}
      <View style={s.heroCard}>
        <View style={s.heroDecorCircle1} />
        <View style={s.heroDecorCircle2} />

        <View style={s.heroTopRow}>
          <View style={s.heroBadgeRow}>
            <View style={s.heroShieldIconBox}>
              <ShieldIcon size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={s.heroCategoryTitle}>Campus Pass Control</Text>
              <Text style={s.heroCategorySub}>Gate 1 Entrance • Priority Access</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.heroArrowBtn}
            activeOpacity={0.8}
            onPress={() => setShowScannerModal(true)}
          >
            <ArrowUpRightIcon size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={s.heroContentRow}>
          <View style={s.heroInfoCol}>
            <Text style={s.heroInfoLabel}>Active Campus Passes</Text>
            <Text style={s.heroInfoValue}>{activeVisits.length} Visitors Inside</Text>
            <Text style={s.heroInfoSub}>
              {availableTokens.length} Badges Available • {todayTotalCount} Total Today
            </Text>
          </View>

          <TouchableOpacity
            style={s.heroQrHighlightWrapper}
            activeOpacity={0.85}
            onPress={() => setShowScannerModal(true)}
          >
            <View style={s.heroQrHalo}>
              <View style={s.heroQrFabButton}>
                <QrNavIcon size={26} color="#6C5CE7" />
              </View>
            </View>
            <Text style={s.heroQrTagText}>SCAN QR</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Strip Section */}
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>Visitor Categories</Text>
      </View>

      <View style={s.categoryScrollRow}>
        {[
          { key: 'VIP', label: 'VIP Pass', Icon: CrownIcon, bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
          { key: 'Contractor', label: 'Contractor', Icon: WrenchIcon, bg: '#FFE8D6', text: '#D97706', border: '#FED7AA' },
          { key: 'General', label: 'General', Icon: BuildingIcon, bg: '#F2EBFE', text: '#7C3AED', border: '#DDD6FE' },
        ].map(({ key, label, Icon, bg, text, border }) => {
          const isSelected = selectedCategory === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                s.categoryCard,
                { backgroundColor: isSelected ? text : bg, borderColor: border },
              ]}
              onPress={() => setSelectedCategory(isSelected ? null : key)}
              activeOpacity={0.8}
            >
              <View style={[s.categoryIconBox, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#FFFFFF' }]}>
                <Icon size={20} color={isSelected ? '#FFFFFF' : text} />
              </View>
              <Text style={[s.categoryLabel, { color: isSelected ? '#FFFFFF' : text }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Actions / Recent Visitors Header with Calendar & Filter Logos */}
      <View style={s.sectionHeaderRow}>
        <View style={s.sectionTitleRow}>
          <Text style={s.sectionTitle}>Recent Visitors</Text>
          <Text style={s.sectionSubtitle}>{formatLogDateLabel(selectedLogDate)}</Text>
        </View>

        <View style={s.sectionHeaderActions}>
          <TouchableOpacity
            style={[
              s.filterIconButton,
              !isSelectedDateToday && s.filterIconButtonActive,
            ]}
            activeOpacity={0.8}
            onPress={() => setShowCalendarModal(true)}
          >
            <CalendarIcon
              size={18}
              color={!isSelectedDateToday ? '#FFFFFF' : '#6C5CE7'}
            />
            {!isSelectedDateToday && <View style={s.filterActiveDot} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.filterIconButton, selectedFilter !== 'ALL' && s.filterIconButtonActive]}
            activeOpacity={0.8}
            onPress={() => setShowFilterModal(true)}
          >
            <FilterSlidersIcon
              size={18}
              color={selectedFilter !== 'ALL' ? '#FFFFFF' : '#6C5CE7'}
            />
            {selectedFilter !== 'ALL' && <View style={s.filterActiveDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Date Filter Indicator Bar */}
      {!isSelectedDateToday && (
        <View style={s.activeFilterBar}>
          <Text style={s.activeFilterLabel}>
            Date: <Text style={s.activeFilterName}>{formatLogDateLabel(selectedLogDate)}</Text>
          </Text>
          <TouchableOpacity onPress={() => setSelectedLogDate(new Date())} activeOpacity={0.7}>
            <Text style={s.clearFilterText}>Reset to Today ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active Filter Indicator Bar */}
      {selectedFilter !== 'ALL' && (
        <View style={s.activeFilterBar}>
          <Text style={s.activeFilterLabel}>
            Filtered: <Text style={s.activeFilterName}>{selectedFilterName}</Text>
          </Text>
          <TouchableOpacity onPress={() => setSelectedFilter('ALL')} activeOpacity={0.7}>
            <Text style={s.clearFilterText}>Clear Filter ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Visitors List Items (Reference UI style) */}
      {recentActivities.length === 0 ? (
        <View style={s.emptyStateBox}>
          <Text style={s.emptyStateTitle}>No visitors found</Text>
          <Text style={s.emptyStateSub}>
            {searchQuery
              ? `No matches for "${searchQuery}"`
              : `No visitor records logged for ${formatLogDateLabel(selectedLogDate)}.`}
          </Text>
        </View>
      ) : (
        recentActivities.slice(0, 10).map((visit, index) => {
          const initials = (visit.full_name || 'V')
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          const pastelColors = [
            { bg: '#FFE8D6', text: '#D97706' },
            { bg: '#F2EBFE', text: '#7C3AED' },
            { bg: '#E0F2FE', text: '#0284C7' },
            { bg: '#FFE4E8', text: '#E11D48' },
          ];
          const colorTheme = pastelColors[index % pastelColors.length];

          const isScheduled = visit.status === 'SCHEDULED';
          const isInside = visit.status === 'ACTIVE';

          return (
            <TouchableOpacity
              key={visit.id || visit.token_code || index}
              style={s.visitorCard}
              activeOpacity={0.85}
              onPress={() => setSelectedVisitForAction(visit)}
            >
              <View style={[s.visitorIconBox, { backgroundColor: colorTheme.bg }]}>
                <Text style={[s.visitorInitials, { color: colorTheme.text }]}>{initials}</Text>
              </View>

              <View style={s.visitorInfoCol}>
                <View style={s.visitorNameRow}>
                  <Text style={s.visitorNameText}>{visit.full_name}</Text>
                  <View style={[s.badgeTokenPill, { backgroundColor: '#F4F0FF' }]}>
                    <Text style={[s.badgeTokenText, { color: '#6C5CE7' }]}>{visit.token_code}</Text>
                  </View>
                </View>
                <Text style={s.visitorSubDetail} numberOfLines={1}>
                  {visit.address || 'Admin Office'} • {visit.purpose || 'Campus Visit'}
                </Text>
              </View>

              <View style={s.visitorStatusCol}>
                <View style={[
                  s.statusPill,
                  isScheduled
                    ? { backgroundColor: '#FEF3C7' }
                    : isInside
                    ? { backgroundColor: '#DCFCE7' }
                    : { backgroundColor: '#F1F5F9' }
                ]}>
                  <View style={[
                    s.statusDot,
                    isScheduled
                      ? { backgroundColor: '#F59E0B' }
                      : isInside
                      ? { backgroundColor: '#22C55E' }
                      : { backgroundColor: '#94A3B8' }
                  ]} />
                  <Text style={[
                    s.statusPillText,
                    isScheduled
                      ? { color: '#B45309' }
                      : isInside
                      ? { color: '#166534' }
                      : { color: '#475569' }
                  ]}>
                    {isScheduled ? 'Issued' : isInside ? 'Inside' : 'Exited'}
                  </Text>
                </View>
                <Text style={s.visitorTimeText}>
                  {isScheduled
                    ? (visit.time_window || visit.expected_date || 'Expected')
                    : formatDisplayTime(visit.check_in)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );

  const renderHistoryTab = () => (
    <ScrollView
      style={s.scrollArea}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(false)} colors={['#6C5CE7']} />}
    >
      {/* History Header */}
      <View style={s.historyHeaderRow}>
        <Text style={s.tabHeadingTitle}>Visitor History</Text>
        <Text style={s.tabHeadingSub}>
          {historySelectedDate
            ? `Logs for ${formatLogDateLabel(historySelectedDate)} • ${filteredHistoryVisits.length} visitors`
            : `All lifetime visitor records • ${filteredHistoryVisits.length} total entries`}
        </Text>
      </View>

      {/* Search Bar with Calendar & Filter Icons */}
      <View style={s.historySearchRow}>
        <View style={s.historySearchInputBox}>
          <SearchIcon size={18} color="#6C5CE7" />
          <TextInput
            style={s.historySearchInput}
            placeholder="Search visitor, badge, mobile, host..."
            placeholderTextColor="#94A3B8"
            value={historySearchQuery}
            onChangeText={setHistorySearchQuery}
          />
          {historySearchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setHistorySearchQuery('')}
              style={s.searchClearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <CloseIcon size={15} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Calendar Logo Button */}
        <TouchableOpacity
          style={[s.filterIconButton, historySelectedDate && s.filterIconButtonActive]}
          activeOpacity={0.8}
          onPress={() => setShowHistoryCalendarModal(true)}
        >
          <CalendarIcon
            size={18}
            color={historySelectedDate ? '#FFFFFF' : '#6C5CE7'}
          />
          {historySelectedDate && <View style={s.filterActiveDot} />}
        </TouchableOpacity>

        {/* Filter Logo Button */}
        <TouchableOpacity
          style={[s.filterIconButton, historySelectedFilter !== 'ALL' && s.filterIconButtonActive]}
          activeOpacity={0.8}
          onPress={() => setShowHistoryFilterModal(true)}
        >
          <FilterSlidersIcon
            size={18}
            color={historySelectedFilter !== 'ALL' ? '#FFFFFF' : '#6C5CE7'}
          />
          {historySelectedFilter !== 'ALL' && <View style={s.filterActiveDot} />}
        </TouchableOpacity>
      </View>

      {/* Visitor Category Grid */}
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>Visitor Categories</Text>
      </View>
      <View style={s.categoryScrollRow}>
        {[
          { key: 'VIP', label: 'VIP Pass', Icon: CrownIcon, bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
          { key: 'Contractor', label: 'Contractor', Icon: WrenchIcon, bg: '#FFE8D6', text: '#D97706', border: '#FED7AA' },
          { key: 'General', label: 'General', Icon: BuildingIcon, bg: '#F2EBFE', text: '#7C3AED', border: '#DDD6FE' },
        ].map(({ key, label, Icon, bg, text, border }) => {
          const isSelected = historySelectedCategory === key;
          return (
            <TouchableOpacity
              key={key}
              style={[s.categoryCard, { backgroundColor: isSelected ? text : bg, borderColor: border }]}
              onPress={() => setHistorySelectedCategory(isSelected ? null : key)}
              activeOpacity={0.8}
            >
              <View style={[s.categoryIconBox, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#FFFFFF' }]}>
                <Icon size={20} color={isSelected ? '#FFFFFF' : text} />
              </View>
              <Text style={[s.categoryLabel, { color: isSelected ? '#FFFFFF' : text }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active Filter Tags */}
      {(historySelectedDate || historySelectedFilter !== 'ALL' || historySelectedCategory || historySearchQuery.trim()) && (
        <View style={s.historyActiveFiltersRow}>
          {historySelectedDate && (
            <View style={s.historyFilterTag}>
              <CalendarIcon size={12} color="#6C5CE7" />
              <Text style={s.historyFilterTagText}>{formatLogDateLabel(historySelectedDate)}</Text>
              <TouchableOpacity onPress={() => setHistorySelectedDate(null)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <CloseIcon size={12} color="#6C5CE7" />
              </TouchableOpacity>
            </View>
          )}

          {historySelectedFilter !== 'ALL' && (
            <View style={s.historyFilterTag}>
              <Text style={s.historyFilterTagText}>{historySelectedFilterName}</Text>
              <TouchableOpacity onPress={() => setHistorySelectedFilter('ALL')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <CloseIcon size={12} color="#6C5CE7" />
              </TouchableOpacity>
            </View>
          )}

          {historySelectedCategory && (
            <View style={s.historyFilterTag}>
              <Text style={s.historyFilterTagText}>{historySelectedCategory}</Text>
              <TouchableOpacity onPress={() => setHistorySelectedCategory(null)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <CloseIcon size={12} color="#6C5CE7" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={() => {
              setHistorySelectedDate(null);
              setHistorySelectedFilter('ALL');
              setHistorySelectedCategory(null);
              setHistorySearchQuery('');
            }}
            style={s.historyResetAllBtn}
          >
            <Text style={s.historyResetAllText}>Reset All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Visitor Records List */}
      {filteredHistoryVisits.length === 0 ? (
        <View style={s.emptyStateBox}>
          <Text style={s.emptyStateTitle}>No visitor records found</Text>
          <Text style={s.emptyStateSub}>
            {historySearchQuery || historySelectedDate || historySelectedFilter !== 'ALL'
              ? 'No matching entries found. Try adjusting or clearing your filters.'
              : 'No lifetime visitor history logged yet.'}
          </Text>
          {(historySearchQuery || historySelectedDate || historySelectedCategory || historySelectedFilter !== 'ALL') && (
            <TouchableOpacity
              style={[s.filterResetBtn, { marginTop: 14, paddingHorizontal: 20 }]}
              onPress={() => {
                setHistorySelectedDate(null);
                setHistorySelectedFilter('ALL');
                setHistorySelectedCategory(null);
                setHistorySearchQuery('');
              }}
            >
              <Text style={s.filterResetBtnText}>Show All Lifetime Visitors</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        filteredHistoryVisits.map((visit, index) => {
          const initials = (visit.full_name || 'V')
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          const pastelColors = [
            { bg: '#FFE8D6', text: '#D97706' },
            { bg: '#F2EBFE', text: '#7C3AED' },
            { bg: '#E0F2FE', text: '#0284C7' },
            { bg: '#FFE4E8', text: '#E11D48' },
          ];
          const colorTheme = pastelColors[index % pastelColors.length];

          const isScheduled = visit.status === 'SCHEDULED';
          const isInside = visit.status === 'ACTIVE';

          return (
            <TouchableOpacity
              key={visit.id || visit.token_code || index}
              style={[s.visitorCard, { flexDirection: 'column', alignItems: 'stretch' }]}
              activeOpacity={0.85}
              onPress={() => setSelectedVisitForAction(visit)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[s.visitorIconBox, { backgroundColor: colorTheme.bg }]}>
                  <Text style={[s.visitorInitials, { color: colorTheme.text }]}>{initials}</Text>
                </View>

                <View style={[s.visitorInfoCol, { flex: 1 }]}>
                  <View style={s.visitorNameRow}>
                    <Text style={s.visitorNameText}>{visit.full_name}</Text>
                    {visit.is_vip && <CrownIcon size={14} color="#D97706" />}
                    <View style={[s.badgeTokenPill, { backgroundColor: '#F4F0FF' }]}>
                      <Text style={[s.badgeTokenText, { color: '#6C5CE7' }]}>{visit.token_code}</Text>
                    </View>
                  </View>
                  <Text style={s.visitorSubDetail} numberOfLines={1}>
                    {visit.address || 'Admin Office'} • {visit.purpose || 'Campus Visit'}
                  </Text>
                  {visit.mobile && (
                    <Text style={[s.visitorSubDetail, { marginTop: 2, color: '#64748B' }]}>
                      📞 {visit.mobile}
                    </Text>
                  )}
                </View>

                <View style={s.visitorStatusCol}>
                  <View
                    style={[
                      s.statusPill,
                      isScheduled
                        ? { backgroundColor: '#FEF3C7' }
                        : isInside
                        ? { backgroundColor: '#DCFCE7' }
                        : { backgroundColor: '#F1F5F9' },
                    ]}
                  >
                    <View
                      style={[
                        s.statusDot,
                        isScheduled
                          ? { backgroundColor: '#F59E0B' }
                          : isInside
                          ? { backgroundColor: '#22C55E' }
                          : { backgroundColor: '#94A3B8' },
                      ]}
                    />
                    <Text
                      style={[
                        s.statusPillText,
                        isScheduled
                          ? { color: '#B45309' }
                          : isInside
                          ? { color: '#166534' }
                          : { color: '#475569' },
                      ]}
                    >
                      {isScheduled ? 'Issued' : isInside ? 'Inside' : 'Exited'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Timing details row */}
              <View style={s.historyCardTimesRow}>
                {visit.check_in && (
                  <View style={s.historyCardTimeItem}>
                    <Text style={s.historyCardTimeLabel}>IN:</Text>
                    <Text style={s.historyCardTimeVal}>{formatDateTime(visit.check_in)}</Text>
                  </View>
                )}
                {visit.check_out && (
                  <View style={s.historyCardTimeItem}>
                    <Text style={s.historyCardTimeLabel}>OUT:</Text>
                    <Text style={s.historyCardTimeVal}>{formatDateTime(visit.check_out)}</Text>
                  </View>
                )}
                {isScheduled && (
                  <View style={s.historyCardTimeItem}>
                    <Text style={s.historyCardTimeLabel}>EXP:</Text>
                    <Text style={s.historyCardTimeVal}>{visit.expected_date || visit.time_window || 'Today'}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );

  const renderArrivalsTab = () => {
    const today = new Date();
    const todayScheduled = scheduledVisits.filter((v) => isMatchingLogDate(v, today));

    // Apply status filter
    let filtered = todayScheduled;
    if (arrivalsSelectedFilter === 'INSIDE') {
      filtered = filtered.filter((v) => v.status === 'ACTIVE');
    } else if (arrivalsSelectedFilter === 'EXPECTED' || arrivalsSelectedFilter === 'ISSUED') {
      filtered = filtered.filter((v) => v.status === 'SCHEDULED');
    } else if (arrivalsSelectedFilter === 'EXITED') {
      filtered = filtered.filter((v) => v.status === 'COMPLETED' || v.status === 'EXITED');
    } else if (arrivalsSelectedFilter === 'VIP') {
      filtered = filtered.filter((v) => v.is_vip || v.category === 'VIP' || v.purpose?.toLowerCase().includes('vip'));
    }

    // Apply category filter
    if (arrivalsSelectedCategory) {
      filtered = filtered.filter((v) => {
        if (arrivalsSelectedCategory === 'VIP') return v.is_vip || v.category === 'VIP';
        if (arrivalsSelectedCategory === 'Contractor')
          return v.category === 'Contractor' || v.purpose?.toLowerCase().includes('contract');
        if (arrivalsSelectedCategory === 'General') return v.category === 'General';
        return true;
      });
    }

    // Apply search filter
    if (arrivalsSearchQuery.trim()) {
      const q = arrivalsSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (v) =>
          v.full_name?.toLowerCase().includes(q) ||
          v.mobile?.toLowerCase().includes(q) ||
          v.token_code?.toLowerCase().includes(q) ||
          v.address?.toLowerCase().includes(q) ||
          v.purpose?.toLowerCase().includes(q)
      );
    }

    const vipCount = todayScheduled.filter((v) => v.is_vip || v.category === 'VIP').length;

    return (
      <ScrollView
        style={s.scrollArea}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C5CE7']} tintColor="#6C5CE7" />
        }
      >
        {/* Header */}
        <View style={s.historyHeaderRow}>
          <Text style={s.tabHeadingTitle}>Today's Arrivals</Text>
          <Text style={s.tabHeadingSub}>
            {todayScheduled.length} visitor{todayScheduled.length !== 1 ? 's' : ''} expected today
            {vipCount > 0 ? ` • ${vipCount} VIP` : ''} • Gate 1
          </Text>
        </View>

        {/* Summary stat chips */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16, paddingHorizontal: 2 }}>
          {[
            { label: 'Expected', count: todayScheduled.length, bg: '#F4F0FF', text: '#6C5CE7' },
            { label: 'VIP', count: vipCount, bg: '#FEF3C7', text: '#D97706' },
            { label: 'Showing', count: filtered.length, bg: '#DCFCE7', text: '#166534' },
          ].map(({ label, count, bg, text }) => (
            <View key={label} style={[s.historyCardTimeItem, { backgroundColor: bg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flex: 1, alignItems: 'center' }]}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: text }}>{count}</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: text, opacity: 0.8 }}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Search bar & Filter */}
        <View style={s.historySearchRow}>
          <View style={s.historySearchInputBox}>
            <SearchIcon size={18} color="#6C5CE7" />
            <TextInput
              style={s.historySearchInput}
              placeholder="Search visitor, badge, mobile..."
              placeholderTextColor="#94A3B8"
              value={arrivalsSearchQuery}
              onChangeText={setArrivalsSearchQuery}
            />
            {arrivalsSearchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setArrivalsSearchQuery('')}
                style={s.searchClearBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <CloseIcon size={15} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Logo Button */}
          <TouchableOpacity
            style={[s.filterIconButton, arrivalsSelectedFilter !== 'ALL' && s.filterIconButtonActive]}
            activeOpacity={0.8}
            onPress={() => setShowArrivalsFilterModal(true)}
          >
            <FilterSlidersIcon
              size={18}
              color={arrivalsSelectedFilter !== 'ALL' ? '#FFFFFF' : '#6C5CE7'}
            />
            {arrivalsSelectedFilter !== 'ALL' && <View style={s.filterActiveDot} />}
          </TouchableOpacity>
        </View>

        {/* Category grid */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Visitor Categories</Text>
        </View>
        <View style={s.categoryScrollRow}>
          {[
            { key: 'VIP', label: 'VIP Pass', Icon: CrownIcon, bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
            { key: 'Contractor', label: 'Contractor', Icon: WrenchIcon, bg: '#FFE8D6', text: '#D97706', border: '#FED7AA' },
            { key: 'General', label: 'General', Icon: BuildingIcon, bg: '#F2EBFE', text: '#7C3AED', border: '#DDD6FE' },
          ].map(({ key, label, Icon, bg, text, border }) => {
            const isSel = arrivalsSelectedCategory === key;
            return (
              <TouchableOpacity
                key={key}
                style={[s.categoryCard, { backgroundColor: isSel ? text : bg, borderColor: border }]}
                onPress={() => setArrivalsSelectedCategory(isSel ? null : key)}
                activeOpacity={0.8}
              >
                <View style={[s.categoryIconBox, { backgroundColor: isSel ? 'rgba(255,255,255,0.2)' : '#FFFFFF' }]}>
                  <Icon size={20} color={isSel ? '#FFFFFF' : text} />
                </View>
                <Text style={[s.categoryLabel, { color: isSel ? '#FFFFFF' : text }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Active Filter Tags */}
        {(arrivalsSelectedFilter !== 'ALL' || arrivalsSelectedCategory || arrivalsSearchQuery.trim()) && (
          <View style={s.historyActiveFiltersRow}>
            {arrivalsSelectedFilter !== 'ALL' && (
              <View style={s.historyFilterTag}>
                <Text style={s.historyFilterTagText}>{arrivalsSelectedFilterName}</Text>
                <TouchableOpacity onPress={() => setArrivalsSelectedFilter('ALL')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <CloseIcon size={12} color="#6C5CE7" />
                </TouchableOpacity>
              </View>
            )}

            {arrivalsSelectedCategory && (
              <View style={s.historyFilterTag}>
                <Text style={s.historyFilterTagText}>{arrivalsSelectedCategory}</Text>
                <TouchableOpacity onPress={() => setArrivalsSelectedCategory(null)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <CloseIcon size={12} color="#6C5CE7" />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setArrivalsSelectedFilter('ALL');
                setArrivalsSelectedCategory(null);
                setArrivalsSearchQuery('');
              }}
              style={s.historyResetAllBtn}
            >
              <Text style={s.historyResetAllText}>Reset All</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Visitor list */}
        <View style={s.sectionHeaderRow}>
          <Text style={s.sectionTitle}>Expected Visitors</Text>
          {(arrivalsSelectedCategory || arrivalsSelectedFilter !== 'ALL' || arrivalsSearchQuery.trim()) && (
            <TouchableOpacity
              onPress={() => {
                setArrivalsSelectedCategory(null);
                setArrivalsSelectedFilter('ALL');
                setArrivalsSearchQuery('');
              }}
              activeOpacity={0.7}
            >
              <Text style={s.clearFilterText}>Clear ✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {filtered.length === 0 ? (
          <View style={s.emptyStateBox}>
            <Text style={s.emptyStateTitle}>
              {todayScheduled.length === 0 ? 'No arrivals expected today' : 'No matches found'}
            </Text>
            <Text style={s.emptyStateSub}>
              {todayScheduled.length === 0
                ? 'No scheduled visits have been issued for today.'
                : 'Try adjusting your search or category filter.'}
            </Text>
          </View>
        ) : (
          filtered.map((visit, index) => {
            const initials = (visit.full_name || 'V')
              .split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
            const pastelColors = [
              { bg: '#FFE8D6', text: '#D97706' },
              { bg: '#F2EBFE', text: '#7C3AED' },
              { bg: '#E0F2FE', text: '#0284C7' },
              { bg: '#FFE4E8', text: '#E11D48' },
            ];
            const colorTheme = pastelColors[index % pastelColors.length];

            return (
              <TouchableOpacity
                key={visit.id || visit.token_code || index}
                style={s.visitorCard}
                activeOpacity={0.85}
                onPress={() => setSelectedVisitForAction(visit)}
              >
                <View style={[s.visitorIconBox, { backgroundColor: colorTheme.bg }]}>
                  <Text style={[s.visitorInitials, { color: colorTheme.text }]}>{initials}</Text>
                </View>

                <View style={s.visitorInfoCol}>
                  <View style={s.visitorNameRow}>
                    <Text style={s.visitorNameText}>{visit.full_name}</Text>
                    {visit.is_vip && <CrownIcon size={13} color="#D97706" />}
                    <View style={[s.badgeTokenPill, { backgroundColor: '#F4F0FF' }]}>
                      <Text style={[s.badgeTokenText, { color: '#6C5CE7' }]}>{visit.token_code}</Text>
                    </View>
                  </View>
                  <Text style={s.visitorSubDetail} numberOfLines={1}>
                    {visit.address || 'Admin Office'} • {visit.purpose || 'Campus Visit'}
                  </Text>
                  {visit.time_window && (
                    <Text style={[s.visitorSubDetail, { marginTop: 2, color: '#6C5CE7', fontWeight: '600' }]}>
                      🕐 {visit.time_window}
                    </Text>
                  )}
                </View>

                {/* Quick check-in button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#6C5CE7',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.8}
                  onPress={() => handleCheckInScheduled(visit)}
                >
                  <CheckCircleIcon size={16} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '700', marginTop: 2 }}>CHECK IN</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    );
  };

  const renderSettingsTab = () => {
    const loginTime = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric', year: 'numeric'
    });
    const sessionInfo = [
      { label: '🪪  Officer ID', val: officerUsername.toUpperCase() },
      { label: '🏷️  Full Name', val: officerName },
      { label: '🏢  Assigned Gate', val: 'Gate 1 Entrance' },
      { label: '🛡️  Role', val: 'Security Officer' },
      { label: '🏫  Campus', val: 'Campus-Go Campus' },
      { label: '🗄️  Cloud Database', val: 'Supabase PostgreSQL' },
      { label: '📡  System Mode', val: 'Direct Cloud (Serverless)' },
    ];

    const shiftStats = [
      { label: 'Inside Now', val: activeVisits.length.toString(), color: '#22C55E', bg: '#DCFCE7' },
      { label: 'Today Total', val: todayTotalCount.toString(), color: '#6C5CE7', bg: '#F4F0FF' },
      { label: 'Badges Free', val: availableTokens.length.toString(), color: '#0284C7', bg: '#E0F2FE' },
    ];

    return (
      <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Hero Card */}
        <View style={s.profileHeroCard}>
          <View style={s.profileHeroDecor1} />
          <View style={s.profileHeroDecor2} />

          <View style={s.profileAvatarLargeBox}>
            <Text style={s.profileAvatarLargeText}>{officerInitials}</Text>
          </View>

          <Text style={s.profileHeroName}>{officerName}</Text>
          <Text style={s.profileHeroRole}>Security Officer  •  Gate 1</Text>

          <View style={s.profileHeroBadgeRow}>
            <View style={s.profileStatusBadge}>
              <View style={s.profileStatusDot} />
              <Text style={s.profileStatusText}>On Duty</Text>
            </View>
            <View style={s.profileIdBadge}>
              <Text style={s.profileIdText}>ID: {officerUsername.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Shift Stats Row */}
        <View style={s.profileStatsRow}>
          {shiftStats.map(({ label, val, color, bg }) => (
            <View key={label} style={[s.profileStatCard, { backgroundColor: bg }]}>
              <Text style={[s.profileStatValue, { color }]}>{val}</Text>
              <Text style={[s.profileStatLabel, { color }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Officer Info Section */}
        <View style={s.profileInfoSection}>
          <Text style={s.profileSectionTitle}>Officer Information</Text>
          {sessionInfo.map(({ label, val }) => (
            <View key={label} style={s.profileInfoRow}>
              <Text style={s.profileInfoLabel}>{label}</Text>
              <Text style={s.profileInfoValue}>{val}</Text>
            </View>
          ))}
        </View>

        {/* Session Info */}
        <View style={s.profileInfoSection}>
          <Text style={s.profileSectionTitle}>Current Session</Text>
          <View style={s.profileInfoRow}>
            <Text style={s.profileInfoLabel}>📅  Login Date</Text>
            <Text style={s.profileInfoValue}>{loginTime}</Text>
          </View>
          <View style={s.profileInfoRow}>
            <Text style={s.profileInfoLabel}>🔒  Auth Method</Text>
            <Text style={s.profileInfoValue}>Staff Credentials</Text>
          </View>
          <View style={s.profileInfoRow}>
            <Text style={s.profileInfoLabel}>📍  Terminal</Text>
            <Text style={s.profileInfoValue}>GATE-01-DESK</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={s.profileLogoutBtn}
          activeOpacity={0.85}
          onPress={() => {
            Alert.alert('Sign Out', `Sign out ${officerName} from Gate 1?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: onLogout },
            ]);
          }}
        >
          <LogoutIcon size={18} color="#FFFFFF" />
          <Text style={s.profileLogoutBtnText}>Sign Out from Security Desk</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ── Main Layout ───────────────────────────────────────────────
  return (
    <SafeAreaView style={s.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FC" />

      {/* Top Header */}
      <View style={s.topHeader}>
        <View style={s.headerLeftCol}>
          <TouchableOpacity style={s.profileAvatarBox} onPress={() => setShowOfficerModal(true)} activeOpacity={0.8}>
            <Text style={s.profileAvatarText}>{officerInitials}</Text>
          </TouchableOpacity>
          <View style={s.greetingCol}>
            <Text style={s.greetingTitle}>Hello, {officerName.split(' ')[0]}!</Text>
            <Text style={s.greetingSub}>Gate 1 Station • Campus-Go</Text>
          </View>
        </View>

        <View style={s.headerRightCol}>
          <TouchableOpacity
            style={s.iconCircleBtn}
            onPress={() => Alert.alert('Station Alerts', 'Campus security database is clear. No active alerts.')}
          >
            <BellIcon size={19} color="#14172C" />
            <View style={s.notificationRedDot} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Screen Content */}
      <View style={s.screenContainer}>
        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'history' && renderHistoryTab()}
        {activeTab === 'arrivals' && renderArrivalsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </View>

      {/* Modern Curved Bottom Navigation Bar with Center Elevated FAB (Reference UI) */}
      <View style={s.bottomNavWrapper}>
        <View style={s.bottomNavRow}>
          {/* Tab 1: Home / Dashboard */}
          <TouchableOpacity
            style={s.navTabItem}
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.8}
          >
            <HomeTabIcon size={22} color={activeTab === 'dashboard' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[s.navTabLabel, activeTab === 'dashboard' && s.navTabLabelActive]}>Home</Text>
            {activeTab === 'dashboard' && <View style={s.navActiveDot} />}
          </TouchableOpacity>

          {/* Tab 2: History (replaces Passes) */}
          <TouchableOpacity
            style={s.navTabItem}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <HistoryTabIcon size={22} color={activeTab === 'history' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[s.navTabLabel, activeTab === 'history' && s.navTabLabelActive]}>History</Text>
            {activeTab === 'history' && <View style={s.navActiveDot} />}
          </TouchableOpacity>

          {/* Center Elevated FAB: Scan / New Pass */}
          <View style={s.centerFabContainer}>
            <TouchableOpacity
              style={s.centerFabButton}
              activeOpacity={0.85}
              onPress={() => setShowScannerModal(true)}
            >
              <QrNavIcon size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Tab 3: Arrivals */}
          <TouchableOpacity
            style={s.navTabItem}
            onPress={() => setActiveTab('arrivals')}
            activeOpacity={0.8}
          >
            <ArrivalsTabIcon size={22} color={activeTab === 'arrivals' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[s.navTabLabel, activeTab === 'arrivals' && s.navTabLabelActive]}>Arrivals</Text>
            {activeTab === 'arrivals' && <View style={s.navActiveDot} />}
          </TouchableOpacity>

          {/* Tab 4: Settings / Profile */}
          <TouchableOpacity
            style={s.navTabItem}
            onPress={() => setActiveTab('settings')}
            activeOpacity={0.8}
          >
            <UserTabIcon size={22} color={activeTab === 'settings' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[s.navTabLabel, activeTab === 'settings' && s.navTabLabelActive]}>Profile</Text>
            {activeTab === 'settings' && <View style={s.navActiveDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals */}
      <ScannerModal
        visible={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onScan={handleScanSuccess}
        tokensList={tokensList}
      />

      <CheckInModal
        visible={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        availableTokens={availableTokens}
        regTokenCode={regTokenCode}
        regFullName={regFullName} setRegFullName={setRegFullName}
        regMobile={regMobile} setRegMobile={setRegMobile}
        regHost={regHost} setRegHost={setRegHost}
        regPurpose={regPurpose} setRegPurpose={setRegPurpose}
        onSubmit={handleCheckInSubmit}
        submittingCheckIn={submittingCheckIn}
      />

      <VisitActionModal
        visit={selectedVisitForAction}
        onClose={() => setSelectedVisitForAction(null)}
        onCheckOut={handleCheckOutConfirm}
        onCheckInScheduled={handleCheckInScheduled}
      />

      <OfficerModal
        visible={showOfficerModal}
        onClose={() => setShowOfficerModal(false)}
        onSync={() => loadData(false)}
        onLogout={() => {
          Alert.alert('Sign Out', 'Sign out of Security Guard Desk?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: onLogout },
          ]);
        }}
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedFilter={selectedFilter}
        onSelectFilter={setSelectedFilter}
        counts={filterCounts}
      />

      <CalendarModal
        visible={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        selectedDate={selectedLogDate}
        onSelectDate={setSelectedLogDate}
      />

      {/* History Calendar Modal */}
      <CalendarModal
        visible={showHistoryCalendarModal}
        onClose={() => setShowHistoryCalendarModal(false)}
        selectedDate={historySelectedDate}
        onSelectDate={setHistorySelectedDate}
        allowAllTime={true}
      />

      {/* History Filter Modal */}
      <FilterModal
        visible={showHistoryFilterModal}
        onClose={() => setShowHistoryFilterModal(false)}
        selectedFilter={historySelectedFilter}
        onSelectFilter={setHistorySelectedFilter}
        counts={historyFilterCounts}
      />

      {/* Arrivals Filter Modal */}
      <FilterModal
        visible={showArrivalsFilterModal}
        onClose={() => setShowArrivalsFilterModal(false)}
        selectedFilter={arrivalsSelectedFilter}
        onSelectFilter={setArrivalsSelectedFilter}
        counts={arrivalsFilterCounts}
      />
    </SafeAreaView>
  );
}
