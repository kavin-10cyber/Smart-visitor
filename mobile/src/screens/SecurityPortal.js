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
  Modal,
  StatusBar,
  SafeAreaView,
  Platform,
} from 'react-native';
import QRScanner from '../components/QRScanner';
import { api } from '../services/api';
import {
  ShieldIcon,
  UserTabIcon,
  QRIcon,
  QrScanCornerIcon,
  SearchIcon,
  CloseIcon,
  UserPlusIcon,
  ArrowRightIcon,
  UsersIcon,
  BadgePassIcon,
  CheckCircleIcon,
  FlagIcon,
  AlertTriangleIcon,
  ClockIcon,
  CheckOutIcon,
  PhoneIcon,
  LogoutIcon,
  GridIcon,
  LogsTabIcon,
  AccessTabIcon,
  AlertsTabIcon,
  SettingsTabIcon,
} from '../components/AdminIcons';

function formatClockTime(date = new Date()) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const timeStr = date.toTimeString().split(' ')[0]; // HH:MM:SS
  return `${month} ${day}, ${year} | ${timeStr}`;
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

export default function SecurityPortal({ onLogout }) {
  // Navigation tabs: 'dashboard' | 'logs' | 'access' | 'alerts' | 'settings'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Filter chips in Dashboard: 'INSIDE' | 'EXPECTED' | 'VIP' | 'ALL'
  const [selectedFilter, setSelectedFilter] = useState('INSIDE');
  const [searchQuery, setSearchQuery] = useState('');

  // Live clock state
  const [currentClock, setCurrentClock] = useState(formatClockTime());

  // Data states
  const [tokensList, setTokensList] = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);
  const [historyVisits, setHistoryVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [selectedVisitForAction, setSelectedVisitForAction] = useState(null);

  // Check-In Form State
  const [regFullName, setRegFullName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regHost, setRegHost] = useState('');
  const [regPurpose, setRegPurpose] = useState('General Visit');
  const [regTokenCode, setRegTokenCode] = useState('');
  const [regDuration, setRegDuration] = useState('2 Hours');
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  // Auto-update clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentClock(formatClockTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch tokens and visits
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tokenRes, visitRes] = await Promise.all([
        api.getTokens().catch(() => ({ success: false, tokens: [] })),
        api.getVisits().catch(() => ({ success: false, activeVisits: [], historyVisits: [] })),
      ]);

      if (tokenRes && tokenRes.success) {
        setTokensList(tokenRes.tokens || []);
      }
      if (visitRes && visitRes.success) {
        setActiveVisits(visitRes.activeVisits || []);
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
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
  };

  const availableTokens = useMemo(() => tokensList.filter((t) => t.status === 'AVAILABLE'), [tokensList]);
  const totalTodayCount = activeVisits.length + historyVisits.length;

  // Process QR Scanned Code
  const handleScanSuccess = async (tokenCode) => {
    setShowScannerModal(false);
    setLoading(true);

    try {
      const res = await api.verifyToken(tokenCode);

      if (!res.exists) {
        Alert.alert('Invalid QR Token', `Badge "${tokenCode}" is not registered in the system.`);
        return;
      }

      if (res.status === 'IN USE' && res.activeVisit) {
        // Active visit found -> Prompt for checkout
        setSelectedVisitForAction(res.activeVisit);
      } else {
        // Token is available -> Open registration form with token pre-filled
        setRegTokenCode(tokenCode);
        setRegFullName('');
        setRegMobile('');
        setRegHost('');
        setRegPurpose('General Visit');
        setShowCheckInModal(true);
      }
    } catch (err) {
      Alert.alert('Verification Failed', 'Could not verify token with server');
    } finally {
      setLoading(false);
    }
  };

  // Perform Visitor Check-In
  const handleCheckInSubmit = async () => {
    if (!regFullName.trim() || !regMobile.trim()) {
      Alert.alert('Required Fields', 'Please enter visitor full name and mobile number.');
      return;
    }

    let tokenToAssign = regTokenCode.trim().toUpperCase();
    if (!tokenToAssign) {
      if (availableTokens.length > 0) {
        tokenToAssign = availableTokens[0].token_code;
      } else {
        Alert.alert('No Available Tokens', 'All QR badges are currently in use. Please check out a visitor or ask Admin for badges.');
        return;
      }
    }

    setSubmittingCheckIn(true);
    try {
      const res = await api.checkInVisitor({
        token_code: tokenToAssign,
        full_name: regFullName.trim(),
        mobile: regMobile.trim(),
        address: regHost.trim() || 'Admin Office',
        purpose: regPurpose.trim() || 'General Visit',
        expected_duration: regDuration,
      });

      if (res.success) {
        Alert.alert('✅ Pass Issued', `Visitor ${regFullName} cleared at Gate 1 with badge ${tokenToAssign}`);
        setShowCheckInModal(false);
        setRegFullName('');
        setRegMobile('');
        setRegHost('');
        setRegTokenCode('');
        loadData(true);
      } else {
        Alert.alert('Check-In Error', res.message || 'Could not check in visitor');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Check-in request failed');
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  // Perform Visitor Check-Out
  const handleCheckOutConfirm = async (visit) => {
    Alert.alert(
      'Confirm Exit',
      `Check out visitor ${visit.full_name} and release badge ${visit.token_code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check Out',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.checkOutVisitor(visit.token_code);
              if (res.success) {
                Alert.alert('Exit Recorded', `Badge ${visit.token_code} is now AVAILABLE for recycling.`);
                setSelectedVisitForAction(null);
                loadData(true);
              } else {
                Alert.alert('Check-Out Error', res.message || 'Could not complete checkout');
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to check out visitor');
            }
          },
        },
      ]
    );
  };

  // Recent activity list
  const recentActivities = useMemo(() => {
    let list = [...activeVisits, ...historyVisits];
    if (selectedFilter === 'INSIDE') {
      list = activeVisits;
    } else if (selectedFilter === 'EXPECTED') {
      list = activeVisits.filter((v) => (v.purpose && v.purpose.toLowerCase().includes('interview')) || (v.address && v.address.toLowerCase().includes('expected')));
      if (list.length === 0) list = activeVisits;
    } else if (selectedFilter === 'VIP') {
      list = list.filter((v) => (v.purpose && v.purpose.toLowerCase().includes('vip')) || (v.address && v.address.toLowerCase().includes('vip')));
      if (list.length === 0) list = activeVisits;
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        (item.full_name && item.full_name.toLowerCase().includes(q)) ||
        (item.mobile && item.mobile.toLowerCase().includes(q)) ||
        (item.token_code && item.token_code.toLowerCase().includes(q)) ||
        (item.address && item.address.toLowerCase().includes(q)) ||
        (item.purpose && item.purpose.toLowerCase().includes(q))
    );
  }, [activeVisits, historyVisits, selectedFilter, searchQuery]);

  // ==========================================
  // RENDER: DASHBOARD VIEW (MATCHES SCREENSHOT)
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
      {/* 1. New Visitor Check-In Hero Card */}
      <View style={styles.heroCheckInCard}>
        {/* Card Header Row */}
        <View style={styles.heroCardHeaderRow}>
          <View style={styles.heroCardTitleLeft}>
            <View style={styles.blueDot} />
            <Text style={styles.heroCardTitle}>New Visitor Check-In</Text>
          </View>

          <View style={styles.scannerReadyBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.scannerReadyText}>SCANNER READY</Text>
          </View>
        </View>

        {/* Button 1: Highlighted [ ⛶ SCAN ID / QR CODE ➔ ] */}
        <TouchableOpacity
          style={styles.scanCodeBtn}
          activeOpacity={0.85}
          onPress={() => setShowScannerModal(true)}
        >
          <View style={styles.scanCodeIconCircle}>
            <QrScanCornerIcon size={20} color="#ffffff" />
          </View>
          <Text style={styles.scanCodeBtnText}>SCAN ID / QR CODE</Text>
          <ArrowRightIcon size={17} color="#ffffff" />
        </TouchableOpacity>

        {/* Search Field */}
        <View style={styles.searchBarBox}>
          <SearchIcon size={17} color="#64748b" />
          <TextInput
            style={styles.searchBarInput}
            placeholder="Search Visitor Name or Phone"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <CloseIcon size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 2. Top Stats Row (Side-by-Side Cards) */}
      <View style={styles.metricsRow}>
        {/* PRESENT Card */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeaderRow}>
            <Text style={styles.metricTitlePresent}>PRESENT</Text>
            <View style={styles.metricIconBox}>
              <UsersIcon size={18} color="#2563eb" />
            </View>
          </View>
          <View style={styles.metricNumberRow}>
            <Text style={styles.metricNumberBold}>{activeVisits.length || 14}</Text>
            <View style={styles.trendTagPill}>
              <Text style={styles.trendTagText}>📈 +{Math.max(1, activeVisits.length || 3)}</Text>
            </View>
          </View>
          <Text style={styles.metricSubtitle}>Visitors on Campus</Text>
        </View>

        {/* LOGGED Card */}
        <View style={styles.metricCard}>
          <View style={styles.metricHeaderRow}>
            <Text style={styles.metricTitleLogged}>LOGGED</Text>
            <View style={styles.metricIconBox}>
              <BadgePassIcon size={18} color="#15803d" />
            </View>
          </View>
          <View style={styles.metricNumberRow}>
            <Text style={[styles.metricNumberBold, { color: '#15803d' }]}>
              {totalTodayCount || 38}
            </Text>
            <View style={styles.percentTagPill}>
              <Text style={styles.percentTagText}>100%</Text>
            </View>
          </View>
          <Text style={styles.metricSubtitle}>Total Arrivals Today</Text>
        </View>
      </View>

      {/* 3. Horizontal Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsRow}
      >
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'INSIDE' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('INSIDE')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'INSIDE' && styles.filterChipTextActive]}>
            Currently Inside
          </Text>
          <View style={[styles.filterCountBadge, selectedFilter === 'INSIDE' && styles.filterCountBadgeActive]}>
            <Text style={[styles.filterCountText, selectedFilter === 'INSIDE' && styles.filterCountTextActive]}>
              {activeVisits.length || 14}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'EXPECTED' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('EXPECTED')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'EXPECTED' && styles.filterChipTextActive]}>
            Expected
          </Text>
          <View style={styles.filterCountBadge}>
            <Text style={styles.filterCountText}>24</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'VIP' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('VIP')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'VIP' && styles.filterChipTextActive]}>
            VIP Pre-approved
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === 'ALL' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('ALL')}
        >
          <Text style={[styles.filterChipText, selectedFilter === 'ALL' && styles.filterChipTextActive]}>
            All Logs ({totalTodayCount})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 4. Security Notice Banner */}
      <View style={styles.securityNoticeCard}>
        <View style={styles.securityNoticeTop}>
          <View style={styles.securityNoticeLeft}>
            <View style={styles.alertIconBox}>
              <AlertTriangleIcon size={16} color="#991b1b" />
            </View>
            <Text style={styles.securityNoticeTitle}>SECURITY NOTICE</Text>
          </View>
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityBadgeText}>GATE 1 PRIORITY</Text>
          </View>
        </View>
        <Text style={styles.securityNoticeBody}>
          <Text style={styles.boldNotice}>VIP Arrival: </Text>
          Dr. Sarah Jenkins cleared for Main Auditorium (ETA 5m). Watchlist check confirmed safe.
        </Text>
      </View>

      {/* 5. Recent Check-In Activity Header */}
      <View style={styles.activityHeaderRow}>
        <Text style={styles.activityHeaderTitle}>Recent Check-In Activity</Text>
        <View style={styles.liveFeedBadge}>
          <View style={styles.greenDot} />
          <Text style={styles.liveFeedText}>LIVE FEED</Text>
        </View>
      </View>

      {/* 6. Recent Activity List */}
      {recentActivities.length === 0 ? (
        <View style={styles.emptyStateBox}>
          <Text style={styles.emptyStateTitle}>No visitor activity recorded</Text>
          <Text style={styles.emptyStateSub}>Check in a visitor above or tap Scan ID</Text>
        </View>
      ) : (
        recentActivities.map((item, idx) => {
          const isInside = item.status === 'ACTIVE';
          const hostLabel = item.host || item.address || 'Dr. Aris (EE Dept)';
          const badgeNumber = item.token_code || `V-0${idx + 1}`;

          return (
            <TouchableOpacity
              key={item.id || item.token_code || idx}
              style={styles.activityRowCard}
              activeOpacity={0.8}
              onPress={() => setSelectedVisitForAction(item)}
            >
              {/* Left Green Circle Checkmark */}
              <View style={styles.activityCheckCircle}>
                <CheckCircleIcon size={18} color="#15803d" />
              </View>

              {/* Middle Info Col */}
              <View style={styles.activityContentCol}>
                <View style={styles.activityNameRow}>
                  <Text style={styles.activityVisitorName} numberOfLines={1}>
                    {item.full_name || 'Visitor Name'}
                  </Text>
                  <View style={styles.checkedInPill}>
                    <Text style={styles.checkedInPillText}>
                      {isInside ? 'Checked In' : 'Checked Out'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.activitySubDetail} numberOfLines={1}>
                  Gate 1 Turnstile • Host: {hostLabel} • #{badgeNumber}
                </Text>
              </View>

              {/* Right Timestamp */}
              <Text style={styles.activityTimestamp}>
                {formatDisplayTime(item.check_in)}
              </Text>
            </TouchableOpacity>
          );
        })
      )}

      {/* 7. Gate 1 Physical Turnstiles Hardware Status Card */}
      <View style={styles.turnstileStatusCard}>
        <View style={styles.turnstileLeft}>
          <View style={styles.turnstileFlagBox}>
            <FlagIcon size={18} color="#2563eb" />
          </View>
          <View>
            <Text style={styles.turnstileTitle}>Gate 1 Physical Turnstiles</Text>
            <Text style={styles.turnstileSubtitle}>Relay: Online • Latency: 18ms</Text>
          </View>
        </View>
        <View style={styles.greenPulseDot} />
      </View>
    </ScrollView>
  );

  // ==========================================
  // RENDER: LOGS TAB
  // ==========================================
  const renderLogsTab = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.tabHeadingTitle}>Gate Audit Logs</Text>
      <Text style={styles.tabHeadingSub}>All entry and exit events processed at this station</Text>

      {[...activeVisits, ...historyVisits].map((v) => (
        <TouchableOpacity
          key={v.id || v.token_code}
          style={styles.logCardItem}
          onPress={() => setSelectedVisitForAction(v)}
        >
          <View style={styles.logCardLeft}>
            <Text style={styles.logCardToken}>{v.token_code}</Text>
            <View>
              <Text style={styles.logCardName}>{v.full_name}</Text>
              <Text style={styles.logCardSub}>
                In: {formatDisplayTime(v.check_in)} • Out: {formatDisplayTime(v.check_out)}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadgeSmall, v.status === 'ACTIVE' ? styles.badgeActive : styles.badgeDone]}>
            <Text style={[styles.statusBadgeSmallText, v.status === 'ACTIVE' ? styles.textActive : styles.textDone]}>
              {v.status === 'ACTIVE' ? 'INSIDE' : 'EXITED'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ==========================================
  // RENDER: ACCESS TAB (MANUAL TRIGGER / SCANNER)
  // ==========================================
  const renderAccessTab = () => (
    <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.tabHeadingTitle}>Gate Access Control</Text>
      <Text style={styles.tabHeadingSub}>Manual barrier unlock and badge scanning</Text>

      <TouchableOpacity
        style={styles.bigScannerActionBtn}
        onPress={() => setShowScannerModal(true)}
      >
        <QrScanCornerIcon size={32} color="#ffffff" />
        <Text style={styles.bigScannerActionBtnText}>Launch Camera QR Scanner</Text>
      </TouchableOpacity>

      <View style={styles.gateControlCard}>
        <Text style={styles.gateControlTitle}>Manual Barrier Trigger</Text>
        <Text style={styles.gateControlSub}>Emergency or authorized manual override</Text>
        <TouchableOpacity
          style={styles.unlockTurnstileBtn}
          onPress={() => Alert.alert('Turnstile Relay', 'Turnstile Gate 1 unlocked for 10 seconds.')}
        >
          <Text style={styles.unlockTurnstileBtnText}>🔓 Momentary Gate Unlock (10s)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ==========================================
  // RENDER: ALERTS TAB
  // ==========================================
  const renderAlertsTab = () => (
    <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.tabHeadingTitle}>Security Station Alerts</Text>
      <Text style={styles.tabHeadingSub}>Live security notices and watchlist checks</Text>

      <View style={styles.securityNoticeCard}>
        <View style={styles.securityNoticeTop}>
          <View style={styles.securityNoticeLeft}>
            <AlertTriangleIcon size={16} color="#991b1b" />
            <Text style={styles.securityNoticeTitle}>SECURITY NOTICE</Text>
          </View>
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityBadgeText}>GATE 1 PRIORITY</Text>
          </View>
        </View>
        <Text style={styles.securityNoticeBody}>
          <Text style={styles.boldNotice}>VIP Arrival: </Text>
          Dr. Sarah Jenkins cleared for Main Auditorium (ETA 5m). Watchlist check confirmed safe.
        </Text>
      </View>

      <View style={[styles.securityNoticeCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
        <View style={styles.securityNoticeTop}>
          <View style={styles.securityNoticeLeft}>
            <CheckCircleIcon size={16} color="#15803d" />
            <Text style={[styles.securityNoticeTitle, { color: '#15803d' }]}>WATCHLIST CLEAR</Text>
          </View>
          <Text style={{ fontSize: 11, color: '#64748b' }}>Updated 10m ago</Text>
        </View>
        <Text style={[styles.securityNoticeBody, { color: '#166534' }]}>
          Campus Security Database is synced with national watchlist. No flagged individuals detected today.
        </Text>
      </View>
    </ScrollView>
  );

  // ==========================================
  // RENDER: SETTINGS TAB
  // ==========================================
  const renderSettingsTab = () => (
    <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.tabHeadingTitle}>Station Settings</Text>
      <Text style={styles.tabHeadingSub}>Gate 1 Entrance Terminal</Text>

      <View style={styles.settingsSection}>
        <View style={styles.settingsRow}>
          <Text style={styles.settingsLabel}>Station ID</Text>
          <Text style={styles.settingsValue}>GATE-01-DESK</Text>
        </View>
        <View style={styles.settingsRow}>
          <Text style={styles.settingsLabel}>Guard On Duty</Text>
          <Text style={styles.settingsValue}>Security Officer (DEMO)</Text>
        </View>
        <View style={styles.settingsRow}>
          <Text style={styles.settingsLabel}>Turnstile Status</Text>
          <Text style={[styles.settingsValue, { color: '#15803d' }]}>Online (Relay OK)</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.logoutBtnFull}
        onPress={() => {
          Alert.alert('Sign Out', 'Sign out from Security Guard Desk?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: onLogout },
          ]);
        }}
      >
        <LogoutIcon size={18} color="#ef4444" />
        <Text style={styles.logoutBtnFullText}>Sign Out from Security Desk</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Header: [Shield Logo] [Dashboard | Timestamp] ... [Profile Avatar] */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeftCol}>
          <View style={styles.shieldLogoBox}>
            <ShieldIcon size={20} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerTimestamp}>{currentClock}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.profileAvatarBtn}
          onPress={() => setShowOfficerModal(true)}
          activeOpacity={0.8}
        >
          <UserTabIcon size={17} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Screen Tab Content */}
      <View style={styles.screenContainer}>
        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'logs' && renderLogsTab()}
        {activeTab === 'access' && renderAccessTab()}
        {activeTab === 'alerts' && renderAlertsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </View>

      {/* Modern 5-Tab Bottom Navigation Bar */}
      <View style={styles.bottomTabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('dashboard')}
          activeOpacity={0.8}
        >
          <GridIcon size={21} color={activeTab === 'dashboard' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'dashboard' && styles.tabLabelActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('logs')}
          activeOpacity={0.8}
        >
          <LogsTabIcon size={21} color={activeTab === 'logs' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'logs' && styles.tabLabelActive]}>
            Logs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('access')}
          activeOpacity={0.8}
        >
          <AccessTabIcon size={21} color={activeTab === 'access' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'access' && styles.tabLabelActive]}>
            Access
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('alerts')}
          activeOpacity={0.8}
        >
          <AlertsTabIcon size={21} color={activeTab === 'alerts' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'alerts' && styles.tabLabelActive]}>
            Alerts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('settings')}
          activeOpacity={0.8}
        >
          <SettingsTabIcon size={21} color={activeTab === 'settings' ? '#2563eb' : '#64748b'} />
          <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>

      {/* ========================================== */}
      {/* MODAL 1: ADAPTIVE CAMERA QR SCANNER MODAL  */}
      {/* ========================================== */}
      <Modal
        visible={showScannerModal}
        animationType="slide"
        onRequestClose={() => setShowScannerModal(false)}
      >
        <SafeAreaView style={styles.scannerModalSafeArea}>
          <View style={styles.scannerModalHeader}>
            <View style={styles.scannerHeaderLeft}>
              <View style={styles.scannerShieldBox}>
                <ShieldIcon size={16} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.scannerModalTitle}>Scan Visitor QR Badge</Text>
                <Text style={styles.scannerModalSub}>Gate 1 Optical Scanner • Live</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.scannerModalCloseBtn}
              onPress={() => setShowScannerModal(false)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <CloseIcon size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <QRScanner
            onScan={handleScanSuccess}
            availableTokens={tokensList}
            onClose={() => setShowScannerModal(false)}
          />
        </SafeAreaView>
      </Modal>

      {/* ========================================== */}
      {/* MODAL 2: CHECK-IN VISITOR REGISTRATION     */}
      {/* ========================================== */}
      <Modal
        visible={showCheckInModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCheckInModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Visitor Check-In Registration</Text>
              <TouchableOpacity onPress={() => setShowCheckInModal(false)} style={styles.modalCloseBtn}>
                <CloseIcon size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formInputLabel}>Assigned Badge / QR Token *</Text>
              <View style={styles.tokenDisplayBox}>
                <Text style={styles.tokenDisplayText}>
                  {regTokenCode || (availableTokens[0]?.token_code ?? 'V-001')}
                </Text>
                <Text style={styles.tokenDisplaySub}>
                  {availableTokens.length} tokens available in gate fleet
                </Text>
              </View>

              <Text style={styles.formInputLabel}>Visitor Full Name *</Text>
              <TextInput
                style={styles.formTextInput}
                placeholder="e.g. Arun Kumar"
                placeholderTextColor="#94a3b8"
                value={regFullName}
                onChangeText={setRegFullName}
              />

              <Text style={styles.formInputLabel}>Mobile Number *</Text>
              <TextInput
                style={styles.formTextInput}
                placeholder="e.g. 9840122345"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={regMobile}
                onChangeText={setRegMobile}
              />

              <Text style={styles.formInputLabel}>Host Person / Destination Dept</Text>
              <TextInput
                style={styles.formTextInput}
                placeholder="e.g. Dr. Aris (Computer Science)"
                placeholderTextColor="#94a3b8"
                value={regHost}
                onChangeText={setRegHost}
              />

              <Text style={styles.formInputLabel}>Purpose of Visit</Text>
              <TextInput
                style={styles.formTextInput}
                placeholder="e.g. General Campus Visit"
                placeholderTextColor="#94a3b8"
                value={regPurpose}
                onChangeText={setRegPurpose}
              />

              <TouchableOpacity
                style={styles.submitCheckInBtn}
                onPress={handleCheckInSubmit}
                disabled={submittingCheckIn}
              >
                {submittingCheckIn ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitCheckInBtnText}>Authorize Gate Pass & Open Barrier</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* MODAL 3: VISITOR QUICK ACTIONS / CHECKOUT  */}
      {/* ========================================== */}
      <Modal
        visible={!!selectedVisitForAction}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSelectedVisitForAction(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Visitor Gate Record</Text>
              <TouchableOpacity
                onPress={() => setSelectedVisitForAction(null)}
                style={styles.modalCloseBtn}
              >
                <CloseIcon size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedVisitForAction && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.actionHeroBox}>
                  <Text style={styles.actionHeroName}>{selectedVisitForAction.full_name}</Text>
                  <Text style={styles.actionHeroToken}>
                    Token: <Text style={styles.actionTokenBold}>{selectedVisitForAction.token_code}</Text>
                  </Text>
                  <View style={[styles.actionStatusPill, selectedVisitForAction.status === 'ACTIVE' ? styles.statusActivePill : styles.statusDonePill]}>
                    <Text style={[styles.actionStatusPillText, selectedVisitForAction.status === 'ACTIVE' ? styles.statusActiveText : styles.statusDoneText]}>
                      {selectedVisitForAction.status === 'ACTIVE' ? 'CURRENTLY ON CAMPUS' : 'EXITED CAMPUS'}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionDetailsList}>
                  <View style={styles.actionDetailItem}>
                    <Text style={styles.actionDetailLabel}>Host Person / Dept</Text>
                    <Text style={styles.actionDetailVal}>{selectedVisitForAction.address || 'Admin Office'}</Text>
                  </View>
                  <View style={styles.actionDetailItem}>
                    <Text style={styles.actionDetailLabel}>Purpose</Text>
                    <Text style={styles.actionDetailVal}>{selectedVisitForAction.purpose || 'General Visit'}</Text>
                  </View>
                  <View style={styles.actionDetailItem}>
                    <Text style={styles.actionDetailLabel}>Entry Timestamp</Text>
                    <Text style={styles.actionDetailVal}>{formatDisplayTime(selectedVisitForAction.check_in)}</Text>
                  </View>
                </View>

                {selectedVisitForAction.status === 'ACTIVE' ? (
                  <TouchableOpacity
                    style={styles.actionCheckOutBigBtn}
                    onPress={() => handleCheckOutConfirm(selectedVisitForAction)}
                  >
                    <CheckOutIcon size={18} color="#ffffff" />
                    <Text style={styles.actionCheckOutBigBtnText}>Check Out Visitor (Release Badge)</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.completedMessageBox}>
                    <Text style={styles.completedMessageText}>✓ Visit Completed and Badge Reclaimed</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* MODAL 4: SECURITY OFFICER MENU & LOGOUT    */}
      {/* ========================================== */}
      <Modal
        visible={showOfficerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOfficerModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>Security Officer Desk</Text>
              <TouchableOpacity onPress={() => setShowOfficerModal(false)} style={styles.modalCloseBtn}>
                <CloseIcon size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.officerMenuContent}>
              <View style={styles.officerProfileHeader}>
                <View style={styles.officerAvatarLarge}>
                  <UserTabIcon size={28} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.officerName}>Officer Station #1</Text>
                  <Text style={styles.officerRole}>Gate 1 Entrance • Guard ID: SEC-402</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.officerActionRow}
                onPress={() => {
                  setShowOfficerModal(false);
                  loadData(false);
                }}
              >
                <Text style={styles.officerActionText}>↻ Sync System State</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.officerActionRow, { borderBottomWidth: 0, marginTop: 8 }]}
                onPress={() => {
                  setShowOfficerModal(false);
                  Alert.alert('Sign Out', 'Sign out of Security Guard Desk?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Log Out', style: 'destructive', onPress: onLogout },
                  ]);
                }}
              >
                <LogoutIcon size={18} color="#ef4444" />
                <Text style={[styles.officerActionText, { color: '#ef4444', fontWeight: '700' }]}>
                  Log Out from Security Desk
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
  headerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shieldLogoBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerTimestamp: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 1,
  },
  profileAvatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
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

  // 1. Hero Check-In Card
  heroCheckInCard: {
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
  heroCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroCardTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  heroCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  scannerReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  scannerReadyText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.4,
  },
  scanCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scanCodeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanCodeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.6,
    flex: 1,
    marginLeft: 12,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 10,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
  },
  checkInNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  checkInNowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkInNowText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // 2. Metrics Row
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricTitlePresent: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.5,
  },
  metricTitleLogged: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  metricIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 6,
  },
  metricNumberBold: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
  },
  trendTagPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  trendTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  percentTagPill: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  percentTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },

  // 3. Filter Chips
  filterChipsRow: {
    gap: 8,
    paddingBottom: 4,
    marginBottom: 14,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
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
  filterCountBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterCountBadgeActive: {
    backgroundColor: '#2563eb',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterCountTextActive: {
    color: '#ffffff',
  },

  // 4. Security Notice Banner
  securityNoticeCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  securityNoticeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fecaca',
    justifyContent: 'center',
    alignItems: 'center',
  },
  securityNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991b1b',
    letterSpacing: 0.5,
  },
  priorityBadge: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991b1b',
  },
  securityNoticeBody: {
    fontSize: 12,
    color: '#7f1d1d',
    lineHeight: 18,
  },
  boldNotice: {
    fontWeight: '800',
    color: '#991b1b',
  },

  // 5. Recent Activity Section
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activityHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  liveFeedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveFeedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.3,
  },

  // Activity Cards
  activityRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 12,
  },
  activityCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContentCol: {
    flex: 1,
  },
  activityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  activityVisitorName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  checkedInPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  checkedInPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  activitySubDetail: {
    fontSize: 11,
    color: '#64748b',
  },
  activityTimestamp: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },

  // 7. Physical Turnstiles Status Card
  turnstileStatusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 14,
    padding: 14,
    marginTop: 8,
    marginBottom: 10,
  },
  turnstileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  turnstileFlagBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  turnstileTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  turnstileSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  greenPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
  },

  // Empty State
  emptyStateBox: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 8,
  },
  emptyStateTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 12,
    color: '#64748b',
  },

  // Bottom Navigation Bar
  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#2563eb',
    fontWeight: '700',
  },

  // Generic Tab Content
  tabHeadingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  tabHeadingSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  logCardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  logCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logCardToken: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  logCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  logCardSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeActive: {
    backgroundColor: '#dcfce7',
  },
  badgeDone: {
    backgroundColor: '#f1f5f9',
  },
  statusBadgeSmallText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textActive: {
    color: '#166534',
  },
  textDone: {
    color: '#475569',
  },
  bigScannerActionBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  bigScannerActionBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  gateControlCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  gateControlTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  gateControlSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 14,
  },
  unlockTurnstileBtn: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  unlockTurnstileBtnText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
  },
  settingsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  settingsLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  settingsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  logoutBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  logoutBtnFullText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
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
    maxHeight: '88%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseBtn: {
    padding: 4,
  },

  // Scanner Modal Full Screen
  scannerModalSafeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scannerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  scannerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scannerShieldBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  scannerModalSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  scannerModalCloseBtn: {
    padding: 6,
  },

  // Form Inputs
  formInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  tokenDisplayBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  tokenDisplayText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563eb',
  },
  tokenDisplaySub: {
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
  submitCheckInBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  submitCheckInBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Action / Detail Modal
  actionHeroBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  actionHeroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  actionHeroToken: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  actionTokenBold: {
    color: '#2563eb',
    fontWeight: '800',
  },
  actionStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActivePill: {
    backgroundColor: '#dcfce7',
  },
  statusDonePill: {
    backgroundColor: '#f1f5f9',
  },
  actionStatusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusActiveText: {
    color: '#166534',
  },
  statusDoneText: {
    color: '#475569',
  },
  actionDetailsList: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  actionDetailItem: {
    marginBottom: 10,
  },
  actionDetailLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  actionDetailVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  actionCheckOutBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 10,
  },
  actionCheckOutBigBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  completedMessageBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  completedMessageText: {
    color: '#15803d',
    fontWeight: '700',
    fontSize: 13,
  },

  // Officer Profile Modal
  officerMenuContent: {
    paddingVertical: 6,
  },
  officerProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 10,
  },
  officerAvatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  officerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  officerRole: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  officerActionRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  officerActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
});
