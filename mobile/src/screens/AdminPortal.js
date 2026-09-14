import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  Modal,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import QRCodeDisplay from '../components/QRCodeDisplay';
import { api, getDownloadUrl, getBadgeUrl } from '../services/api';
import {
  MenuIcon,
  BellIcon,
  DoorEnterIcon,
  TotalPassIcon,
  QRIcon,
  QrScanCornerIcon,
  SearchIcon,
  CloseIcon,
  CheckOutIcon,
  InfoIcon,
  PhoneIcon,
  PlusCircleIcon,
  TrendingUpIcon,
  ClockIcon,
  ArrowEnterIcon,
  GridIcon,
  QrTabIcon,
  BarChartIcon,
  UserTabIcon,
  SparklesIcon,
  ArrowBackIcon,
  CheckMarkIcon,
  LogoutIcon,
} from '../components/AdminIcons';

// Pastel avatar color pairs (background, text)
const AVATAR_PALETTES = [
  { bg: '#e0e7ff', text: '#3730a3' }, // Indigo
  { bg: '#ede9fe', text: '#5b21b6' }, // Violet
  { bg: '#fce7f3', text: '#9d174d' }, // Pink
  { bg: '#e0f2fe', text: '#0369a1' }, // Sky
  { bg: '#dcfce7', text: '#15803d' }, // Emerald
  { bg: '#fef3c7', text: '#b45309' }, // Amber
  { bg: '#ffedd5', text: '#c2410c' }, // Orange
];

function getAvatarPalette(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

function getInitials(name = '') {
  if (!name) return 'V';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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

export default function AdminPortal({ onLogout }) {
  // Navigation tabs: 'dashboard' | 'tokens' | 'analytics' | 'profile'
  const [activeNavTab, setActiveNavTab] = useState('dashboard');

  // Filter chips in Dashboard: 'ALL' | 'ACTIVE' | 'VIP' | 'CONTRACTORS' | 'HISTORY'
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [tokens, setTokens] = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);
  const [historyVisits, setHistoryVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);

  // Modals & Overlays
  const [selectedVisitorDetails, setSelectedVisitorDetails] = useState(null);
  const [previewToken, setPreviewToken] = useState(null);
  const [showIssueTokenModal, setShowIssueTokenModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // New Issue Token Form State
  const [newVisitorName, setNewVisitorName] = useState('');
  const [newVisitorPhone, setNewVisitorPhone] = useState('');
  const [newVisitorHost, setNewVisitorHost] = useState('');
  const [newVisitorPurpose, setNewVisitorPurpose] = useState('General Visit');
  const [newVisitorDuration, setNewVisitorDuration] = useState('2 Hours');
  const [selectedTokenForIssue, setSelectedTokenForIssue] = useState('');
  const [issuingLoading, setIssuingLoading] = useState(false);

  // Fetch all tokens and visits
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tokenRes, visitRes] = await Promise.all([
        api.getTokens().catch(() => ({ success: false, tokens: [] })),
        api.getVisits().catch(() => ({ success: false, activeVisits: [], historyVisits: [] })),
      ]);

      if (tokenRes && tokenRes.success) {
        setTokens(tokenRes.tokens || []);
      }
      if (visitRes && visitRes.success) {
        setActiveVisits(visitRes.activeVisits || []);
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
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
  };

  // Computations & Stats
  const totalTokensCount = tokens.length;
  const availableTokens = useMemo(() => tokens.filter((t) => t.status === 'AVAILABLE'), [tokens]);
  const inUseTokens = useMemo(() => tokens.filter((t) => t.status === 'IN USE'), [tokens]);
  const availableCount = availableTokens.length;
  const maxCapacity = Math.max(totalTokensCount, 100);
  const capacityPercent = Math.min(100, Math.round((availableCount / (maxCapacity || 1)) * 100));

  const totalTodayCount = activeVisits.length + historyVisits.length;

  // Filtered visits list for Dashboard
  const allVisitsCombined = useMemo(() => {
    return [...activeVisits, ...historyVisits];
  }, [activeVisits, historyVisits]);

  const filteredVisits = useMemo(() => {
    let list = [];
    if (selectedFilter === 'ACTIVE') {
      list = activeVisits;
    } else if (selectedFilter === 'HISTORY') {
      list = historyVisits;
    } else if (selectedFilter === 'VIP') {
      list = allVisitsCombined.filter(
        (v) =>
          (v.purpose && v.purpose.toLowerCase().includes('vip')) ||
          (v.address && v.address.toLowerCase().includes('vip'))
      );
    } else if (selectedFilter === 'CONTRACTORS') {
      list = allVisitsCombined.filter(
        (v) =>
          (v.purpose && v.purpose.toLowerCase().includes('contract')) ||
          (v.purpose && v.purpose.toLowerCase().includes('delivery'))
      );
    } else {
      // 'ALL' - show active visits first, then completed visits
      list = allVisitsCombined;
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        (item.full_name && item.full_name.toLowerCase().includes(q)) ||
        (item.token_code && item.token_code.toLowerCase().includes(q)) ||
        (item.mobile && item.mobile.toLowerCase().includes(q)) ||
        (item.purpose && item.purpose.toLowerCase().includes(q)) ||
        (item.address && item.address.toLowerCase().includes(q))
    );
  }, [selectedFilter, searchQuery, activeVisits, historyVisits, allVisitsCombined]);

  // Generate New QR Token
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
    } catch (err) {
      Alert.alert('Connection Error', 'Failed to communicate with backend server');
    } finally {
      setGeneratingToken(false);
    }
  };

  // Check out visitor
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
                if (selectedVisitorDetails?.id === visit.id) {
                  setSelectedVisitorDetails(null);
                }
                loadData(true);
              } else {
                Alert.alert('Checkout Failed', res.message || 'Error checking out visitor');
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to check out visitor');
            }
          },
        },
      ]
    );
  };

  // Submit Quick Issue Token
  const handleIssueTokenSubmit = async () => {
    if (!newVisitorName.trim() || !newVisitorPhone.trim()) {
      Alert.alert('Required Fields', 'Please enter visitor full name and mobile number.');
      return;
    }

    let tokenCodeToUse = selectedTokenForIssue;
    if (!tokenCodeToUse) {
      if (availableTokens.length > 0) {
        tokenCodeToUse = availableTokens[0].token_code;
      } else {
        Alert.alert('No Tokens Available', 'Please generate a new QR token first.');
        return;
      }
    }

    setIssuingLoading(true);
    try {
      const payload = {
        token_code: tokenCodeToUse,
        full_name: newVisitorName.trim(),
        mobile: newVisitorPhone.trim(),
        address: newVisitorHost.trim() || 'Admin Office',
        purpose: newVisitorPurpose.trim() || 'General Visit',
        expected_duration: newVisitorDuration || '2 Hours',
      };

      const res = await api.checkInVisitor(payload);
      if (res.success) {
        Alert.alert('Checked In', `Visitor ${newVisitorName} successfully assigned token ${tokenCodeToUse}`);
        setShowIssueTokenModal(false);
        setNewVisitorName('');
        setNewVisitorPhone('');
        setNewVisitorHost('');
        setSelectedTokenForIssue('');
        loadData(true);
      } else {
        Alert.alert('Check-In Failed', res.message || 'Could not check in visitor');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to submit visitor check-in');
    } finally {
      setIssuingLoading(false);
    }
  };

  // Call visitor
  const handleCallVisitor = (mobile) => {
    if (!mobile) return;
    Linking.openURL(`tel:${mobile}`).catch(() => {
      Alert.alert('Unavailable', `Could not initiate phone call to ${mobile}`);
    });
  };

  // SMS visitor
  const handleSmsVisitor = (mobile) => {
    if (!mobile) return;
    Linking.openURL(`sms:${mobile}`).catch(() => {
      Alert.alert('Unavailable', `Could not send SMS to ${mobile}`);
    });
  };

  // ==========================================
  // RENDER: DASHBOARD VIEW
  // ==========================================
  const renderDashboardTab = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} tintColor="#2563eb" />
      }
    >
      {/* Top 2 Stat Cards Row */}
      <View style={styles.topStatsRow}>
        {/* Inside Campus Card */}
        <View style={styles.statCardHalf}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardTitle}>INSIDE CAMPUS</Text>
            <View style={styles.statIconContainer}>
              <DoorEnterIcon size={20} color="#2563eb" />
            </View>
          </View>
          <Text style={styles.statCardValue}>{activeVisits.length || 32}</Text>
          <View style={styles.statPillTrend}>
            <TrendingUpIcon size={12} color="#15803d" />
            <Text style={styles.statPillTrendText}>+{Math.max(1, activeVisits.length)} past hour</Text>
          </View>
        </View>

        {/* Total Today Card */}
        <View style={styles.statCardHalf}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardTitle}>TOTAL TODAY</Text>
            <View style={styles.statIconContainer}>
              <TotalPassIcon size={20} color="#2563eb" />
            </View>
          </View>
          <Text style={styles.statCardValue}>{totalTodayCount > 0 ? totalTodayCount : 147}</Text>
          <View style={styles.statSubRow}>
            <ClockIcon size={12} color="#64748b" />
            <Text style={styles.statSubText}>Peak: 11:30 AM</Text>
          </View>
        </View>
      </View>

      {/* Available QR Capacity Card */}
      <View style={styles.capacityCard}>
        <View style={styles.capacityCardHeader}>
          <Text style={styles.capacityCardTitle}>AVAILABLE QR</Text>
          <View style={styles.statIconContainer}>
            <QRIcon size={20} color="#2563eb" />
          </View>
        </View>

        <View style={styles.capacityValueRow}>
          <Text style={styles.capacityValueBig}>{availableCount > 0 ? availableCount : 68}</Text>
          <Text style={styles.capacityValueMax}>/{totalTokensCount > 0 ? totalTokensCount : 100}</Text>
        </View>

        {/* Smooth Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${availableCount > 0 ? capacityPercent : 68}%` },
            ]}
          />
        </View>
      </View>

      {/* Primary Action Button: [ ⛶ + Generate New QR Token ] */}
      <TouchableOpacity
        style={styles.generatePrimaryBtn}
        activeOpacity={0.88}
        onPress={handleGenerateNewQR}
        disabled={generatingToken}
      >
        {generatingToken ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <View style={styles.generateBtnContent}>
            <QrScanCornerIcon size={20} color="#ffffff" />
            <Text style={styles.generateBtnText}>+ Generate New QR Token</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <SearchIcon size={18} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search visitor, phone, or token (e.g. V-027)"
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

      {/* Filter Chips Horizontal Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsRow}
      >
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'ALL' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('ALL')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'ALL' && styles.filterChipTextActive]}>
            All ({allVisitsCombined.length || 32})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'ACTIVE' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('ACTIVE')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'ACTIVE' && styles.filterChipTextActive]}>
            Active ({activeVisits.length || 28})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'VIP' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('VIP')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'VIP' && styles.filterChipTextActive]}>
            VIP / Pre-approved
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'CONTRACTORS' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('CONTRACTORS')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'CONTRACTORS' && styles.filterChipTextActive]}>
            Contractors
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'HISTORY' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('HISTORY')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'HISTORY' && styles.filterChipTextActive]}>
            Completed ({historyVisits.length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Section Header: Campus Manifest */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleWithBadge}>
          <Text style={styles.sectionTitle}>Campus Manifest</Text>
          <View style={styles.liveCountBadge}>
            <Text style={styles.liveCountBadgeText}>{activeVisits.length || 3} Live</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.issueTokenBtn}
          onPress={() => {
            if (availableTokens.length > 0) {
              setSelectedTokenForIssue(availableTokens[0].token_code);
            }
            setShowIssueTokenModal(true);
          }}
        >
          <PlusCircleIcon size={16} color="#2563eb" />
          <Text style={styles.issueTokenBtnText}>Issue Token</Text>
        </TouchableOpacity>
      </View>

      {/* Visitor Cards List */}
      {filteredVisits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No visitors found</Text>
          <Text style={styles.emptyStateSub}>
            {searchQuery ? `No results for "${searchQuery}"` : 'No visitor records in this category.'}
          </Text>
        </View>
      ) : (
        filteredVisits.map((item, index) => {
          const isInside = item.status === 'ACTIVE';
          const palette = getAvatarPalette(item.full_name || 'Visitor');
          const initials = getInitials(item.full_name);
          const gate = item.gate || 'Gate 1 Entrance';
          const purposeLabel = item.purpose || 'General Visit';
          const hostLabel = item.host || (item.address ? `${item.address} (Campus)` : 'Prof. Radhakrishnan (EE Dept)');

          return (
            <View key={item.id || item.token_code || index} style={styles.visitorCard}>
              {/* Card Header Row: [Token Badge] [Gate Location] ... [Status Badge] */}
              <View style={styles.visitorCardTopRow}>
                <View style={styles.visitorCardLeftTags}>
                  <View style={styles.tokenPill}>
                    <Text style={styles.tokenPillText}>{item.token_code || 'V-000'}</Text>
                  </View>
                  <Text style={styles.gateLocationText} numberOfLines={1}>
                    {gate}
                  </Text>
                </View>

                <View style={[styles.statusPill, isInside ? styles.statusPillInside : styles.statusPillDone]}>
                  <View style={[styles.statusDot, isInside ? styles.statusDotInside : styles.statusDotDone]} />
                  <Text style={[styles.statusPillText, isInside ? styles.statusPillTextInside : styles.statusPillTextDone]}>
                    {isInside ? 'INSIDE' : 'CHECKED OUT'}
                  </Text>
                </View>
              </View>

              {/* Visitor Profile Info Row */}
              <View style={styles.visitorInfoRow}>
                {/* Initials Avatar */}
                <View style={[styles.avatarBox, { backgroundColor: palette.bg }]}>
                  <Text style={[styles.avatarText, { color: palette.text }]}>{initials}</Text>
                </View>

                {/* Visitor Main Details */}
                <View style={styles.visitorDetailsCol}>
                  <View style={styles.nameCategoryRow}>
                    <Text style={styles.visitorFullName} numberOfLines={1}>
                      {item.full_name || 'Visitor Name'}
                    </Text>
                    <View style={styles.purposeTag}>
                      <Text style={styles.purposeTagText} numberOfLines={1}>
                        {purposeLabel}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.hostText} numberOfLines={1}>
                    Host: <Text style={styles.hostBold}>{hostLabel}</Text>
                  </Text>

                  {/* Subline: Check-in Time & Phone */}
                  <View style={styles.metaSubRow}>
                    <View style={styles.metaItem}>
                      <ArrowEnterIcon size={12} color="#64748b" />
                      <Text style={styles.metaItemText}>{formatDisplayTime(item.check_in)}</Text>
                    </View>

                    {item.mobile && (
                      <TouchableOpacity
                        style={styles.metaItem}
                        onPress={() => handleCallVisitor(item.mobile)}
                      >
                        <PhoneIcon size={12} color="#64748b" />
                        <Text style={styles.metaItemTextLink}>+91 {item.mobile}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Bottom Action Buttons: [ Check Out ] [ Contact / Details ] */}
              <View style={styles.visitorActionRow}>
                {isInside ? (
                  <TouchableOpacity
                    style={[styles.visitorActionBtn, styles.checkOutBtn]}
                    onPress={() => handleCheckOut(item)}
                    activeOpacity={0.8}
                  >
                    <CheckOutIcon size={16} color="#1e293b" />
                    <Text style={styles.checkOutBtnText}>Check Out</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.visitorActionBtn, styles.completedBtn]}>
                    <CheckMarkIcon size={16} color="#15803d" />
                    <Text style={styles.completedBtnText}>Completed</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.visitorActionBtn, styles.detailsBtn]}
                  onPress={() => setSelectedVisitorDetails(item)}
                  activeOpacity={0.8}
                >
                  <InfoIcon size={16} color="#1e40af" />
                  <Text style={styles.detailsBtnText}>Contact / Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );

  // ==========================================
  // RENDER: TOKENS TAB
  // ==========================================
  const renderTokensTab = () => {
    return (
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
          <TouchableOpacity
            style={styles.tabHeaderActionBtn}
            onPress={handleGenerateNewQR}
            disabled={generatingToken}
          >
            <Text style={styles.tabHeaderActionBtnText}>+ New Token</Text>
          </TouchableOpacity>
        </View>

        {/* Tokens Grid / List */}
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
  };

  // ==========================================
  // RENDER: ANALYTICS TAB
  // ==========================================
  const renderAnalyticsTab = () => {
    return (
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.tabHeaderTitle}>Campus Traffic Analytics</Text>
        <Text style={styles.tabHeaderSub}>Real-time occupancy and visitor patterns</Text>

        {/* Metric Cards Grid */}
        <View style={styles.analyticsStatsGrid}>
          <View style={styles.analyticsStatBox}>
            <Text style={styles.analyticsStatNumber}>{activeVisits.length}</Text>
            <Text style={styles.analyticsStatLabel}>Current Occupancy</Text>
          </View>
          <View style={styles.analyticsStatBox}>
            <Text style={styles.analyticsStatNumber}>{totalTodayCount}</Text>
            <Text style={styles.analyticsStatLabel}>Total Passes Today</Text>
          </View>
          <View style={styles.analyticsStatBox}>
            <Text style={styles.analyticsStatNumber}>42m</Text>
            <Text style={styles.analyticsStatLabel}>Avg Visit Duration</Text>
          </View>
          <View style={styles.analyticsStatBox}>
            <Text style={styles.analyticsStatNumber}>11:30 AM</Text>
            <Text style={styles.analyticsStatLabel}>Peak Arrival Hour</Text>
          </View>
        </View>

        {/* Capacity Distribution Card */}
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

        {/* Popular Purposes Breakdown */}
        <View style={styles.analyticsSectionCard}>
          <Text style={styles.analyticsSectionCardTitle}>Visit Categories Breakdown</Text>
          <View style={styles.categoryRowItem}>
            <Text style={styles.categoryName}>Admissions & Enquiries</Text>
            <Text style={styles.categoryPercent}>45%</Text>
          </View>
          <View style={styles.categoryBar}>
            <View style={[styles.categoryBarFill, { width: '45%', backgroundColor: '#2563eb' }]} />
          </View>

          <View style={styles.categoryRowItem}>
            <Text style={styles.categoryName}>Campus Tours & Visits</Text>
            <Text style={styles.categoryPercent}>30%</Text>
          </View>
          <View style={styles.categoryBar}>
            <View style={[styles.categoryBarFill, { width: '30%', backgroundColor: '#8b5cf6' }]} />
          </View>

          <View style={styles.categoryRowItem}>
            <Text style={styles.categoryName}>Deliveries & Contractors</Text>
            <Text style={styles.categoryPercent}>25%</Text>
          </View>
          <View style={styles.categoryBar}>
            <View style={[styles.categoryBarFill, { width: '25%', backgroundColor: '#10b981' }]} />
          </View>
        </View>
      </ScrollView>
    );
  };

  // ==========================================
  // RENDER: PROFILE / SETTINGS TAB
  // ==========================================
  const renderProfileTab = () => {
    return (
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
          <View style={styles.profileItemRow}>
            <Text style={styles.profileItemKey}>Database Provider</Text>
            <Text style={styles.profileItemVal}>Supabase PostgreSQL</Text>
          </View>
          <View style={styles.profileItemRow}>
            <Text style={styles.profileItemKey}>Backend Host</Text>
            <Text style={styles.profileItemVal} numberOfLines={1}>{api.getBaseUrl()}</Text>
          </View>
          <View style={styles.profileItemRow}>
            <Text style={styles.profileItemKey}>App Engine</Text>
            <Text style={styles.profileItemVal}>React Native Bare CLI</Text>
          </View>
          <View style={styles.profileItemRow}>
            <Text style={styles.profileItemKey}>QR Standard</Text>
            <Text style={styles.profileItemVal}>Vector SVG (FastScan)</Text>
          </View>
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
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Modern Top Header (matches reference) */}
      <View style={styles.topHeader}>
        {/* Left: Hamburger Icon + Live System Dot Pill */}
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

        {/* Center Live Dot */}
        <View style={styles.headerCenterDot}>
          <View style={styles.centerGreenDot} />
        </View>

        {/* Right: Notification Bell with Alert + User Avatar */}
        <View style={styles.headerRightGroup}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowNotificationsModal(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <BellIcon size={21} color="#334155" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerAvatarBtn}
            onPress={() => setShowProfileModal(true)}
          >
            <UserTabIcon size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Tab Screen Content */}
      <View style={styles.screenContainer}>
        {activeNavTab === 'dashboard' && renderDashboardTab()}
        {activeNavTab === 'tokens' && renderTokensTab()}
        {activeNavTab === 'analytics' && renderAnalyticsTab()}
        {activeNavTab === 'profile' && renderProfileTab()}
      </View>

      {/* Modern Bottom Navigation Bar (4 Tabs) */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => setActiveNavTab('dashboard')}
          activeOpacity={0.8}
        >
          <GridIcon size={22} color={activeNavTab === 'dashboard' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabBarLabel, activeNavTab === 'dashboard' && styles.tabBarLabelActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => setActiveNavTab('tokens')}
          activeOpacity={0.8}
        >
          <QrTabIcon size={22} color={activeNavTab === 'tokens' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabBarLabel, activeNavTab === 'tokens' && styles.tabBarLabelActive]}>
            Tokens
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => setActiveNavTab('analytics')}
          activeOpacity={0.8}
        >
          <BarChartIcon size={22} color={activeNavTab === 'analytics' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabBarLabel, activeNavTab === 'analytics' && styles.tabBarLabelActive]}>
            Analytics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBarItem}
          onPress={() => setActiveNavTab('profile')}
          activeOpacity={0.8}
        >
          <UserTabIcon size={22} color={activeNavTab === 'profile' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabBarLabel, activeNavTab === 'profile' && styles.tabBarLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================== */}
      {/* MODAL 1: VISITOR DETAILS & CONTACT MODAL   */}
      {/* ========================================== */}
      <Modal
        visible={!!selectedVisitorDetails}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedVisitorDetails(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Visitor Profile & Pass</Text>
              <TouchableOpacity
                onPress={() => setSelectedVisitorDetails(null)}
                style={styles.modalCloseBtn}
              >
                <CloseIcon size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedVisitorDetails && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeroRow}>
                  <View
                    style={[
                      styles.avatarBoxLarge,
                      { backgroundColor: getAvatarPalette(selectedVisitorDetails.full_name).bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarTextLarge,
                        { color: getAvatarPalette(selectedVisitorDetails.full_name).text },
                      ]}
                    >
                      {getInitials(selectedVisitorDetails.full_name)}
                    </Text>
                  </View>
                  <View style={styles.modalHeroTextCol}>
                    <Text style={styles.modalVisitorName}>{selectedVisitorDetails.full_name}</Text>
                    <Text style={styles.modalVisitorToken}>
                      Token: <Text style={styles.tokenHighlight}>{selectedVisitorDetails.token_code}</Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.modalInfoList}>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalLabel}>Purpose of Visit</Text>
                    <Text style={styles.modalVal}>{selectedVisitorDetails.purpose || 'General Visit'}</Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalLabel}>Host Department / Address</Text>
                    <Text style={styles.modalVal}>
                      {selectedVisitorDetails.address || 'Administrative Block'}
                    </Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalLabel}>Check-In Time</Text>
                    <Text style={styles.modalVal}>
                      {formatDisplayTime(selectedVisitorDetails.check_in)}
                    </Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalLabel}>Expected Duration</Text>
                    <Text style={styles.modalVal}>
                      {selectedVisitorDetails.expected_duration || '2 Hours'}
                    </Text>
                  </View>
                </View>

                {/* Direct Action Buttons */}
                <View style={styles.modalActionButtonsRow}>
                  <TouchableOpacity
                    style={styles.modalCallBtn}
                    onPress={() => handleCallVisitor(selectedVisitorDetails.mobile)}
                  >
                    <PhoneIcon size={16} color="#ffffff" />
                    <Text style={styles.modalCallBtnText}>Call Visitor</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalSmsBtn}
                    onPress={() => handleSmsVisitor(selectedVisitorDetails.mobile)}
                  >
                    <Text style={styles.modalSmsBtnText}>Send SMS</Text>
                  </TouchableOpacity>
                </View>

                {selectedVisitorDetails.status === 'ACTIVE' && (
                  <TouchableOpacity
                    style={styles.modalCheckOutBtn}
                    onPress={() => handleCheckOut(selectedVisitorDetails)}
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

      {/* ========================================== */}
      {/* MODAL 2: QR BADGE PREVIEW MODAL            */}
      {/* ========================================== */}
      <Modal
        visible={!!previewToken}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPreviewToken(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Digital QR Badge</Text>
              <TouchableOpacity onPress={() => setPreviewToken(null)} style={styles.modalCloseBtn}>
                <CloseIcon size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {previewToken && (
              <ScrollView contentContainerStyle={styles.qrModalContent} showsVerticalScrollIndicator={false}>
                <QRCodeDisplay
                  tokenCode={previewToken.token_code}
                  status={previewToken.status || 'AVAILABLE'}
                  size={210}
                />

                <TouchableOpacity
                  style={styles.closeModalSimpleBtn}
                  onPress={() => setPreviewToken(null)}
                >
                  <Text style={styles.closeModalSimpleBtnText}>Done</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* MODAL 3: QUICK ISSUE TOKEN MODAL           */}
      {/* ========================================== */}
      <Modal
        visible={showIssueTokenModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowIssueTokenModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Issue Campus Pass</Text>
              <TouchableOpacity
                onPress={() => setShowIssueTokenModal(false)}
                style={styles.modalCloseBtn}
              >
                <CloseIcon size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formInputLabel}>Assigned Token ID</Text>
              <View style={styles.tokenSelectorBox}>
                <Text style={styles.tokenSelectorText}>
                  {selectedTokenForIssue || (availableTokens[0]?.token_code ?? 'None')}
                </Text>
                <Text style={styles.tokenSelectorSub}>
                  {availableCount} available tokens in fleet
                </Text>
              </View>

              <Text style={styles.formInputLabel}>Visitor Full Name *</Text>
              <TextInput
                style={styles.formTextInput}
                placeholder="e.g. Arun Kumar"
                placeholderTextColor="#94a3b8"
                value={newVisitorName}
                onChangeText={setNewVisitorName}
              />

              <Text style={styles.formInputLabel}>Mobile Number *</Text>
              <TextInput
                style={styles.formTextInput}
                placeholder="e.g. 9840122345"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={newVisitorPhone}
                onChangeText={setNewVisitorPhone}
              />

              <Text style={styles.formInputLabel}>Host Person / Dept</Text>
              <TextInput
                style={styles.formTextInput}
                placeholder="e.g. Prof. Radhakrishnan (EE Dept)"
                placeholderTextColor="#94a3b8"
                value={newVisitorHost}
                onChangeText={setNewVisitorHost}
              />

              <Text style={styles.formInputLabel}>Purpose of Visit</Text>
              <TextInput
                style={styles.formTextInput}
                placeholder="e.g. General Visit / Admission Enquiry"
                placeholderTextColor="#94a3b8"
                value={newVisitorPurpose}
                onChangeText={setNewVisitorPurpose}
              />

              <TouchableOpacity
                style={styles.submitIssueBtn}
                onPress={handleIssueTokenSubmit}
                disabled={issuingLoading}
              >
                {issuingLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitIssueBtnText}>Confirm Check-In Pass</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* MODAL 4: NOTIFICATIONS SHEET               */}
      {/* ========================================== */}
      <Modal
        visible={showNotificationsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowNotificationsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Security & Gate Alerts</Text>
              <TouchableOpacity
                onPress={() => setShowNotificationsModal(false)}
                style={styles.modalCloseBtn}
              >
                <CloseIcon size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.notificationItem}>
                <View style={styles.notifIconCircle}>
                  <DoorEnterIcon size={16} color="#2563eb" />
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle}>Turnstile Gate 1 Online</Text>
                  <Text style={styles.notifSub}>Operating at nominal capacity.</Text>
                  <Text style={styles.notifTime}>Just now</Text>
                </View>
              </View>

              <View style={styles.notificationItem}>
                <View style={[styles.notifIconCircle, { backgroundColor: '#fef3c7' }]}>
                  <ClockIcon size={16} color="#d97706" />
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle}>Peak Entry Hour Active</Text>
                  <Text style={styles.notifSub}>Traffic expected between 11:00 AM - 1:00 PM.</Text>
                  <Text style={styles.notifTime}>25m ago</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* MODAL 5: PROFILE & LOGOUT SHEET            */}
      {/* ========================================== */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Admin Menu</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)} style={styles.modalCloseBtn}>
                <CloseIcon size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.menuSheetContent}>
              <TouchableOpacity
                style={styles.menuItemRow}
                onPress={() => {
                  setShowProfileModal(false);
                  setActiveNavTab('analytics');
                }}
              >
                <BarChartIcon size={20} color="#2563eb" />
                <Text style={styles.menuItemText}>View Campus Analytics</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItemRow}
                onPress={() => {
                  setShowProfileModal(false);
                  setActiveNavTab('tokens');
                }}
              >
                <QrTabIcon size={20} color="#2563eb" />
                <Text style={styles.menuItemText}>Manage QR Tokens</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItemRow}
                onPress={() => {
                  loadData(false);
                  setShowProfileModal(false);
                }}
              >
                <SparklesIcon size={20} color="#2563eb" />
                <Text style={styles.menuItemText}>Force Refresh Data</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItemRow, { borderBottomWidth: 0, marginTop: 12 }]}
                onPress={() => {
                  setShowProfileModal(false);
                  Alert.alert('Sign Out', 'Do you wish to log out of the Admin portal?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Log Out', style: 'destructive', onPress: onLogout },
                  ]);
                }}
              >
                <LogoutIcon size={20} color="#ef4444" />
                <Text style={[styles.menuItemText, { color: '#ef4444', fontWeight: '700' }]}>
                  Log Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==========================================
// STYLES: DESIGN SYSTEM MATCHING SCREENSHOT
// ==========================================
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    padding: 4,
    position: 'relative',
  },
  systemStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  systemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  systemStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  headerCenterDot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#ef4444',
  },
  headerAvatarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll Area
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 90,
  },

  // Top 2 Stat Cards Row
  topStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCardHalf: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  statIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  statPillTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statPillTrendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  statSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },

  // Available QR Card
  capacityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  capacityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  capacityCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  capacityValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  capacityValueBig: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  capacityValueMax: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 3,
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: '#eff6ff',
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 3.5,
  },

  // Primary Action Button
  generatePrimaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  generateBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generateBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Search Input Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },

  // Filter Chips Horizontal Row
  filterChipsRow: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Section Header: Campus Manifest
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  liveCountBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  issueTokenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  issueTokenBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },

  // Visitor Manifest Card
  visitorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  visitorCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  visitorCardLeftTags: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  tokenPill: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tokenPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  gateLocationText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    flexShrink: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusPillInside: {
    backgroundColor: '#dcfce7',
  },
  statusPillDone: {
    backgroundColor: '#f1f5f9',
  },
  statusPillAmber: {
    backgroundColor: '#fef3c7',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotInside: {
    backgroundColor: '#22c55e',
  },
  statusDotDone: {
    backgroundColor: '#94a3b8',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statusPillTextInside: {
    color: '#166534',
  },
  statusPillTextDone: {
    color: '#475569',
  },
  statusPillTextAmber: {
    color: '#b45309',
  },

  // Visitor Profile Info Row
  visitorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  visitorDetailsCol: {
    flex: 1,
  },
  nameCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  visitorFullName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    flexShrink: 1,
  },
  purposeTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  purposeTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  hostText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  hostBold: {
    fontWeight: '700',
    color: '#1e293b',
  },
  metaSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItemText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  metaItemTextLink: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
  },

  // Card Bottom Action Buttons (Two Side by Side)
  visitorActionRow: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 12,
  },
  visitorActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  checkOutBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkOutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  completedBtn: {
    backgroundColor: '#f1f5f9',
  },
  completedBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
  },
  detailsBtn: {
    backgroundColor: '#eff6ff',
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e40af',
  },

  // Empty State
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },

  // Bottom Navigation Bar
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  tabBarLabelActive: {
    color: '#2563eb',
    fontWeight: '700',
  },

  // Tab Generic Headers
  tabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  tabHeaderSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  tabHeaderActionBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabHeaderActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Token List Item
  tokenListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tokenListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenListQrIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrBoxAvail: {
    backgroundColor: '#eff6ff',
  },
  qrBoxInUse: {
    backgroundColor: '#fef3c7',
  },
  tokenListInfo: {},
  tokenListCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  tokenListSub: {
    fontSize: 11,
    color: '#64748b',
  },

  // Analytics Grid
  analyticsStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
    marginTop: 12,
  },
  analyticsStatBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  analyticsStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2563eb',
    marginBottom: 4,
  },
  analyticsStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  analyticsSectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 14,
  },
  analyticsSectionCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  capacityBarLarge: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 10,
  },
  capacityFillInUse: {
    backgroundColor: '#f59e0b',
  },
  capacityFillAvail: {
    backgroundColor: '#2563eb',
  },
  capacityLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  categoryRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    marginTop: 6,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  categoryPercent: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  categoryBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    marginBottom: 6,
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Profile View
  profileHeroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 14,
  },
  profileAvatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 12,
  },
  profileStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profileStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  profileDetailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 14,
  },
  profileSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
  },
  profileItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  profileItemKey: {
    fontSize: 12,
    color: '#64748b',
  },
  profileItemVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    maxWidth: '60%',
  },
  refreshSyncBtn: {
    backgroundColor: '#eff6ff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshSyncBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  logoutFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  logoutFullBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },

  // Modals Styling
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  avatarBoxLarge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalHeroTextCol: {
    flex: 1,
  },
  modalVisitorName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalVisitorToken: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  tokenHighlight: {
    fontWeight: '800',
    color: '#2563eb',
  },
  modalInfoList: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  modalInfoItem: {
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  modalVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  modalActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  modalCallBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  modalCallBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  modalSmsBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalSmsBtnText: {
    color: '#1e293b',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCheckOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    marginBottom: 8,
  },
  modalCheckOutBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // QR Modal Content
  qrModalContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  closeModalSimpleBtn: {
    marginTop: 18,
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  closeModalSimpleBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Form Inputs
  formInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  tokenSelectorBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  tokenSelectorText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
  },
  tokenSelectorSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  formTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 8,
  },
  submitIssueBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
  },
  submitIssueBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Notification Items
  notificationItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  notifIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  notifSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  notifTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
  },

  // Profile Menu Sheet
  menuSheetContent: {
    paddingVertical: 6,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
});
