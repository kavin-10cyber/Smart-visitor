import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { api } from '../services/api';
import {
  BellIcon,
  QRIcon,
  GridIcon,
  QrTabIcon,
  IssueTokenTabIcon,
  BarChartIcon,
  UserTabIcon,
  LogoutIcon,
  SearchIcon,
  CloseIcon,
  FilterIcon,
  ManifestTabIcon,
  FilterSlidersIcon,
  ArrowUpRightIcon,
  PlusIcon,
  QrNavIcon,
  CrownIcon,
  WrenchIcon,
  BuildingIcon,
  HomeTabIcon,
  ShieldTabIcon,
  TotalPassIcon,
} from '../components/AdminIcons';

// Extracted components
import VisitorCard from '../components/admin/VisitorCard';
import VisitorDetailsModal from '../components/admin/VisitorDetailsModal';
import QRPreviewModal from '../components/admin/QRPreviewModal';
import IssueScheduledTokenModal from '../components/admin/IssueScheduledTokenModal';
import RescheduleModal from '../components/admin/RescheduleModal';
import NotificationsModal from '../components/admin/NotificationsModal';
import ProfileMenuModal from '../components/admin/ProfileMenuModal';
import LiveHeaderClock from '../components/common/LiveHeaderClock';

// Styles & helpers
import styles from '../styles/adminStyles';

function ManifestHeader() {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>Campus Manifest</Text>
    </View>
  );
}

export default function AdminPortal({ onLogout }) {
  // ── Navigation ──────────────────────────────────────────────
  const [activeNavTab, setActiveNavTab] = useState('dashboard');

  // ── Dashboard Filters ────────────────────────────────────────
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Data ─────────────────────────────────────────────────────
  const [tokens, setTokens] = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);
  const [scheduledVisits, setScheduledVisits] = useState([]);
  const [historyVisits, setHistoryVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);

  // ── Modals ───────────────────────────────────────────────────
  const [selectedVisitorDetails, setSelectedVisitorDetails] = useState(null);
  const [previewToken, setPreviewToken] = useState(null);
  const [showIssueTokenModal, setShowIssueTokenModal] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [reschedulingLoading, setReschedulingLoading] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // ── Issue Token State ────────────────────────────────────────
  const [issuingLoading, setIssuingLoading] = useState(false);

  // ── Derived values ───────────────────────────────────────────
  const availableTokens = useMemo(() => tokens.filter((t) => t.status === 'AVAILABLE'), [tokens]);
  const inUseTokens = useMemo(() => tokens.filter((t) => t.status === 'IN USE'), [tokens]);
  const availableCount = availableTokens.length;
  const totalTokensCount = tokens.length;
  const maxCapacity = Math.max(totalTokensCount, 100);
  const capacityPercent = Math.min(100, Math.round((availableCount / (maxCapacity || 1)) * 100));
  const totalTodayCount = activeVisits.length + scheduledVisits.length + historyVisits.length;

  const hasNotificationAlerts = useMemo(() => {
    return (
      activeVisits.some((v) => v.is_vip || v.category === 'VIP') ||
      availableCount <= 5 ||
      scheduledVisits.some((v) => v.expected_date === 'Today')
    );
  }, [activeVisits, availableCount, scheduledVisits]);

  const allVisitsCombined = useMemo(
    () => [...activeVisits, ...scheduledVisits, ...historyVisits],
    [activeVisits, scheduledVisits, historyVisits]
  );

  const filterCounts = useMemo(() => {
    let vip = 0;
    let contractors = 0;
    for (let i = 0; i < allVisitsCombined.length; i++) {
      const v = allVisitsCombined[i];
      if (
        v.is_vip ||
        v.category === 'VIP' ||
        (v.purpose && v.purpose.toLowerCase().includes('vip')) ||
        (v.address && v.address.toLowerCase().includes('vip'))
      ) {
        vip++;
      }
      if (
        v.category === 'Contractor' ||
        v.category === 'Utility' ||
        (v.purpose &&
          (v.purpose.toLowerCase().includes('contract') ||
            v.purpose.toLowerCase().includes('atm') ||
            v.purpose.toLowerCase().includes('utility') ||
            v.purpose.toLowerCase().includes('maintenance') ||
            v.purpose.toLowerCase().includes('delivery')))
      ) {
        contractors++;
      }
    }
    return {
      all: allVisitsCombined.length,
      active: activeVisits.length,
      vip,
      contractors,
      history: historyVisits.length,
    };
  }, [allVisitsCombined, activeVisits.length, historyVisits.length]);

  const filteredVisits = useMemo(() => {
    let list = [];
    if (selectedFilter === 'ACTIVE') {
      list = activeVisits;
    } else if (selectedFilter === 'SCHEDULED') {
      list = scheduledVisits;
    } else if (selectedFilter === 'EXITED' || selectedFilter === 'HISTORY') {
      list = historyVisits;
    } else if (selectedFilter === 'VIP') {
      list = allVisitsCombined.filter(
        (v) =>
          v.is_vip ||
          v.category === 'VIP' ||
          (v.purpose && v.purpose.toLowerCase().includes('vip')) ||
          (v.address && v.address.toLowerCase().includes('vip'))
      );
    } else if (selectedFilter === 'CONTRACTORS') {
      list = allVisitsCombined.filter(
        (v) =>
          v.category === 'Contractor' ||
          v.category === 'Utility' ||
          (v.purpose && v.purpose.toLowerCase().includes('contract')) ||
          (v.purpose && v.purpose.toLowerCase().includes('atm')) ||
          (v.purpose && v.purpose.toLowerCase().includes('utility')) ||
          (v.purpose && v.purpose.toLowerCase().includes('maintenance')) ||
          (v.purpose && v.purpose.toLowerCase().includes('delivery'))
      );
    } else if (selectedFilter === 'GENERAL') {
      list = allVisitsCombined.filter(
        (v) =>
          v.category === 'General' ||
          (!v.is_vip && v.category !== 'VIP' && v.category !== 'Contractor')
      );
    } else if (selectedFilter === 'VEHICLES') {
      list = allVisitsCombined.filter(
        (v) => v.vehicle_no || (v.purpose && v.purpose.toLowerCase().includes('veh'))
      );
    } else {
      list = allVisitsCombined;
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        (item.full_name && item.full_name.toLowerCase().includes(q)) ||
        (item.token_code && item.token_code.toLowerCase().includes(q)) ||
        (item.mobile && item.mobile.toLowerCase().includes(q)) ||
        (item.company && item.company.toLowerCase().includes(q)) ||
        (item.purpose && item.purpose.toLowerCase().includes(q)) ||
        (item.address && item.address.toLowerCase().includes(q))
    );
  }, [selectedFilter, searchQuery, activeVisits, scheduledVisits, historyVisits, allVisitsCombined]);

  // ── Data Loading ─────────────────────────────────────────────
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tokenRes, visitRes] = await Promise.all([
        api.getTokens().catch(() => ({ success: false, tokens: [] })),
        api.getVisits().catch(() => ({ success: false, activeVisits: [], scheduledVisits: [], historyVisits: [] })),
      ]);
      if (tokenRes?.success) setTokens(tokenRes.tokens || []);
      if (visitRes?.success) {
        setActiveVisits(visitRes.activeVisits || []);
        setScheduledVisits(visitRes.scheduledVisits || []);
        setHistoryVisits(visitRes.historyVisits || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
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

  // ── Handlers ─────────────────────────────────────────────────
  const handleGenerateNewQR = useCallback(async () => {
    setGeneratingToken(true);
    try {
      const res = await api.generateToken();
      if (res.success && res.token) {
        setPreviewToken(res.token);
        await loadData(true);
      } else {
        Alert.alert('Error', res.message || 'Could not generate token');
      }
    } catch {
      Alert.alert('Connection Error', 'Failed to communicate with backend server');
    } finally {
      setGeneratingToken(false);
    }
  }, []);

  const handleCheckOut = useCallback((visit) => {
    Alert.alert(
      'Confirm Check-Out',
      `Check out visitor ${visit.full_name} with Token ${visit.token_code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check Out',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.checkOutVisitor(visit.token_code);
              if (res.success) {
                Alert.alert('Success', `Visitor ${visit.full_name} checked out successfully.`);
                setSelectedVisitorDetails((current) => (current?.id === visit.id ? null : current));
                loadData(true);
              } else {
                Alert.alert('Checkout Failed', res.message || 'Error checking out visitor');
              }
            } catch {
              Alert.alert('Error', 'Failed to check out visitor');
            }
          },
        },
      ]
    );
  }, []);

  const handleCheckInScheduled = useCallback(async (visit) => {
    try {
      const res = await api.checkInScheduledVisit(visit);
      if (res.success) {
        Alert.alert('Check-In Recorded', `Pass ${visit.token_code} checked in. ${visit.full_name} is now INSIDE campus.`);
        loadData(true);
      } else {
        Alert.alert('Check-In Failed', res.message || 'Could not check in scheduled pass');
      }
    } catch (err) {
      Alert.alert('Check-In Error', err.message || 'Failed to check in pass');
    }
  }, []);

  const handleIssueScheduledSubmit = useCallback(async (formData) => {
    if (!formData.full_name || !formData.mobile) {
      Alert.alert('Required Fields', 'Please enter visitor full name and mobile number.');
      return;
    }
    setIssuingLoading(true);
    try {
      const res = await api.checkInVisitor(formData);
      if (res.success) {
        setShowIssueTokenModal(false);
        await loadData(true);

        // Professional SMS / WhatsApp notification message
        const smsMessage = `Smart Campus Pass: Hello ${formData.full_name}, your pass has been pre-approved for ${formData.expected_date} (${formData.time_window}). Assigned Badge: ${formData.token_code} at ${formData.gate}. Host: ${formData.address}. Please present this badge code at the gate.`;

        Alert.alert(
          '✅ Pass Issued Successfully',
          `Badge ${formData.token_code} assigned to ${formData.full_name}.\n\nDate: ${formData.expected_date}\nWindow: ${formData.time_window}\nGate: ${formData.gate}`,
          [
            {
              text: 'Send WhatsApp',
              onPress: () => {
                const waUrl = `whatsapp://send?phone=+91${formData.mobile}&text=${encodeURIComponent(smsMessage)}`;
                Linking.openURL(waUrl).catch(() => {
                  Linking.openURL(`https://wa.me/91${formData.mobile}?text=${encodeURIComponent(smsMessage)}`).catch(() => {
                    Alert.alert('Notice', 'Could not open WhatsApp on this device.');
                  });
                });
              },
            },
            {
              text: 'Send SMS',
              onPress: () => {
                Linking.openURL(`sms:${formData.mobile}?body=${encodeURIComponent(smsMessage)}`).catch(() => {
                  Alert.alert('Notice', 'Could not open SMS on this device.');
                });
              },
            },
            { text: 'Done', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Issue Failed', res.message || 'Could not issue scheduled token pass');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit scheduled token');
    } finally {
      setIssuingLoading(false);
    }
  }, []);

  const handleCancelToken = useCallback((visit) => {
    Alert.alert(
      'Cancel Scheduled Token',
      `Cancel pass for ${visit.full_name} and return Token ${visit.token_code} to available fleet?`,
      [
        { text: 'Keep Pass', style: 'cancel' },
        {
          text: 'Yes, Cancel Token',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.cancelVisit(visit.token_code, visit.id);
              if (res.success) {
                Alert.alert('Cancelled', `Token ${visit.token_code} returned to fleet.`);
                loadData(true);
              } else {
                Alert.alert('Failed', res.message || 'Could not cancel token pass');
              }
            } catch {
              Alert.alert('Error', 'Failed to cancel token pass');
            }
          },
        },
      ]
    );
  }, []);

  const handleRescheduleConfirm = useCallback(async (visit, newDate, newTime) => {
    setReschedulingLoading(true);
    try {
      const res = await api.rescheduleVisit(visit.token_code, newDate, newTime, visit.id);
      if (res.success) {
        Alert.alert('Rescheduled', `Token ${visit.token_code} rescheduled for ${newDate} (${newTime}).`);
        setRescheduleTarget(null);
        loadData(true);
      } else {
        Alert.alert('Failed', res.message || 'Could not reschedule visit');
      }
    } catch {
      Alert.alert('Error', 'Failed to reschedule visit');
    } finally {
      setReschedulingLoading(false);
    }
  }, []);

  const handleCallVisitor = useCallback((mobile) => {
    if (!mobile) return;
    Linking.openURL(`tel:${mobile}`).catch(() =>
      Alert.alert('Unavailable', `Could not initiate phone call to ${mobile}`)
    );
  }, []);

  const handleSmsVisitor = useCallback((mobile) => {
    if (!mobile) return;
    Linking.openURL(`sms:${mobile}`).catch(() =>
      Alert.alert('Unavailable', `Could not send SMS to ${mobile}`)
    );
  }, []);

  // ── Tab Renders ───────────────────────────────────────────────
  // ── Search & Filter block (reused in Dashboard + Manifest) ────
  const renderSearchAndFilterBlock = () => (
    <View style={searchFilterStyles.block}>
      <View style={searchFilterStyles.searchRow}>
        <SearchIcon size={16} color="#94a3b8" />
        <TextInput
          style={searchFilterStyles.input}
          placeholder="Search visitor, phone, company…"
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="never"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={searchFilterStyles.clearBtn}
          >
            <CloseIcon size={15} color="#94a3b8" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => setShowFilters(prev => !prev)}
          activeOpacity={0.7}
          style={[
            searchFilterStyles.filterBtn,
            (showFilters || selectedFilter !== 'ALL') && searchFilterStyles.filterBtnActive,
          ]}
        >
          <FilterIcon
            size={15}
            color={showFilters || selectedFilter !== 'ALL' ? '#2563eb' : '#64748b'}
          />
          {selectedFilter !== 'ALL' && (
            <View style={searchFilterStyles.filterActiveDot} />
          )}
        </TouchableOpacity>
      </View>
      {showFilters && (
        <>
          <View style={searchFilterStyles.divider} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={searchFilterStyles.chipsRow}
          >
            {[
              { key: 'ALL', label: 'All', count: filterCounts.all },
              { key: 'ACTIVE', label: 'Active', count: filterCounts.active },
              { key: 'VIP', label: 'VIP', count: filterCounts.vip },
              { key: 'CONTRACTORS', label: 'Contractors', count: filterCounts.contractors },
              { key: 'HISTORY', label: 'Completed', count: filterCounts.history },
            ].map(({ key, label, count }) => {
              const active = selectedFilter === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[searchFilterStyles.chip, active && searchFilterStyles.chipActive]}
                  onPress={() => setSelectedFilter(key)}
                  activeOpacity={0.75}
                >
                  <Text style={[searchFilterStyles.chipText, active && searchFilterStyles.chipTextActive]}>
                    {label}
                  </Text>
                  <View style={[searchFilterStyles.chipCount, active && searchFilterStyles.chipCountActive]}>
                    <Text style={[searchFilterStyles.chipCountText, active && searchFilterStyles.chipCountTextActive]}>
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );

  const renderDashboardTab = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C5CE7']} tintColor="#6C5CE7" />
      }
    >
      {/* Search Bar with Filter Sliders Icon (Reference UI) */}
      <View style={styles.searchContainer}>
        <SearchIcon size={18} color="#6C5CE7" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search visitor, badge, mobile..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchFilterBtn}>
            <CloseIcon size={16} color="#94A3B8" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.searchFilterBtn}
            onPress={() => setSelectedFilter('ALL')}
          >
            <FilterSlidersIcon size={18} color="#667085" />
          </TouchableOpacity>
        )}
      </View>

      {/* Featured Vibrant Purple Hero Card (Reference UI Screen 1) */}
      <View style={styles.heroCard}>
        <View style={styles.heroDecorCircle1} />
        <View style={styles.heroDecorCircle2} />

        <View style={styles.heroTopRow}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroShieldIconBox}>
              <TotalPassIcon size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.heroCategoryTitle}>Campus Pass Control</Text>
              <Text style={styles.heroCategorySub}>Executive Command • Real-time Sync</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.heroArrowBtn}
            activeOpacity={0.8}
            onPress={() => setShowIssueTokenModal(true)}
          >
            <ArrowUpRightIcon size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroContentRow}>
          <View style={styles.heroInfoCol}>
            <Text style={styles.heroInfoLabel}>Active Campus Passes</Text>
            <Text style={styles.heroInfoValue}>{activeVisits.length} Visitors Inside</Text>
            <Text style={styles.heroInfoSub}>
              {availableCount} Badges Available • {totalTodayCount} Total Today
            </Text>
          </View>

          <TouchableOpacity
            style={styles.heroActionBtn}
            activeOpacity={0.85}
            onPress={() => setShowIssueTokenModal(true)}
          >
            <Text style={styles.heroActionBtnText}>+ Issue Pass</Text>
            <ArrowUpRightIcon size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Strip Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Visitor Categories</Text>
      </View>

      <View style={styles.categoryScrollRow}>
        {[
          { key: 'VIP', label: 'VIP Pass', Icon: CrownIcon, bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
          { key: 'CONTRACTORS', label: 'Contractor', Icon: WrenchIcon, bg: '#FFE8D6', text: '#D97706', border: '#FED7AA' },
          { key: 'GENERAL', label: 'General', Icon: BuildingIcon, bg: '#F2EBFE', text: '#7C3AED', border: '#DDD6FE' },
        ].map(({ key, label, Icon, bg, text, border }) => {
          const isSelected = selectedFilter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.categoryCard,
                { backgroundColor: isSelected ? text : bg, borderColor: border },
              ]}
              onPress={() => setSelectedFilter(isSelected ? 'ALL' : key)}
              activeOpacity={0.8}
            >
              <View style={[styles.categoryIconBox, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#FFFFFF' }]}>
                <Icon size={20} color={isSelected ? '#FFFFFF' : text} />
              </View>
              <Text style={[styles.categoryLabel, { color: isSelected ? '#FFFFFF' : text }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Actions / Recent Visitors Header */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recent Visitors</Text>
        <TouchableOpacity onPress={() => setActiveNavTab('manifest')}>
          <Text style={styles.sectionViewAll}>See All ({totalTodayCount})</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
        {[
          { key: 'ACTIVE', label: 'Inside', count: activeVisits.length },
          { key: 'SCHEDULED', label: 'Issued Passes', count: scheduledVisits.length },
          { key: 'EXITED', label: 'Exited', count: historyVisits.length },
          { key: 'VIP', label: 'VIP Pass', count: filterCounts.vip },
          { key: 'ALL', label: 'All Cards', count: allVisitsCombined.length },
        ].map(({ key, label, count }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, selectedFilter === key && styles.filterChipActive]}
            onPress={() => setSelectedFilter(key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, selectedFilter === key && styles.filterChipTextActive]}>{label}</Text>
            {count !== null && (
              <View style={[styles.filterCountBadge, selectedFilter === key && styles.filterCountBadgeActive]}>
                <Text style={[styles.filterCountText, selectedFilter === key && styles.filterCountTextActive]}>{count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filteredVisits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No visitors found</Text>
          <Text style={styles.emptyStateSub}>
            {searchQuery ? `No results for "${searchQuery}"` : 'No visitor records in this category.'}
          </Text>
        </View>
      ) : (
        filteredVisits.slice(0, 10).map((item, index) => (
          <VisitorCard
            key={item.id || item.token_code || index}
            item={item}
            index={index}
            onCheckInScheduled={handleCheckInScheduled}
            onCheckOut={handleCheckOut}
            onReschedule={setRescheduleTarget}
            onCancelToken={handleCancelToken}
            onDetails={setSelectedVisitorDetails}
            onCall={handleCallVisitor}
          />
        ))
      )}
    </ScrollView>
  );

  // ── Manifest Tab: Today's Campus Manifest (full screen) ───────
  const renderManifestTab = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C5CE7']} tintColor="#6C5CE7" />
      }
    >
      {/* Header */}
      <View style={navStyles.manifestTabHeader}>
        <View>
          <Text style={navStyles.manifestTabTitle}>Today's Campus Manifest</Text>
          <Text style={navStyles.manifestTabSub}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <View style={navStyles.manifestTabCountBox}>
          <Text style={navStyles.manifestTabCountNum}>{allVisitsCombined.length}</Text>
          <Text style={navStyles.manifestTabCountLabel}>entries</Text>
        </View>
      </View>

      {/* Summary row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={navStyles.manifestSummaryRow}>
        {[
          { label: 'Active', count: activeVisits.length, color: '#22c55e', bg: '#dcfce7' },
          { label: 'Scheduled', count: scheduledVisits.length, color: '#f59e0b', bg: '#fef3c7' },
          { label: 'Completed', count: historyVisits.length, color: '#64748b', bg: '#f1f5f9' },
          { label: 'VIP', count: filterCounts.vip, color: '#6C5CE7', bg: '#F4F0FF' },
        ].map(({ label, count, color, bg }) => (
          <View key={label} style={[navStyles.manifestSummaryChip, { backgroundColor: bg }]}>
            <Text style={[navStyles.manifestSummaryCount, { color }]}>{count}</Text>
            <Text style={[navStyles.manifestSummaryLabel, { color }]}>{label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Search + Filter */}
      {renderSearchAndFilterBlock()}

      <ManifestHeader />

      {filteredVisits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No visitors found</Text>
          <Text style={styles.emptyStateSub}>
            {searchQuery ? `No results for "${searchQuery}"` : 'No visitor records for today.'}
          </Text>
        </View>
      ) : (
        filteredVisits.map((item, index) => (
          <VisitorCard
            key={item.id || item.token_code || index}
            item={item}
            index={index}
            onCheckOut={handleCheckOut}
            onReschedule={setRescheduleTarget}
            onCancelToken={handleCancelToken}
            onDetails={setSelectedVisitorDetails}
            onCall={handleCallVisitor}
          />
        ))
      )}
    </ScrollView>
  );

  const renderTokensTab = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.tabHeaderRow}>
        <View>
          <Text style={styles.tabHeaderTitle}>QR Token Inventory</Text>
          <Text style={styles.tabHeaderSub}>
            {availableCount} Available • {inUseTokens.length} In-Use • {tokens.length} Total
          </Text>
        </View>
        <TouchableOpacity style={styles.tabHeaderActionBtn} onPress={handleGenerateNewQR} disabled={generatingToken}>
          <Text style={styles.tabHeaderActionBtnText}>+ New Token</Text>
        </TouchableOpacity>
      </View>

      {tokens.map((token) => {
        const isAvail = token.status === 'AVAILABLE';
        return (
          <TouchableOpacity
            key={token.id || token.token_code}
            style={styles.tokenListItem}
            activeOpacity={0.85}
            onPress={() => setPreviewToken(token)}
          >
            <View style={styles.tokenListLeft}>
              <View style={[styles.tokenListQrIconBox, isAvail ? styles.qrBoxAvail : styles.qrBoxInUse]}>
                <QRIcon size={22} color={isAvail ? '#2563eb' : '#f59e0b'} />
              </View>
              <View style={styles.tokenListInfo}>
                <Text style={styles.tokenListCode}>{token.token_code}</Text>
                <Text style={styles.tokenListSub}>
                  {isAvail ? 'Ready for assignment' : 'Assigned to active visitor'}
                </Text>
              </View>
            </View>
            <View style={[styles.statusPill, isAvail ? styles.statusPillInside : styles.statusPillAmber]}>
              <Text style={[styles.statusPillText, isAvail ? styles.statusPillTextInside : styles.statusPillTextAmber]}>
                {token.status}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderAnalyticsTab = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.tabHeaderTitle}>Campus Traffic Analytics</Text>
      <Text style={styles.tabHeaderSub}>Real-time occupancy and visitor patterns</Text>

      <View style={styles.analyticsStatsGrid}>
        {[
          { number: activeVisits.length, label: 'Current Occupancy' },
          { number: totalTodayCount, label: 'Total Passes Today' },
          { number: '42m', label: 'Avg Visit Duration' },
          { number: '11:30 AM', label: 'Peak Arrival Hour' },
        ].map(({ number, label }) => (
          <View key={label} style={styles.analyticsStatBox}>
            <Text style={styles.analyticsStatNumber}>{number}</Text>
            <Text style={styles.analyticsStatLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.analyticsSectionCard}>
        <Text style={styles.analyticsSectionCardTitle}>Token Fleet Health</Text>
        <View style={styles.capacityBarLarge}>
          <View style={[styles.capacityFillInUse, { flex: Math.max(1, inUseTokens.length) }]} />
          <View style={[styles.capacityFillAvail, { flex: Math.max(1, availableTokens.length) }]} />
        </View>
        <View style={styles.capacityLegendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.legendText}>In-Use ({inUseTokens.length})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
            <Text style={styles.legendText}>Available ({availableTokens.length})</Text>
          </View>
        </View>
      </View>

      <View style={styles.analyticsSectionCard}>
        <Text style={styles.analyticsSectionCardTitle}>Visit Categories Breakdown</Text>
        {[
          { name: 'Admissions & Enquiries', pct: '45%', color: '#2563eb' },
          { name: 'Campus Tours & Visits', pct: '30%', color: '#8b5cf6' },
          { name: 'Deliveries & Contractors', pct: '25%', color: '#10b981' },
        ].map(({ name, pct, color }) => (
          <View key={name}>
            <View style={styles.categoryRowItem}>
              <Text style={styles.categoryName}>{name}</Text>
              <Text style={styles.categoryPercent}>{pct}</Text>
            </View>
            <View style={styles.categoryBar}>
              <View style={[styles.categoryBarFill, { width: pct, backgroundColor: color }]} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderProfileTab = () => (
    <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
      <View style={styles.profileHeroCard}>
        <View style={styles.profileAvatarLarge}>
          <UserTabIcon size={36} color="#ffffff" />
        </View>
        <Text style={styles.profileName}>Campus Administrator</Text>
        <Text style={styles.profileRole}>Super Admin • Security Level 1</Text>
        <View style={styles.profileStatusBadge}>
          <View style={styles.statusDotInside} />
          <Text style={styles.profileStatusText}>System Live & Syncing</Text>
        </View>
      </View>

      <View style={styles.profileDetailsCard}>
        <Text style={styles.profileSectionTitle}>System Architecture</Text>
        {[
          { key: 'Database Provider', val: 'Supabase PostgreSQL Cloud' },
          { key: 'Architecture', val: 'Serverless Direct Client' },
          { key: 'App Engine', val: 'React Native Bare CLI' },
          { key: 'QR Standard', val: 'Vector SVG (FastScan)' },
        ].map(({ key, val }) => (
          <View key={key} style={styles.profileItemRow}>
            <Text style={styles.profileItemKey}>{key}</Text>
            <Text style={styles.profileItemVal} numberOfLines={1}>{val}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.refreshSyncBtn}
        onPress={() => {
          loadData(false);
          Alert.alert('Database Refreshed', 'Successfully fetched latest state from Supabase.');
        }}
      >
        <Text style={styles.refreshSyncBtnText}>↻ Force Supabase Sync</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutFullBtn}
        onPress={() => {
          Alert.alert('Sign Out', 'Are you sure you want to log out of Admin Portal?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: onLogout },
          ]);
        }}
      >
        <LogoutIcon size={18} color="#ef4444" />
        <Text style={styles.logoutFullBtnText}>Sign Out from Portal</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Main Render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FC" />

      {/* Top Header (Matching Screen 1 of Reference) */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeftCol}>
          <TouchableOpacity
            style={styles.profileAvatarBox}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.profileAvatarText}>AD</Text>
          </TouchableOpacity>
          <View style={styles.greetingCol}>
            <Text style={styles.greetingTitle}>Hello, Administrator!</Text>
            <Text style={styles.greetingSub}>Campus Visitor Portal • Super Admin</Text>
          </View>
        </View>

        <View style={styles.headerRightCol}>
          <TouchableOpacity
            style={styles.iconCircleBtn}
            onPress={() => setShowNotificationsModal(true)}
            activeOpacity={0.8}
          >
            <BellIcon size={19} color="#14172C" />
            {hasNotificationAlerts && <View style={styles.notificationRedDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Content */}
      <View style={styles.screenContainer}>
        {activeNavTab === 'dashboard' && renderDashboardTab()}
        {activeNavTab === 'manifest' && renderManifestTab()}
        {activeNavTab === 'tokens' && renderTokensTab()}
        {activeNavTab === 'analytics' && renderAnalyticsTab()}
        {activeNavTab === 'profile' && renderProfileTab()}
      </View>

      {/* ── Modern Curved Bottom Navigation Bar with Center Elevated FAB (Reference UI) ── */}
      <View style={styles.bottomNavWrapper}>
        <View style={styles.bottomNavRow}>
          {/* Tab 1: Home / Dashboard */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => {
              setActiveNavTab('dashboard');
              setSearchQuery('');
              setSelectedFilter('ALL');
            }}
            activeOpacity={0.8}
          >
            <HomeTabIcon size={22} color={activeNavTab === 'dashboard' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[styles.navTabLabel, activeNavTab === 'dashboard' && styles.navTabLabelActive]}>Home</Text>
            {activeNavTab === 'dashboard' && <View style={styles.navActiveDot} />}
          </TouchableOpacity>

          {/* Tab 2: Manifest */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => {
              setActiveNavTab('manifest');
              setSearchQuery('');
              setSelectedFilter('ALL');
            }}
            activeOpacity={0.8}
          >
            <ManifestTabIcon size={22} color={activeNavTab === 'manifest' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[styles.navTabLabel, activeNavTab === 'manifest' && styles.navTabLabelActive]}>Manifest</Text>
            {activeNavTab === 'manifest' && <View style={styles.navActiveDot} />}
          </TouchableOpacity>

          {/* Center Elevated FAB: Issue Pass / Token */}
          <View style={styles.centerFabContainer}>
            <TouchableOpacity
              style={styles.centerFabButton}
              activeOpacity={0.85}
              onPress={() => setShowIssueTokenModal(true)}
            >
              <QrNavIcon size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Tab 3: Tokens */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => {
              setActiveNavTab('tokens');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            <QrTabIcon size={22} color={activeNavTab === 'tokens' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[styles.navTabLabel, activeNavTab === 'tokens' && styles.navTabLabelActive]}>Tokens</Text>
            {activeNavTab === 'tokens' && <View style={styles.navActiveDot} />}
          </TouchableOpacity>

          {/* Tab 4: Analytics */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => {
              setActiveNavTab('analytics');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            <BarChartIcon size={22} color={activeNavTab === 'analytics' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[styles.navTabLabel, activeNavTab === 'analytics' && styles.navTabLabelActive]}>Analytics</Text>
            {activeNavTab === 'analytics' && <View style={styles.navActiveDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Modals ────────────────────────────────────────────── */}
      <VisitorDetailsModal
        visitor={selectedVisitorDetails}
        onClose={() => setSelectedVisitorDetails(null)}
        onCall={handleCallVisitor}
        onSms={handleSmsVisitor}
        onCheckOut={handleCheckOut}
      />

      <QRPreviewModal
        token={previewToken}
        onClose={() => setPreviewToken(null)}
      />

      <IssueScheduledTokenModal
        visible={showIssueTokenModal}
        onClose={() => setShowIssueTokenModal(false)}
        availableTokens={availableTokens}
        onSubmit={handleIssueScheduledSubmit}
        isLoading={issuingLoading}
      />

      <RescheduleModal
        visible={!!rescheduleTarget}
        visit={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={handleRescheduleConfirm}
        isLoading={reschedulingLoading}
      />

      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        activeVisits={activeVisits}
        scheduledVisits={scheduledVisits}
        historyVisits={historyVisits}
        availableCount={availableCount}
        totalTokensCount={totalTokensCount}
      />

      <ProfileMenuModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onNavigate={setActiveNavTab}
        onRefresh={() => loadData(false)}
        onLogout={onLogout}
      />
    </SafeAreaView>
  );
}

// ── Unified Search + Filter Block Styles ─────────────────────────
const searchFilterStyles = {
  block: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 4,
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: '#F4F0FF',
    borderColor: '#E5DDFF',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6C5CE7',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#F4F0FF',
    borderColor: '#6C5CE7',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#6C5CE7',
  },
  chipCount: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    minWidth: 18,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chipCountActive: {
    backgroundColor: '#E5DDFF',
  },
  chipCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  chipCountTextActive: {
    color: '#6C5CE7',
  },
};

const navStyles = {
  dashManifestBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dashManifestBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dashManifestBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  dashManifestBannerBadge: {
    backgroundColor: '#F4F0FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5DDFF',
  },
  dashManifestBannerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6C5CE7',
  },
  dashManifestBannerBtn: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dashManifestBannerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  manifestTabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  manifestTabTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  manifestTabSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  manifestTabCountBox: {
    backgroundColor: '#F4F0FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5DDFF',
  },
  manifestTabCountNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6C5CE7',
  },
  manifestTabCountLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6C5CE7',
    textTransform: 'uppercase',
  },
  manifestSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  manifestSummaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  manifestSummaryCount: {
    fontSize: 13,
    fontWeight: '800',
  },
  manifestSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  navWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 12,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 99,
  },
  navContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navItemAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -24,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  navIconWrap: {
    width: 32,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  navIconWrapActive: {
    backgroundColor: '#F4F0FF',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  navLabelActive: {
    color: '#6C5CE7',
    fontWeight: '800',
  },
};
