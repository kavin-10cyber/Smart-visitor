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
} from 'react-native';
import QRScanner from '../components/QRScanner';
import { api } from '../services/api';

export default function SecurityPortal({ onLogout }) {
  // Screens: 'home' | 'scanner' | 'register' | 'checkin_success' | 'checkout_confirm' | 'checkout_success' | 'invalid_qr'
  const [screen, setScreen] = useState('home');

  const [tokensList, setTokensList] = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);

  // Active transaction state
  const [scannedTokenCode, setScannedTokenCode] = useState('');
  const [scannedToken, setScannedToken] = useState(null);
  const [activeVisitData, setActiveVisitData] = useState(null);

  // Form State for Visitor Registration
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [purpose, setPurpose] = useState('');
  const [expectedDuration, setExpectedDuration] = useState('1 Hour');

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const tokenRes = await api.getTokens();
      if (tokenRes.success) {
        setTokensList(tokenRes.tokens || []);
      }

      const visitRes = await api.getVisits();
      if (visitRes.success) {
        setActiveVisits(visitRes.activeVisits || []);
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

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return isoString;
    }
  };

  // Process Scanned QR Token Code
  const handleScanSuccess = async (tokenCode) => {
    setScannedTokenCode(tokenCode);
    setLoading(true);

    try {
      const res = await api.verifyToken(tokenCode);

      if (!res.exists) {
        // CASE 3: Token does not exist
        setScreen('invalid_qr');
        return;
      }

      setScannedToken(res.token);

      if (res.status === 'IN USE' && res.activeVisit) {
        // CASE 2: Token exists + IN USE
        setActiveVisitData(res.activeVisit);
        setScreen('checkout_confirm');
      } else {
        // CASE 1: Token exists + AVAILABLE
        // Reset registration form
        setFullName('');
        setMobile('');
        setAddress('');
        setPurpose('');
        setExpectedDuration('1 Hour');
        setScreen('register');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to verify token with database server');
      setScreen('home');
    } finally {
      setLoading(false);
    }
  };

  // Perform Check In Action
  const handleCheckInSubmit = async () => {
    if (!fullName.trim() || !mobile.trim() || !address.trim() || !purpose.trim()) {
      Alert.alert('Form Error', 'Please fill in all visitor fields (Name, Mobile, Address, Purpose)');
      return;
    }

    setLoading(true);
    try {
      const res = await api.checkInVisitor({
        token_code: scannedTokenCode,
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        address: address.trim(),
        purpose: purpose.trim(),
        expected_duration: expectedDuration,
      });

      if (res.success && res.visit) {
        setActiveVisitData(res.visit);
        setScreen('checkin_success');
        await loadData();
      } else {
        Alert.alert('Check-In Error', res.message || 'Could not complete check-in');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Check-in request failed');
    } finally {
      setLoading(false);
    }
  };

  // Perform Check Out Action
  const handleCheckOutSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.checkOutVisitor(scannedTokenCode);

      if (res.success && res.visit) {
        setScreen('checkout_success');
        await loadData();
      } else {
        Alert.alert('Check-Out Error', res.message || 'Could not complete check-out');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Check-out request failed');
    } finally {
      setLoading(false);
    }
  };

  // 1. HOME SCREEN
  const renderHome = () => (
    <ScrollView
      style={styles.viewSection}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} />}
    >
      <Text style={styles.portalTitle}>SECURITY PORTAL</Text>
      <Text style={styles.portalSub}>Campus Entrance Guard Desk</Text>

      {/* Main Scan Button */}
      <TouchableOpacity
        style={styles.scanMainBtn}
        onPress={() => setScreen('scanner')}
        disabled={loading}
      >
        <Text style={styles.scanMainIcon}>📷</Text>
        <Text style={styles.scanMainText}>SCAN VISITOR QR</Text>
      </TouchableOpacity>

      {/* Current Active Visits List */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionHeader}>CURRENT ACTIVE VISITS ({activeVisits.length})</Text>

        {activeVisits.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No visitors currently inside campus.</Text>
          </View>
        ) : (
          activeVisits.map((visit) => (
            <TouchableOpacity
              key={visit.id}
              style={styles.activeVisitCard}
              onPress={() => handleScanSuccess(visit.token_code)}
            >
              <View style={styles.tokenPill}>
                <Text style={styles.tokenPillText}>{visit.token_code}</Text>
              </View>
              <View style={styles.visitMainInfo}>
                <Text style={styles.visitorNameText}>{visit.full_name}</Text>
                <Text style={styles.visitSubText}>Check-in: {formatTime(visit.check_in)}</Text>
              </View>
              <View style={styles.insideBadge}>
                <Text style={styles.insideBadgeText}>INSIDE</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );

  // 2. VISITOR REGISTRATION FORM
  const renderRegistrationForm = () => (
    <ScrollView style={styles.viewSection}>
      <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('home')}>
        <Text style={styles.backBtnText}>← Cancel Registration</Text>
      </TouchableOpacity>

      <Text style={styles.formTitle}>REGISTER VISITOR</Text>
      
      <View style={styles.tokenHeaderCard}>
        <Text style={styles.tokenHeaderLabel}>Assigned Token:</Text>
        <Text style={styles.tokenHeaderVal}>{scannedTokenCode}</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Full Name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Arun Kumar"
          placeholderTextColor="#94a3b8"
          value={fullName}
          onChangeText={setFullName}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Mobile Number</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. 9876543210"
          placeholderTextColor="#94a3b8"
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Address</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Chennai"
          placeholderTextColor="#94a3b8"
          value={address}
          onChangeText={setAddress}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Purpose of Visit</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. General Campus Visit"
          placeholderTextColor="#94a3b8"
          value={purpose}
          onChangeText={setPurpose}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Expected Visit Duration</Text>
        <View style={styles.durationRow}>
          {['30 Minutes', '1 Hour', '2 Hours'].map((dur) => {
            const isSel = expectedDuration === dur;
            return (
              <TouchableOpacity
                key={dur}
                style={[styles.durationChip, isSel && styles.durationChipSel]}
                onPress={() => setExpectedDuration(dur)}
              >
                <Text style={[styles.durationChipText, isSel && styles.durationChipTextSel]}>
                  {dur}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        style={styles.checkInSubmitBtn}
        onPress={handleCheckInSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.checkInSubmitText}>CHECK IN</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  // 3. CHECK IN SUCCESS SCREEN
  const renderCheckInSuccess = () => (
    <View style={styles.statusViewContainer}>
      <View style={styles.successIconBox}>
        <Text style={styles.successIcon}>✓</Text>
      </View>

      <Text style={styles.statusSuccessTitle}>VISITOR CHECKED IN</Text>
      <Text style={styles.visitorSuccessName}>{activeVisitData?.full_name}</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.sumLabel}>Token:</Text>
          <Text style={styles.sumValHighlight}>{scannedTokenCode}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.sumLabel}>Check-in:</Text>
          <Text style={styles.sumVal}>{formatTime(activeVisitData?.check_in)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.sumLabel}>Status:</Text>
          <Text style={[styles.sumVal, { color: '#2563eb', fontWeight: '800' }]}>INSIDE CAMPUS</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.doneBtn} onPress={() => setScreen('home')}>
        <Text style={styles.doneBtnText}>DONE</Text>
      </TouchableOpacity>
    </View>
  );

  // 4. CHECK OUT CONFIRMATION SCREEN
  const renderCheckOutConfirm = () => (
    <View style={styles.statusViewContainer}>
      <Text style={styles.statusTitle}>VISITOR CHECK OUT</Text>
      <Text style={styles.statusSubText}>Token is currently IN USE by active visitor</Text>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.sumLabel}>Visitor:</Text>
          <Text style={styles.sumValBold}>{activeVisitData?.full_name}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.sumLabel}>Token:</Text>
          <Text style={styles.sumValHighlight}>{scannedTokenCode}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.sumLabel}>Check-in:</Text>
          <Text style={styles.sumVal}>{formatTime(activeVisitData?.check_in)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.sumLabel}>Purpose:</Text>
          <Text style={styles.sumVal}>{activeVisitData?.purpose}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.checkOutActionBtn}
        onPress={handleCheckOutSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.checkOutActionText}>CHECK OUT</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={() => setScreen('home')}>
        <Text style={styles.secondaryBtnText}>CANCEL</Text>
      </TouchableOpacity>
    </View>
  );

  // 5. CHECK OUT SUCCESS SCREEN
  const renderCheckOutSuccess = () => (
    <View style={styles.statusViewContainer}>
      <View style={[styles.successIconBox, { backgroundColor: '#dcfce7' }]}>
        <Text style={[styles.successIcon, { color: '#16a34a' }]}>✓</Text>
      </View>

      <Text style={styles.statusSuccessTitle}>VISITOR CHECKED OUT</Text>
      <Text style={styles.reuseNoticeText}>
        Token {scannedTokenCode} is now available for reuse.
      </Text>

      <TouchableOpacity style={styles.doneBtn} onPress={() => setScreen('home')}>
        <Text style={styles.doneBtnText}>DONE</Text>
      </TouchableOpacity>
    </View>
  );

  // 6. INVALID QR CODE SCREEN
  const renderInvalidQR = () => (
    <View style={styles.statusViewContainer}>
      <View style={[styles.successIconBox, { backgroundColor: '#fef2f2' }]}>
        <Text style={[styles.successIcon, { color: '#dc2626' }]}>✕</Text>
      </View>

      <Text style={[styles.statusSuccessTitle, { color: '#dc2626' }]}>INVALID QR CODE</Text>
      <Text style={styles.reuseNoticeText}>
        Token code {scannedTokenCode} was not found in database.
      </Text>

      <TouchableOpacity style={styles.doneBtn} onPress={() => setScreen('scanner')}>
        <Text style={styles.doneBtnText}>SCAN AGAIN</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Navbar */}
      <View style={styles.navbar}>
        <View>
          <Text style={styles.navbarTitle}>Smart Campus</Text>
          <Text style={styles.navbarSub}>Security Desk</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutBtnText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      {screen === 'home' && renderHome()}
      {screen === 'scanner' && (
        <QRScanner
          onScanSuccess={handleScanSuccess}
          availableTokens={tokensList}
          onCancel={() => setScreen('home')}
        />
      )}
      {screen === 'register' && renderRegistrationForm()}
      {screen === 'checkin_success' && renderCheckInSuccess()}
      {screen === 'checkout_confirm' && renderCheckOutConfirm()}
      {screen === 'checkout_success' && renderCheckOutSuccess()}
      {screen === 'invalid_qr' && renderInvalidQR()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
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
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  viewSection: {
    flex: 1,
    padding: 20,
  },
  portalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 8,
  },
  portalSub: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },
  scanMainBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  scanMainIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  scanMainText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sectionBox: {
    gap: 10,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  activeVisitCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  tokenPill: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 14,
  },
  tokenPillText: {
    color: '#1e40af',
    fontWeight: '800',
    fontSize: 15,
  },
  visitMainInfo: {
    flex: 1,
  },
  visitorNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  visitSubText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  insideBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  insideBadgeText: {
    color: '#2563eb',
    fontWeight: '800',
    fontSize: 11,
  },
  backBtn: {
    paddingVertical: 8,
    marginBottom: 10,
  },
  backBtnText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 16,
  },
  tokenHeaderCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tokenHeaderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  tokenHeaderVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  durationChipSel: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  durationChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  durationChipTextSel: {
    color: '#ffffff',
  },
  checkInSubmitBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  checkInSubmitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusViewContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successIcon: {
    fontSize: 36,
    color: '#2563eb',
    fontWeight: '900',
  },
  statusSuccessTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
    textAlign: 'center',
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 4,
  },
  statusSubText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 20,
  },
  visitorSuccessName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sumLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  sumVal: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  sumValBold: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '800',
  },
  sumValHighlight: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '800',
  },
  doneBtn: {
    backgroundColor: '#2563eb',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  checkOutActionBtn: {
    backgroundColor: '#dc2626',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  checkOutActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  secondaryBtn: {
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: '#64748b',
    fontWeight: '700',
  },
  reuseNoticeText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginVertical: 16,
  },
});
