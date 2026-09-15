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
  UserTabIcon,
  QrScanCornerIcon,
  SearchIcon,
  CloseIcon,
  ArrowRightIcon,
  UsersIcon,
  BadgePassIcon,
  CheckCircleIcon,
  FlagIcon,
  AlertTriangleIcon,
  CheckOutIcon,
  LogoutIcon,
  GridIcon,
  LogsTabIcon,
  AccessTabIcon,
  AlertsTabIcon,
  SettingsTabIcon,
} from '../components/AdminIcons';

// Extracted components & styles
import s from '../styles/securityStyles';
import {
  ScannerModal,
  CheckInModal,
  VisitActionModal,
  OfficerModal,
} from '../components/security/SecurityModals';

// ── Helpers ───────────────────────────────────────────────────
function formatClockTime(date = new Date()) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const timeStr = date.toTimeString().split(' ')[0];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} | ${timeStr}`;
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

// ── Component ─────────────────────────────────────────────────
export default function SecurityPortal({ onLogout }) {
  // ── Navigation ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('dashboard');

  // ── Dashboard Filters ────────────────────────────────────────
  const [selectedFilter, setSelectedFilter] = useState('INSIDE');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Live Clock ───────────────────────────────────────────────
  const [currentClock, setCurrentClock] = useState(formatClockTime());
  useEffect(() => {
    const timer = setInterval(() => setCurrentClock(formatClockTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Data ─────────────────────────────────────────────────────
  const [tokensList, setTokensList] = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);
  const [scheduledVisits, setScheduledVisits] = useState([]);
  const [historyVisits, setHistoryVisits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Modals ───────────────────────────────────────────────────
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showOfficerModal, setShowOfficerModal] = useState(false);
  const [selectedVisitForAction, setSelectedVisitForAction] = useState(null);

  // ── Check-In Form ────────────────────────────────────────────
  const [regFullName, setRegFullName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regHost, setRegHost] = useState('');
  const [regPurpose, setRegPurpose] = useState('General Visit');
  const [regTokenCode, setRegTokenCode] = useState('');
  const [regDuration] = useState('2 Hours');
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);

  // ── Derived ──────────────────────────────────────────────────
  const availableTokens = useMemo(
    () => tokensList.filter((t) => t.status === 'AVAILABLE'),
    [tokensList]
  );
  const totalTodayCount = activeVisits.length + scheduledVisits.length + historyVisits.length;

  const activeVipVisit = useMemo(
    () => [...activeVisits, ...scheduledVisits].find((v) => v.is_vip || v.category === 'VIP'),
    [activeVisits, scheduledVisits]
  );

  const recentActivities = useMemo(() => {
    let list = [];
    if (selectedFilter === 'INSIDE') {
      list = activeVisits;
    } else if (selectedFilter === 'EXPECTED') {
      list = scheduledVisits.length > 0 ? scheduledVisits : activeVisits.filter((v) => v.purpose?.toLowerCase().includes('interview'));
    } else if (selectedFilter === 'VIP') {
      list = [...activeVisits, ...scheduledVisits, ...historyVisits].filter(
        (v) => v.is_vip || v.category === 'VIP' || v.purpose?.toLowerCase().includes('vip') || v.address?.toLowerCase().includes('vip')
      );
    } else {
      list = [...activeVisits, ...scheduledVisits, ...historyVisits];
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        item.full_name?.toLowerCase().includes(q) ||
        item.mobile?.toLowerCase().includes(q) ||
        item.token_code?.toLowerCase().includes(q) ||
        item.company?.toLowerCase().includes(q) ||
        item.address?.toLowerCase().includes(q) ||
        item.purpose?.toLowerCase().includes(q)
    );
  }, [activeVisits, scheduledVisits, historyVisits, selectedFilter, searchQuery]);

  // ── Data Loading ─────────────────────────────────────────────
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

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => { setRefreshing(true); await loadData(true); };

  // ── Handlers ─────────────────────────────────────────────────
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
      Alert.alert('Verification Failed', 'Could not verify token with server');
    } finally {
      setLoading(false);
    }
  };

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
        Alert.alert('No Available Tokens', 'All QR badges are currently in use.');
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
        setRegFullName(''); setRegMobile(''); setRegHost(''); setRegTokenCode('');
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} tintColor="#2563eb" />
      }
    >
      {/* Hero Check-In Card */}
      <View style={s.heroCheckInCard}>
        <View style={s.heroCardHeaderRow}>
          <View style={s.heroCardTitleLeft}>
            <View style={s.blueDot} />
            <Text style={s.heroCardTitle}>New Visitor Check-In</Text>
          </View>
          <View style={s.scannerReadyBadge}>
            <View style={s.greenDot} />
            <Text style={s.scannerReadyText}>SCANNER READY</Text>
          </View>
        </View>

        <TouchableOpacity style={s.scanCodeBtn} activeOpacity={0.85} onPress={() => setShowScannerModal(true)}>
          <View style={s.scanCodeIconCircle}>
            <QrScanCornerIcon size={20} color="#ffffff" />
          </View>
          <Text style={s.scanCodeBtnText}>SCAN ID / QR CODE</Text>
          <ArrowRightIcon size={17} color="#ffffff" />
        </TouchableOpacity>

        <View style={s.searchBarBox}>
          <SearchIcon size={17} color="#64748b" />
          <TextInput
            style={s.searchBarInput}
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

      {/* Stats Row */}
      <View style={s.metricsRow}>
        <View style={s.metricCard}>
          <View style={s.metricHeaderRow}>
            <Text style={s.metricTitlePresent}>PRESENT</Text>
            <View style={s.metricIconBox}><UsersIcon size={18} color="#2563eb" /></View>
          </View>
          <View style={s.metricNumberRow}>
            <Text style={s.metricNumberBold}>{activeVisits.length || 14}</Text>
            <View style={s.trendTagPill}>
              <Text style={s.trendTagText}>📈 +{Math.max(1, activeVisits.length || 3)}</Text>
            </View>
          </View>
          <Text style={s.metricSubtitle}>Visitors on Campus</Text>
        </View>

        <View style={s.metricCard}>
          <View style={s.metricHeaderRow}>
            <Text style={s.metricTitleLogged}>LOGGED</Text>
            <View style={s.metricIconBox}><BadgePassIcon size={18} color="#15803d" /></View>
          </View>
          <View style={s.metricNumberRow}>
            <Text style={[s.metricNumberBold, { color: '#15803d' }]}>{totalTodayCount || 38}</Text>
            <View style={s.percentTagPill}><Text style={s.percentTagText}>100%</Text></View>
          </View>
          <Text style={s.metricSubtitle}>Total Arrivals Today</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterChipsRow}>
        {[
          { key: 'INSIDE', label: 'Currently Inside', count: activeVisits.length || 14 },
          { key: 'EXPECTED', label: 'Expected', count: 24 },
          { key: 'VIP', label: 'VIP Pre-approved', count: null },
          { key: 'ALL', label: `All Logs (${totalTodayCount})`, count: null },
        ].map(({ key, label, count }) => (
          <TouchableOpacity
            key={key}
            style={[s.filterChip, selectedFilter === key && s.filterChipActive]}
            onPress={() => setSelectedFilter(key)}
          >
            <Text style={[s.filterChipText, selectedFilter === key && s.filterChipTextActive]}>{label}</Text>
            {count !== null && (
              <View style={[s.filterCountBadge, selectedFilter === key && s.filterCountBadgeActive]}>
                <Text style={[s.filterCountText, selectedFilter === key && s.filterCountTextActive]}>{count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Security Notice Banner */}
      <View style={s.securityNoticeCard}>
        <View style={s.securityNoticeTop}>
          <View style={s.securityNoticeLeft}>
            <View style={s.alertIconBox}><AlertTriangleIcon size={16} color="#991b1b" /></View>
            <Text style={s.securityNoticeTitle}>SECURITY NOTICE</Text>
          </View>
          <View style={s.priorityBadge}><Text style={s.priorityBadgeText}>GATE 1 PRIORITY</Text></View>
        </View>
        <Text style={s.securityNoticeBody}>
          <Text style={s.boldNotice}>VIP Arrival: </Text>
          {activeVipVisit
            ? `${activeVipVisit.full_name} (${activeVipVisit.company || 'VIP Guest'}) cleared for ${activeVipVisit.address || 'Main Auditorium'} with Badge #${activeVipVisit.token_code}. Priority status confirmed.`
            : 'Dr. Sarah Jenkins cleared for Main Auditorium (ETA 5m). Watchlist check confirmed safe.'}
        </Text>
      </View>

      {/* Recent Activity Header */}
      <View style={s.activityHeaderRow}>
        <Text style={s.activityHeaderTitle}>Recent Check-In Activity</Text>
        <View style={s.liveFeedBadge}>
          <View style={s.greenDot} />
          <Text style={s.liveFeedText}>LIVE FEED</Text>
        </View>
      </View>

      {/* Activity List */}
      {recentActivities.length === 0 ? (
        <View style={s.emptyStateBox}>
          <Text style={s.emptyStateTitle}>No visitor activity recorded</Text>
          <Text style={s.emptyStateSub}>Check in a visitor above or tap Scan ID</Text>
        </View>
      ) : (
        recentActivities.map((item, idx) => {
          const hostLabel = item.host || item.address || 'Dr. Aris (EE Dept)';
          const badgeNumber = item.token_code || `V-0${idx + 1}`;
          const isInside = item.status === 'ACTIVE';
          const isScheduled = item.status === 'SCHEDULED';
          const isVip = item.is_vip || item.category === 'VIP' || (item.purpose && item.purpose.toLowerCase().includes('vip'));
          return (
            <TouchableOpacity
              key={item.id || item.token_code || idx}
              style={[
                s.activityRowCard,
                isVip && { borderColor: '#fde047', borderWidth: 1.5, backgroundColor: '#fefce8' },
              ]}
              activeOpacity={0.8}
              onPress={() => setSelectedVisitForAction(item)}
            >
              <View style={s.activityCheckCircle}>
                <CheckCircleIcon size={18} color={isInside ? '#15803d' : isScheduled ? '#f59e0b' : '#64748b'} />
              </View>
              <View style={s.activityContentCol}>
                <View style={s.activityNameRow}>
                  <Text style={s.activityVisitorName} numberOfLines={1}>
                    {item.full_name || 'Visitor Name'}
                  </Text>
                  {isVip && (
                    <View style={{ backgroundColor: '#fde047', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#854d0e' }}>👑 VIP</Text>
                    </View>
                  )}
                  <View style={[s.checkedInPill, isScheduled && { backgroundColor: '#fef3c7' }]}>
                    <Text style={[s.checkedInPillText, isScheduled && { color: '#b45309' }]}>
                      {isScheduled ? 'Scheduled' : isInside ? 'Checked In' : 'Checked Out'}
                    </Text>
                  </View>
                </View>
                <Text style={s.activitySubDetail} numberOfLines={1}>
                  {item.gate || 'Gate 1 Turnstile'} • Host: {hostLabel} • #{badgeNumber}
                  {item.company ? ` • ${item.company}` : ''}
                </Text>
              </View>
              <Text style={s.activityTimestamp}>
                {isScheduled ? (item.time_window ? item.time_window.split('-')[0].trim() : 'Scheduled') : formatDisplayTime(item.check_in)}
              </Text>
            </TouchableOpacity>
          );
        })
      )}

      {/* Turnstile Status */}
      <View style={s.turnstileStatusCard}>
        <View style={s.turnstileLeft}>
          <View style={s.turnstileFlagBox}><FlagIcon size={18} color="#2563eb" /></View>
          <View>
            <Text style={s.turnstileTitle}>Gate 1 Physical Turnstiles</Text>
            <Text style={s.turnstileSubtitle}>Relay: Online • Latency: 18ms</Text>
          </View>
        </View>
        <View style={s.greenPulseDot} />
      </View>
    </ScrollView>
  );

  const renderLogsTab = () => (
    <ScrollView
      style={s.scrollArea}
      contentContainerStyle={s.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={s.tabHeadingTitle}>Gate Audit Logs</Text>
      <Text style={s.tabHeadingSub}>All entry and exit events processed at this station</Text>

      {[...activeVisits, ...historyVisits].map((v) => (
        <TouchableOpacity
          key={v.id || v.token_code}
          style={s.logCardItem}
          onPress={() => setSelectedVisitForAction(v)}
        >
          <View style={s.logCardLeft}>
            <Text style={s.logCardToken}>{v.token_code}</Text>
            <View>
              <Text style={s.logCardName}>{v.full_name}</Text>
              <Text style={s.logCardSub}>
                In: {formatDisplayTime(v.check_in)} • Out: {formatDisplayTime(v.check_out)}
              </Text>
            </View>
          </View>
          <View style={[s.statusBadgeSmall, v.status === 'ACTIVE' ? s.badgeActive : s.badgeDone]}>
            <Text style={[s.statusBadgeSmallText, v.status === 'ACTIVE' ? s.textActive : s.textDone]}>
              {v.status === 'ACTIVE' ? 'INSIDE' : 'EXITED'}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderAccessTab = () => (
    <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent}>
      <Text style={s.tabHeadingTitle}>Gate Access Control</Text>
      <Text style={s.tabHeadingSub}>Manual barrier unlock and badge scanning</Text>

      <TouchableOpacity style={s.bigScannerActionBtn} onPress={() => setShowScannerModal(true)}>
        <QrScanCornerIcon size={32} color="#ffffff" />
        <Text style={s.bigScannerActionBtnText}>Launch Camera QR Scanner</Text>
      </TouchableOpacity>

      <View style={s.gateControlCard}>
        <Text style={s.gateControlTitle}>Manual Barrier Trigger</Text>
        <Text style={s.gateControlSub}>Emergency or authorized manual override</Text>
        <TouchableOpacity
          style={s.unlockTurnstileBtn}
          onPress={() => Alert.alert('Turnstile Relay', 'Turnstile Gate 1 unlocked for 10 seconds.')}
        >
          <Text style={s.unlockTurnstileBtnText}>🔓 Momentary Gate Unlock (10s)</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderAlertsTab = () => (
    <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent}>
      <Text style={s.tabHeadingTitle}>Security Station Alerts</Text>
      <Text style={s.tabHeadingSub}>Live security notices and watchlist checks</Text>

      <View style={s.securityNoticeCard}>
        <View style={s.securityNoticeTop}>
          <View style={s.securityNoticeLeft}>
            <AlertTriangleIcon size={16} color="#991b1b" />
            <Text style={s.securityNoticeTitle}>SECURITY NOTICE</Text>
          </View>
          <View style={s.priorityBadge}><Text style={s.priorityBadgeText}>GATE 1 PRIORITY</Text></View>
        </View>
        <Text style={s.securityNoticeBody}>
          <Text style={s.boldNotice}>VIP Arrival: </Text>
          Dr. Sarah Jenkins cleared for Main Auditorium (ETA 5m). Watchlist check confirmed safe.
        </Text>
      </View>

      <View style={[s.securityNoticeCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
        <View style={s.securityNoticeTop}>
          <View style={s.securityNoticeLeft}>
            <CheckOutIcon size={16} color="#15803d" />
            <Text style={[s.securityNoticeTitle, { color: '#15803d' }]}>WATCHLIST CLEAR</Text>
          </View>
          <Text style={{ fontSize: 11, color: '#64748b' }}>Updated 10m ago</Text>
        </View>
        <Text style={[s.securityNoticeBody, { color: '#166534' }]}>
          Campus Security Database is synced with national watchlist. No flagged individuals detected today.
        </Text>
      </View>
    </ScrollView>
  );

  const renderSettingsTab = () => (
    <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent}>
      <Text style={s.tabHeadingTitle}>Station Settings</Text>
      <Text style={s.tabHeadingSub}>Gate 1 Entrance Terminal</Text>

      <View style={s.settingsSection}>
        {[
          { label: 'Station ID', val: 'GATE-01-DESK' },
          { label: 'Guard On Duty', val: 'Security Officer (DEMO)' },
          { label: 'Turnstile Status', val: 'Online (Relay OK)', green: true },
        ].map(({ label, val, green }) => (
          <View key={label} style={s.settingsRow}>
            <Text style={s.settingsLabel}>{label}</Text>
            <Text style={[s.settingsValue, green && { color: '#15803d' }]}>{val}</Text>
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
        <LogoutIcon size={18} color="#ef4444" />
        <Text style={s.logoutBtnFullText}>Sign Out from Security Desk</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Main Render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={s.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Header */}
      <View style={s.topHeader}>
        <View style={s.headerLeftCol}>
          <View style={s.shieldLogoBox}><ShieldIcon size={20} color="#ffffff" /></View>
          <View>
            <Text style={s.headerTitle}>Dashboard</Text>
            <Text style={s.headerTimestamp}>{currentClock}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.profileAvatarBtn} onPress={() => setShowOfficerModal(true)} activeOpacity={0.8}>
          <UserTabIcon size={17} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={s.screenContainer}>
        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'logs' && renderLogsTab()}
        {activeTab === 'access' && renderAccessTab()}
        {activeTab === 'alerts' && renderAlertsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </View>

      {/* Bottom 5-Tab Navigation */}
      <View style={s.bottomTabBar}>
        {[
          { key: 'dashboard', label: 'Dashboard', Icon: GridIcon },
          { key: 'logs', label: 'Logs', Icon: LogsTabIcon },
          { key: 'access', label: 'Access', Icon: AccessTabIcon },
          { key: 'alerts', label: 'Alerts', Icon: AlertsTabIcon },
          { key: 'settings', label: 'Settings', Icon: SettingsTabIcon },
        ].map(({ key, label, Icon }) => (
          <TouchableOpacity key={key} style={s.tabItem} onPress={() => setActiveTab(key)} activeOpacity={0.8}>
            <Icon size={21} color={activeTab === key ? '#2563eb' : '#64748b'} />
            <Text style={[s.tabLabel, activeTab === key && s.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Modals ────────────────────────────────────────────── */}
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
    </SafeAreaView>
  );
}
