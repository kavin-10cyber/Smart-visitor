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
  ManifestTabIcon,
  ShieldTabIcon,
  UserTabIcon,
  AlertTriangleIcon,
  CheckOutIcon,
  LogoutIcon,
  FilterSlidersIcon,
} from '../components/AdminIcons';

// Extracted components & styles
import s from '../styles/securityStyles';
import {
  ScannerModal,
  CheckInModal,
  VisitActionModal,
  OfficerModal,
  FilterModal,
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

function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isTodayVisit(v) {
  if (!v) return false;
  // Active visits currently inside the campus are relevant to today
  if (v.status === 'ACTIVE') return true;

  const now = new Date();

  // If scheduled for Today
  if (v.expected_date === 'Today') return true;
  if (v.expected_date) {
    const d = new Date(v.expected_date);
    if (!isNaN(d.getTime()) && isSameDay(d, now)) return true;
  }

  // Check check_in, check_out, or created_at timestamps
  const timestamps = [v.check_in, v.check_out, v.created_at].filter(Boolean);
  for (const t of timestamps) {
    const d = new Date(t);
    if (!isNaN(d.getTime()) && isSameDay(d, now)) return true;
  }

  return false;
}

export default function SecurityPortal({ onLogout }) {
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');

  // Filters & Search
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Only today's visitor logs
  const todayActive = useMemo(() => activeVisits, [activeVisits]);
  const todayScheduled = useMemo(() => scheduledVisits.filter(isTodayVisit), [scheduledVisits]);
  const todayHistory = useMemo(() => historyVisits.filter(isTodayVisit), [historyVisits]);
  const todayTotalCount = todayActive.length + todayScheduled.length + todayHistory.length;

  const todayVipCount = useMemo(
    () => [...todayActive, ...todayScheduled, ...todayHistory].filter(
      (v) => v.is_vip || v.category === 'VIP' || v.purpose?.toLowerCase().includes('vip')
    ).length,
    [todayActive, todayScheduled, todayHistory]
  );

  const filterCounts = useMemo(
    () => ({
      all: todayTotalCount,
      issued: todayScheduled.length,
      inside: todayActive.length,
      exited: todayHistory.length,
      vip: todayVipCount,
    }),
    [todayTotalCount, todayScheduled.length, todayActive.length, todayHistory.length, todayVipCount]
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
      list = todayActive;
    } else if (selectedFilter === 'EXPECTED' || selectedFilter === 'ISSUED') {
      list = todayScheduled;
    } else if (selectedFilter === 'EXITED') {
      list = todayHistory;
    } else if (selectedFilter === 'VIP') {
      list = [...todayActive, ...todayScheduled, ...todayHistory].filter(
        (v) => v.is_vip || v.category === 'VIP' || v.purpose?.toLowerCase().includes('vip')
      );
    } else {
      list = [...todayActive, ...todayScheduled, ...todayHistory];
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
  }, [todayActive, todayScheduled, todayHistory, selectedFilter, selectedCategory, searchQuery]);

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
    const interval = setInterval(() => {
      loadData(true);
    }, 4000);
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

      {/* Quick Actions / Recent Visitors Header with Filter Logo */}
      <View style={s.sectionHeaderRow}>
        <View style={s.sectionTitleRow}>
          <Text style={s.sectionTitle}>Recent Visitors</Text>
          <Text style={s.sectionSubtitle}>Today</Text>
        </View>

        <View style={s.sectionHeaderActions}>
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

          <TouchableOpacity onPress={() => setActiveTab('logs')} activeOpacity={0.7}>
            <Text style={s.sectionViewAll}>See All ({todayTotalCount})</Text>
          </TouchableOpacity>
        </View>
      </View>

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
            {searchQuery ? `No matches for "${searchQuery}"` : 'No visitor records in this category.'}
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

  const renderLogsTab = () => (
    <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent}>
      <Text style={s.tabHeadingTitle}>Gate Manifest Logs</Text>
      <Text style={s.tabHeadingSub}>All visitor entry & exit passes</Text>

      {[...activeVisits, ...scheduledVisits, ...historyVisits].map((v, i) => (
        <TouchableOpacity
          key={v.id || i}
          style={s.logCardItem}
          activeOpacity={0.85}
          onPress={() => setSelectedVisitForAction(v)}
        >
          <View style={s.logCardLeft}>
            <Text style={s.logCardToken}>{v.token_code}</Text>
            <View>
              <Text style={s.logCardName}>{v.full_name}</Text>
              <Text style={s.logCardSub}>{v.address || 'Admin Office'} • {v.purpose || 'Visit'}</Text>
            </View>
          </View>
          <View style={[s.statusPill, { backgroundColor: v.status === 'ACTIVE' ? '#DCFCE7' : '#F1F5F9' }]}>
            <Text style={[s.statusPillText, { color: v.status === 'ACTIVE' ? '#166534' : '#475569' }]}>
              {v.status}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderAccessTab = () => (
    <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent}>
      <Text style={s.tabHeadingTitle}>Gate Turnstile Access</Text>
      <Text style={s.tabHeadingSub}>Gate 1 Entrance Terminal Control</Text>

      <View style={s.turnstileCard}>
        <View style={s.turnstileLeft}>
          <View style={s.turnstileIconBox}>
            <ShieldIcon size={20} color="#6C5CE7" />
          </View>
          <View>
            <Text style={s.turnstileTitle}>Turnstile Gate 1</Text>
            <Text style={s.turnstileSubtitle}>Optical Scanner & Barrier Relay Active</Text>
          </View>
        </View>
        <View style={[s.statusPill, { backgroundColor: '#DCFCE7' }]}>
          <View style={[s.statusDot, { backgroundColor: '#22C55E' }]} />
          <Text style={[s.statusPillText, { color: '#166534' }]}>ONLINE</Text>
        </View>
      </View>

      <View style={s.gateControlCard}>
        <Text style={s.gateControlTitle}>Manual Emergency Gate Release</Text>
        <Text style={s.gateControlSub}>Momentarily release turnstile magnetic lock for 10 seconds.</Text>
        <TouchableOpacity
          style={s.unlockTurnstileBtn}
          onPress={() => Alert.alert('Turnstile Relay', 'Turnstile Gate 1 barrier unlocked for 10 seconds.')}
        >
          <Text style={s.unlockTurnstileBtnText}>🔓 Unlock Gate Barrier (10s)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderSettingsTab = () => (
    <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent}>
      <Text style={s.tabHeadingTitle}>Station Settings</Text>
      <Text style={s.tabHeadingSub}>Gate 1 Entrance Security Terminal</Text>

      <View style={s.settingsSection}>
        {[
          { label: 'Security Station', val: 'GATE-01-DESK' },
          { label: 'Guard Station', val: 'Security Staff (DEMO)' },
          { label: 'Cloud Database', val: 'Supabase PostgreSQL' },
          { label: 'System Mode', val: 'Direct Cloud (Serverless)' },
        ].map(({ label, val }) => (
          <View key={label} style={s.settingsRow}>
            <Text style={s.settingsLabel}>{label}</Text>
            <Text style={s.settingsValue}>{val}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={s.logoutBtnFull}
        onPress={() => {
          Alert.alert('Sign Out', 'Sign out from Security Guard Desk?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: onLogout },
          ]);
        }}
      >
        <LogoutIcon size={18} color="#E11D48" />
        <Text style={s.logoutBtnFullText}>Sign Out from Security Desk</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Main Layout ───────────────────────────────────────────────
  return (
    <SafeAreaView style={s.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FC" />

      {/* Top Header (Matching Screen 1 of Reference) */}
      <View style={s.topHeader}>
        <View style={s.headerLeftCol}>
          <TouchableOpacity style={s.profileAvatarBox} onPress={() => setShowOfficerModal(true)} activeOpacity={0.8}>
            <Text style={s.profileAvatarText}>SO</Text>
          </TouchableOpacity>
          <View style={s.greetingCol}>
            <Text style={s.greetingTitle}>Hello, Security Officer!</Text>
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
        {activeTab === 'logs' && renderLogsTab()}
        {activeTab === 'access' && renderAccessTab()}
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

          {/* Tab 2: Passes / Logs */}
          <TouchableOpacity
            style={s.navTabItem}
            onPress={() => setActiveTab('logs')}
            activeOpacity={0.8}
          >
            <ManifestTabIcon size={22} color={activeTab === 'logs' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[s.navTabLabel, activeTab === 'logs' && s.navTabLabelActive]}>Passes</Text>
            {activeTab === 'logs' && <View style={s.navActiveDot} />}
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

          {/* Tab 3: Access / Turnstile */}
          <TouchableOpacity
            style={s.navTabItem}
            onPress={() => setActiveTab('access')}
            activeOpacity={0.8}
          >
            <ShieldTabIcon size={22} color={activeTab === 'access' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[s.navTabLabel, activeTab === 'access' && s.navTabLabelActive]}>Access</Text>
            {activeTab === 'access' && <View style={s.navActiveDot} />}
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
    </SafeAreaView>
  );
}
