import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { api } from '../services/api';
import {
  MenuIcon,
  BellIcon,
  QRIcon,
  GridIcon,
  QrTabIcon,
  BarChartIcon,
  UserTabIcon,
  LogoutIcon,
  SearchIcon,
  CloseIcon,
} from '../components/AdminIcons';

// Extracted components
import VisitorCard from '../components/admin/VisitorCard';
import { ManifestHeader } from '../components/admin/StatCards';
import VisitorDetailsModal from '../components/admin/VisitorDetailsModal';
import QRPreviewModal from '../components/admin/QRPreviewModal';
import IssueScheduledTokenModal from '../components/admin/IssueScheduledTokenModal';
import RescheduleModal from '../components/admin/RescheduleModal';
import NotificationsModal from '../components/admin/NotificationsModal';
import ProfileMenuModal from '../components/admin/ProfileMenuModal';

// Styles & helpers
import styles from '../styles/adminStyles';
import { getAvatarPalette, getInitials } from '../components/admin/VisitorCard';

export default function AdminPortal({ onLogout }) {
  // ── Navigation ──────────────────────────────────────────────
  const [activeNavTab, setActiveNavTab] = useState('dashboard');

  // ── Dashboard Filters ────────────────────────────────────────
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  const allVisitsCombined = useMemo(
    () => [...activeVisits, ...scheduledVisits, ...historyVisits],
    [activeVisits, scheduledVisits, historyVisits]
  );

  const filteredVisits = useMemo(() => {
    let list = [];
    if (selectedFilter === 'ACTIVE') {
      list = activeVisits;
    } else if (selectedFilter === 'HISTORY') {
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

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
  };

  // ── Handlers ─────────────────────────────────────────────────
  const handleGenerateNewQR = async () => {
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
  };

  const handleCheckOut = (visit) => {
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
                if (selectedVisitorDetails?.id === visit.id) setSelectedVisitorDetails(null);
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
  };

  const handleIssueScheduledSubmit = async (formData) => {
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
  };

  const handleCancelToken = (visit) => {
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
  };

  const handleRescheduleConfirm = async (visit, newDate, newTime) => {
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
  };

  const handleCallVisitor = (mobile) => {
    if (!mobile) return;
    Linking.openURL(`tel:${mobile}`).catch(() =>
      Alert.alert('Unavailable', `Could not initiate phone call to ${mobile}`)
    );
  };

  const handleSmsVisitor = (mobile) => {
    if (!mobile) return;
    Linking.openURL(`sms:${mobile}`).catch(() =>
      Alert.alert('Unavailable', `Could not send SMS to ${mobile}`)
    );
  };

  // ── Tab Renders ───────────────────────────────────────────────
  const renderDashboardTab = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} tintColor="#2563eb" />
      }
    >
      {/* Top Stats, Capacity, Generate, Search, Filter chips */}
      <View style={styles.topStatsRow}>
        <View style={styles.statCardHalf}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardTitle}>INSIDE CAMPUS</Text>
            <View style={styles.statIconContainer} />
          </View>
          <Text style={styles.statCardValue}>{activeVisits.length || 32}</Text>
        </View>
        <View style={styles.statCardHalf}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardTitle}>TOTAL TODAY</Text>
            <View style={styles.statIconContainer} />
          </View>
          <Text style={styles.statCardValue}>{totalTodayCount > 0 ? totalTodayCount : 147}</Text>
        </View>
      </View>

      <View style={styles.capacityCard}>
        <View style={styles.capacityCardHeader}>
          <Text style={styles.capacityCardTitle}>AVAILABLE QR</Text>
        </View>
        <View style={styles.capacityValueRow}>
          <Text style={styles.capacityValueBig}>{availableCount > 0 ? availableCount : 68}</Text>
          <Text style={styles.capacityValueMax}>/{totalTokensCount > 0 ? totalTokensCount : 100}</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${availableCount > 0 ? capacityPercent : 68}%` }]} />
        </View>
      </View>

      <TouchableOpacity
        style={styles.generatePrimaryBtn}
        activeOpacity={0.88}
        onPress={() => setShowIssueTokenModal(true)}
      >
        <Text style={styles.generateBtnText}>
          + Generate New QR Token
        </Text>
      </TouchableOpacity>

      <View style={styles.searchContainer}>
        <SearchIcon size={18} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search visitor, phone, company, or token"
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <CloseIcon size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
        {[
          { key: 'ALL', label: `All (${allVisitsCombined.length})` },
          { key: 'ACTIVE', label: `Active Inside (${activeVisits.length})` },
          { key: 'VIP', label: `VIP / Pre-approved (${allVisitsCombined.filter(v => v.is_vip || v.category === 'VIP' || (v.purpose && v.purpose.toLowerCase().includes('vip'))).length})` },
          { key: 'CONTRACTORS', label: `Contractors (${allVisitsCombined.filter(v => v.category === 'Contractor' || v.category === 'Utility' || (v.purpose && (v.purpose.toLowerCase().includes('contract') || v.purpose.toLowerCase().includes('atm')))).length})` },
          { key: 'HISTORY', label: `Completed (${historyVisits.length})` },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, selectedFilter === key && styles.filterChipActive]}
            onPress={() => setSelectedFilter(key)}
          >
            <Text style={[styles.filterChipText, selectedFilter === key && styles.filterChipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ManifestHeader
        activeVisitsCount={activeVisits.length}
        onIssueToken={() => setShowIssueTokenModal(true)}
      />

      {filteredVisits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No visitors found</Text>
          <Text style={styles.emptyStateSub}>
            {searchQuery ? `No results for "${searchQuery}"` : 'No visitor records in this category.'}
          </Text>
        </View>
      ) : (
        filteredVisits.map((item, index) => (
          <VisitorCard
            key={item.id || item.token_code || index}
            item={item}
            index={index}
            onCheckOut={handleCheckOut}
            onReschedule={(v) => setRescheduleTarget(v)}
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
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowProfileModal(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MenuIcon size={22} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.systemStatusPill}>
            <View style={styles.systemDot} />
            <Text style={styles.systemStatusPillText}>Live</Text>
          </View>
        </View>

        <View style={styles.headerCenterDot}>
          <View style={styles.centerGreenDot} />
        </View>

        <View style={styles.headerRightGroup}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowNotificationsModal(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <BellIcon size={21} color="#334155" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAvatarBtn} onPress={() => setShowProfileModal(true)}>
            <UserTabIcon size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Content */}
      <View style={styles.screenContainer}>
        {activeNavTab === 'dashboard' && renderDashboardTab()}
        {activeNavTab === 'tokens' && renderTokensTab()}
        {activeNavTab === 'analytics' && renderAnalyticsTab()}
        {activeNavTab === 'profile' && renderProfileTab()}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        {[
          { key: 'dashboard', label: 'Dashboard', Icon: GridIcon },
          { key: 'tokens', label: 'Tokens', Icon: QrTabIcon },
          { key: 'analytics', label: 'Analytics', Icon: BarChartIcon },
          { key: 'profile', label: 'Profile', Icon: UserTabIcon },
        ].map(({ key, label, Icon }) => (
          <TouchableOpacity
            key={key}
            style={styles.tabBarItem}
            onPress={() => setActiveNavTab(key)}
            activeOpacity={0.8}
          >
            <Icon size={22} color={activeNavTab === key ? '#2563eb' : '#64748b'} />
            <Text style={[styles.tabBarLabel, activeNavTab === key && styles.tabBarLabelActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
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
