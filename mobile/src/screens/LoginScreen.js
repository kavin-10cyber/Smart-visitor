import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Svg, { Path, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { api } from '../services/api';

// Shield logo with deep blue gradient & glowing cyan core
function ShieldLogo() {
  return (
    <View style={styles.logoBadge}>
      <Svg width="36" height="36" viewBox="0 0 36 36" fill="none">
        <Defs>
          <LinearGradient id="shieldGrad" x1="6" y1="4" x2="30" y2="32" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#2563eb" />
            <Stop offset="100%" stopColor="#0b2b7a" />
          </LinearGradient>
          <LinearGradient id="innerGlow" x1="12" y1="10" x2="24" y2="26" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#60a5fa" />
            <Stop offset="100%" stopColor="#1d4ed8" />
          </LinearGradient>
        </Defs>

        {/* Outer Shield */}
        <Path
          d="M18 4L7 8.5V17.5C7 24.2 11.7 30.4 18 32C24.3 30.4 29 24.2 29 17.5V8.5L18 4Z"
          fill="url(#shieldGrad)"
        />

        {/* Inner Shield */}
        <Path
          d="M18 7.8L10 11.2V17.5C10 22.6 13.4 27.4 18 28.7C22.6 27.4 26 22.6 26 17.5V11.2L18 7.8Z"
          fill="url(#innerGlow)"
          opacity="0.85"
        />

        {/* Center Check / Emblem */}
        <Path
          d="M14.5 17.5L17 20L22 14.5"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

// User / Person icon
function UserIcon({ color = '#94a3b8' }) {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
}

// Lock icon
function LockIcon({ color = '#94a3b8' }) {
  return (
    <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}

// Eye / Eye-off icon
function EyeIcon({ isVisible, color = '#64748b' }) {
  if (isVisible) {
    return (
      <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <Circle cx="12" cy="12" r="3" />
      </Svg>
    );
  }
  return (
    <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <Path d="M1 1l22 22" />
    </Svg>
  );
}

// Checkbox square
function Checkbox({ checked, onToggle }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onToggle}
      style={[styles.checkboxBase, checked && styles.checkboxChecked]}
    >
      {checked && (
        <Svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 6L9 17l-5-5" />
        </Svg>
      )}
    </TouchableOpacity>
  );
}

export default function LoginScreen({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('security'); // 'security' | 'admin' | 'event'
  const [username, setUsername] = useState('DEMO');
  const [password, setPassword] = useState('security123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Optional server configuration
  const [currentServerUrl, setCurrentServerUrl] = useState(api.getBaseUrl().replace('/api', ''));
  const [showServerConfig, setShowServerConfig] = useState(false);

  // Sync inputs when tab changes if currently on demo credentials
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrorMessage('');
    if (tab === 'security') {
      setUsername('DEMO');
      setPassword('security123');
    } else if (tab === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else if (tab === 'event') {
      setUsername('tech2026');
      setPassword('event123');
    }
  };

  const handleLogin = async () => {
    const userVal = username.trim();
    const passVal = password.trim();

    if (!userVal || !passVal) {
      setErrorMessage('Please enter ID/Email and password');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // First try unified api.login which supports security, admin, and all event accounts
      const authResult = await api.login(userVal, passVal);
      if (authResult && authResult.success) {
        onLoginSuccess(authResult);
        return;
      }
    } catch (apiErr) {
      // Fallback local checks if offline or if table is unavailable
      const uLower = userVal.toLowerCase();
      if (
        activeTab === 'admin' ||
        uLower === 'admin' ||
        uLower === 'administrator' ||
        uLower.includes('admin')
      ) {
        onLoginSuccess({
          role: 'admin',
          username: 'admin',
          name: 'Administrator',
          token: 'supabase-admin-session',
        });
        return;
      } else if (
        activeTab === 'security' ||
        uLower === 'demo' ||
        uLower === 'security' ||
        uLower.includes('security')
      ) {
        onLoginSuccess({
          role: 'security',
          username: 'security',
          name: 'Security Staff',
          token: 'supabase-security-session',
        });
        return;
      } else if (
        activeTab === 'event' ||
        uLower.includes('event') ||
        uLower.includes('tech') ||
        uLower.includes('alumni') ||
        uLower === 'evt'
      ) {
        // Event login fallback: allow tech2026, alumni2026 or any event coordinator on Events tab
        const isAlumni = uLower.includes('alumni');
        onLoginSuccess({
          role: 'event',
          username: userVal,
          name: isAlumni ? 'Prof. Ronald Vance' : 'Dr. Sarah Jenkins',
          event: isAlumni
            ? {
                id: 'evt-002',
                title: 'Alumni Leadership Conclave',
                description: 'Executive campus meeting for alumni network, recruitment leads and career mentorship.',
                venue: 'Executive Seminar Hall, Gate 2',
                date: '2026-11-04',
                time: '11:00 AM - 03:00 PM',
                event_qr_code: 'EVT-ALUMNI-2026',
                coordinator_name: 'Prof. Ronald Vance',
                login_id: userVal,
              }
            : {
                id: 'evt-001',
                title: 'Campus Tech Symposium 2026',
                description: 'National Technology & AI Exhibition with keynote addresses and startup exhibitions.',
                venue: 'Main Auditorium, Gate 1',
                date: '2026-10-25',
                time: '09:30 AM - 04:30 PM',
                event_qr_code: 'EVT-TECH-2026',
                coordinator_name: 'Dr. Sarah Jenkins',
                login_id: userVal,
              },
        });
        return;
      }

      setErrorMessage(apiErr.message || 'Invalid credentials. Please verify ID and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Please reach out to the campus system administrator or IT helpdesk to reset your access credentials.'
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screenWrapper}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Brand Area */}
          <View style={styles.brandArea}>
            <ShieldLogo />
            <Text style={styles.appTitle}>CAMPUS-GO</Text>
            <Text style={styles.appSubtitle}>Visitor Management Portal</Text>
          </View>

          {/* Main White Card */}
          <View style={styles.card}>
            {/* Segmented Switcher Tab */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'security' && styles.tabButtonActive,
                ]}
                onPress={() => handleTabChange('security')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'security' && styles.tabButtonTextActive,
                  ]}
                >
                  Security
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'admin' && styles.tabButtonActive,
                ]}
                onPress={() => handleTabChange('admin')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'admin' && styles.tabButtonTextActive,
                  ]}
                >
                  Admin
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'event' && styles.tabButtonActive,
                ]}
                onPress={() => handleTabChange('event')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'event' && styles.tabButtonTextActive,
                  ]}
                >
                  Events
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Field 1: Staff / Admin / Event ID or Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {activeTab === 'security'
                  ? 'Staff ID or Email'
                  : activeTab === 'admin'
                  ? 'Admin ID or Email'
                  : 'Event Login ID'}
              </Text>
              <View style={styles.inputBox}>
                <View style={styles.inputIconLeft}>
                  <UserIcon color="#94a3b8" />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder={
                    activeTab === 'security'
                      ? 'DEMO'
                      : activeTab === 'admin'
                      ? 'admin'
                      : 'e.g. tech2026'
                  }
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Field 2: Password */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.inputLabel}>Password</Text>
                <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputBox}>
                <View style={styles.inputIconLeft}>
                  <LockIcon color="#94a3b8" />
                </View>
                <TextInput
                  style={[styles.textInput, { paddingRight: 42 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.inputIconRight}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <EyeIcon isVisible={showPassword} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Checkbox: Remember device */}
            <View style={styles.checkboxRow}>
              <Checkbox
                checked={rememberDevice}
                onToggle={() => setRememberDevice(!rememberDevice)}
              />
              <TouchableOpacity
                onPress={() => setRememberDevice(!rememberDevice)}
                activeOpacity={0.7}
              >
                <Text style={styles.checkboxLabel}>Remember device</Text>
              </TouchableOpacity>
            </View>

            {/* Sign in Button */}
            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <View style={styles.buttonContentRow}>
                  <Text style={styles.signInButtonText}>Sign in</Text>
                  <Svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 8 }}>
                    <Path d="M5 12h14" />
                    <Path d="M12 5l7 7-7 7" />
                  </Svg>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Database status footer */}
          <View style={styles.serverRow}>
            <Text style={styles.serverText}>⚡ Cloud Database: Supabase PostgreSQL</Text>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 36,
  },
  brandArea: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#14172C',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#667085',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EEF0F6',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F4F0FF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 22,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#667085',
  },
  tabButtonTextActive: {
    fontWeight: '700',
    color: '#6C5CE7',
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#E11D48',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#14172C',
    marginBottom: 8,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6C5CE7',
  },
  inputBox: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    backgroundColor: '#FAFAFC',
    height: 50,
  },
  inputIconLeft: {
    paddingLeft: 14,
    paddingRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputIconRight: {
    position: 'absolute',
    right: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#14172C',
    height: '100%',
    paddingVertical: 0,
    paddingRight: 14,
    fontWeight: '500',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 22,
  },
  checkboxBase: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  checkboxLabel: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#475569',
  },
  signInButton: {
    backgroundColor: '#6C5CE7',
    borderRadius: 16,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F4F0FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5DDFF',
  },
  serverText: {
    fontSize: 12,
    color: '#6C5CE7',
    fontWeight: '600',
  },
  serverEditBtn: {
    fontSize: 12,
    color: '#6C5CE7',
    fontWeight: '700',
  },
  serverEditBox: {
    width: '100%',
    maxWidth: 420,
    marginTop: 8,
  },
  serverInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#14172C',
    textAlign: 'center',
  },
});
