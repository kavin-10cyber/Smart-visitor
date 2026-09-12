import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
  Linking,
  BackHandler,
} from 'react-native';
import QRCodeDisplay from '../components/QRCodeDisplay';
import { api, getDownloadUrl, getBadgeUrl } from '../services/api';

export default function AdminPortal({ onLogout }) {
  const [currentTab, setCurrentTab] = useState('menu'); // 'menu' | 'generate' | 'tokens' | 'visitors'
  const [tokens, setTokens] = useState([]);
  const [latestGeneratedToken, setLatestGeneratedToken] = useState(null);
  const [activeVisits, setActiveVisits] = useState([]);
  const [historyVisits, setHistoryVisits] = useState([]);
  const [visitorFilter, setVisitorFilter] = useState('CURRENT'); // 'CURRENT' | 'HISTORY'
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch Tokens and Visits on mount or refresh
  const loadData = async () => {
    setLoading(true);
    try {
      const tokenRes = await api.getTokens();
      if (tokenRes.success) {
        setTokens(tokenRes.tokens || []);
      }

      const visitRes = await api.getVisits(searchQuery);
      if (visitRes.success) {
        setActiveVisits(visitRes.activeVisits || []);
        setHistoryVisits(visitRes.historyVisits || []);
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery]);

  // Handle Android back swipe/button to navigate back one screen
  useEffect(() => {
    const handleBackPress = () => {
      if (currentTab !== 'menu') {
        setCurrentTab('menu');
        return true;
      }
      return false;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backSubscription.remove();
  }, [currentTab]);

  const handleGenerateNewQR = async () => {
    setLoading(true);
    try {
      const res = await api.generateToken();
      if (res.success && res.token) {
        setLatestGeneratedToken(res.token);
        setCurrentTab('generate');
        await loadData();
      } else {
        Alert.alert('Error', res.message || 'Failed to generate token');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to communicate with backend server');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Render Top Menu Dashboard
  const renderMenu = () => (
    <ScrollView
      style={styles.viewSection}
      contentContainerStyle={styles.viewSectionContent}
      showsVerticalScrollIndicator={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#2563eb']}
          tintColor="#2563eb"
        />
      }
    >
      <View style={styles.menuContainer}>
        <Text style={styles.welcomeTitle}>ADMIN PORTAL</Text>
        <Text style={styles.subtitle}>Generate tokens and manage campus visitor records</Text>

        {/* Main Action Buttons as required */}
        <View style={styles.actionButtonsCol}>
          <TouchableOpacity
            style={[styles.mainActionBtn, styles.generateBtn]}
            onPress={handleGenerateNewQR}
            disabled={loading}
          >
            <Text style={styles.mainActionIcon}>⚡</Text>
            <Text style={styles.mainActionBtnText}>GENERATE NEW QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainActionBtn, styles.viewVisitorsBtn]}
            onPress={() => setCurrentTab('visitors')}
          >
            <Text style={styles.mainActionIcon}>👥</Text>
            <Text style={styles.mainActionBtnText}>VIEW VISITORS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainActionBtn, styles.tokensBtn]}
            onPress={() => setCurrentTab('tokens')}
          >
            <Text style={styles.mainActionIcon}>📋</Text>
            <Text style={styles.mainActionBtnText}>QR TOKEN LIST ({tokens.length})</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Summary Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{tokens.length}</Text>
            <Text style={styles.statLabel}>Total Tokens</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#2563eb' }]}>{activeVisits.length}</Text>
            <Text style={styles.statLabel}>Inside Campus</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: '#16a34a' }]}>{historyVisits.length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // Render Newly Generated QR View
  const renderGenerateView = () => (
    <ScrollView
      style={styles.viewSection}
      contentContainerStyle={styles.viewSectionContent}
      showsVerticalScrollIndicator={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#2563eb']}
          tintColor="#2563eb"
        />
      }
    >
      <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentTab('menu')}>
        <Text style={styles.backBtnText}>← Back to Admin Portal</Text>
      </TouchableOpacity>

      <Text style={styles.screenHeader}>NEW QR TOKEN GENERATED</Text>

      {latestGeneratedToken ? (
        <View style={styles.qrDisplayWrapper}>
          <QRCodeDisplay
            tokenCode={latestGeneratedToken.token_code}
            status={latestGeneratedToken.status}
          />
          <TouchableOpacity style={styles.primaryActionBtn} onPress={handleGenerateNewQR}>
            <Text style={styles.primaryActionText}>⚡ GENERATE ANOTHER QR TOKEN</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );

  // Render QR Token List Screen
  const renderTokensList = () => (
    <ScrollView
      style={styles.viewSection}
      contentContainerStyle={styles.viewSectionContent}
      showsVerticalScrollIndicator={true}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
    >
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentTab('menu')}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallGenerateBtn} onPress={handleGenerateNewQR}>
          <Text style={styles.smallGenerateBtnText}>+ GENERATE NEW QR</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.screenHeader}>ALL GENERATED QR TOKENS</Text>
      <Text style={styles.screenSubheader}>Physical reusable cards/tokens registered in Supabase</Text>

      {tokens.map((item) => {
        const isAvail = item.status === 'AVAILABLE';
        return (
          <TouchableOpacity
            key={item.id || item.token_code}
            style={styles.tokenRowCard}
            onPress={() => {
              setLatestGeneratedToken(item);
              setCurrentTab('generate');
            }}
          >
            <View style={styles.tokenCodeCol}>
              <Text style={styles.tokenRowCode}>{item.token_code}</Text>
              <Text style={styles.tokenRowSub}>Card ID: {item.token_code} • Tap to view QR</Text>
            </View>
            <View style={[styles.statusBadge, isAvail ? styles.badgeAvail : styles.badgeInUse]}>
              <Text style={[styles.statusBadgeText, isAvail ? styles.textAvail : styles.textInUse]}>
                {item.status}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // Render Visitor Details & History View
  const renderVisitorsView = () => {
    const listToDisplay = visitorFilter === 'CURRENT' ? activeVisits : historyVisits;

    return (
      <ScrollView
        style={styles.viewSection}
        contentContainerStyle={styles.viewSectionContent}
        showsVerticalScrollIndicator={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentTab('menu')}>
          <Text style={styles.backBtnText}>← Back to Admin Portal</Text>
        </TouchableOpacity>

        <Text style={styles.screenHeader}>VISITOR MANAGEMENT</Text>

        {/* Search Field */}
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search visitor / mobile / token"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Tab Filters: [ CURRENT ] [ HISTORY ] */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, visitorFilter === 'CURRENT' && styles.tabBtnActive]}
            onPress={() => setVisitorFilter('CURRENT')}
          >
            <Text style={[styles.tabBtnText, visitorFilter === 'CURRENT' && styles.tabBtnTextActive]}>
              CURRENT ({activeVisits.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, visitorFilter === 'HISTORY' && styles.tabBtnActive]}
            onPress={() => setVisitorFilter('HISTORY')}
          >
            <Text style={[styles.tabBtnText, visitorFilter === 'HISTORY' && styles.tabBtnTextActive]}>
              HISTORY ({historyVisits.length})
            </Text>
          </TouchableOpacity>
        </View>

        {listToDisplay.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No {visitorFilter.toLowerCase()} visitors found.
            </Text>
          </View>
        ) : (
          listToDisplay.map((item) => {
            const isInside = item.status === 'ACTIVE';

            return (
              <View key={item.id} style={styles.visitorCard}>
                <View style={styles.visitorHeaderRow}>
                  <Text style={styles.visitorName}>{item.full_name}</Text>
                  <View style={[styles.vBadge, isInside ? styles.vBadgeInside : styles.vBadgeDone]}>
                    <Text style={[styles.vBadgeText, isInside ? styles.vTextInside : styles.vTextDone]}>
                      {isInside ? 'INSIDE' : 'COMPLETED'}
                    </Text>
                  </View>
                </View>

                <View style={styles.visitorDetailRow}>
                  <Text style={styles.detailLabel}>Token:</Text>
                  <Text style={styles.tokenHighlight}>{item.token_code}</Text>
                </View>

                <View style={styles.visitorDetailRow}>
                  <Text style={styles.detailLabel}>Mobile:</Text>
                  <Text style={styles.detailVal}>{item.mobile}</Text>
                </View>

                <View style={styles.visitorDetailRow}>
                  <Text style={styles.detailLabel}>Address:</Text>
                  <Text style={styles.detailVal}>{item.address}</Text>
                </View>

                <View style={styles.visitorDetailRow}>
                  <Text style={styles.detailLabel}>Purpose:</Text>
                  <Text style={styles.detailVal}>{item.purpose}</Text>
                </View>

                <View style={styles.visitorDetailRow}>
                  <Text style={styles.detailLabel}>Check-in:</Text>
                  <Text style={styles.detailVal}>{formatTime(item.check_in)}</Text>
                </View>

                {isInside ? (
                  <View style={styles.visitorDetailRow}>
                    <Text style={styles.detailLabel}>Expected Checkout:</Text>
                    <Text style={styles.detailVal}>Within {item.expected_duration}</Text>
                  </View>
                ) : (
                  <View style={styles.visitorDetailRow}>
                    <Text style={styles.detailLabel}>Check-out:</Text>
                    <Text style={styles.detailVal}>{formatTime(item.check_out)}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Navbar */}
      <View style={styles.navbar}>
        <View>
          <Text style={styles.navbarTitle}>Smart Campus</Text>
          <Text style={styles.navbarSub}>Visitor Management</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>
        {currentTab === 'menu' && renderMenu()}
        {currentTab === 'generate' && renderGenerateView()}
        {currentTab === 'tokens' && renderTokensList()}
        {currentTab === 'visitors' && renderVisitorsView()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    maxHeight: '100%',
    minHeight: 0,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  navbarTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  navbarSub: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '500',
  },
  logoutBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  menuContainer: {
    flex: 1,
    height: '100%',
    overflowY: 'auto',
    padding: 20,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 24,
  },
  actionButtonsCol: {
    gap: 14,
    marginBottom: 24,
  },
  mainActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  generateBtn: {
    backgroundColor: '#2563eb',
  },
  viewVisitorsBtn: {
    backgroundColor: '#0f172a',
  },
  tokensBtn: {
    backgroundColor: '#475569',
  },
  mainActionIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  mainActionBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 4,
  },
  viewSection: {
    flex: 1,
    height: '100%',
    maxHeight: '100%',
    overflowY: 'auto',
  },
  viewSectionContent: {
    padding: 20,
    paddingBottom: 260,
    flexGrow: 1,
  },
  backBtn: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  backBtnText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
  },
  screenHeader: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  screenSubheader: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
  },
  qrDisplayWrapper: {
    alignItems: 'center',
    marginTop: 10,
  },
  primaryActionBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  smallGenerateBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallGenerateBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  tokenRowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tokenCodeCol: {
    gap: 2,
  },
  tokenRowCode: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  tokenRowSub: {
    fontSize: 12,
    color: '#94a3b8',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeAvail: {
    backgroundColor: '#dcfce7',
  },
  badgeInUse: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  textAvail: {
    color: '#15803d',
  },
  textInUse: {
    color: '#b45309',
  },
  searchBox: {
    marginVertical: 12,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#2563eb',
  },
  visitorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  visitorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  visitorName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  vBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  vBadgeInside: {
    backgroundColor: '#dbeafe',
  },
  vBadgeDone: {
    backgroundColor: '#f1f5f9',
  },
  vBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  vTextInside: {
    color: '#1d4ed8',
  },
  vTextDone: {
    color: '#475569',
  },
  visitorDetailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    width: 130,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  detailVal: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
  tokenHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
