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
  const [activeTab, setActiveTab] = useState('security'); // 'security' | 'admin'
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
    } else {
      setUsername('admin');
      setPassword('admin123');
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
      // Authentication logic supporting 'DEMO' or 'security' for security staff, 'admin' for admin
      if (
        (activeTab === 'security' && (userVal.toLowerCase() === 'demo' || userVal.toLowerCase() === 'security')) ||
        (userVal.toLowerCase() === 'security' && passVal === 'security123')
      ) {
        onLoginSuccess({ role: 'security', username: 'security', name: 'Security Staff' });
      } else if (
        (activeTab === 'admin' && userVal.toLowerCase() === 'admin') ||
        (userVal.toLowerCase() === 'admin' && passVal === 'admin123')
      ) {
        onLoginSuccess({ role: 'admin', username: 'admin', name: 'Administrator' });
      } else if (userVal.toLowerCase() === 'security' && passVal === 'security123') {
        onLoginSuccess({ role: 'security', username: 'security', name: 'Security Staff' });
      } else {
        setErrorMessage('Invalid credentials. Please verify ID and password.');
      }
    } catch (err) {
      setErrorMessage('Login failed. Please check network connection.');
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
                  Security Staff
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
                  Administrator
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Field 1: Staff ID or Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {activeTab === 'security' ? 'Staff ID or Email' : 'Admin ID or Email'}
              </Text>
              <View style={styles.inputBox}>
                <View style={styles.inputIconLeft}>
                  <UserIcon color="#94a3b8" />
                </View>
                <TextInput
                  style={styles.textInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="DEMO"
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

          {/* Optional Server Config footer */}
          <TouchableOpacity
            style={styles.serverRow}
            onPress={() => setShowServerConfig(!showServerConfig)}
            activeOpacity={0.7}
          >
            <Text style={styles.serverText}>Server: {currentServerUrl}</Text>
            <Text style={styles.serverEditBtn}>{showServerConfig ? 'Close' : 'Configure'}</Text>
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverEditBox}>
              <TextInput
                style={styles.serverInput}
                value={currentServerUrl}
                onChangeText={(text) => {
                  setCurrentServerUrl(text);
                  api.setBaseUrl(text);
                }}
                placeholder="e.g. http://10.10.190.232:5000"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: '#f6f8fa',
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
    marginBottom: 26,
  },
  logoBadge: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748b',
    marginTop: 5,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  tabButtonTextActive: {
    fontWeight: '700',
    color: '#0f172a',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 7,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#475569',
  },
  inputBox: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    height: 48,
  },
  inputIconLeft: {
    paddingLeft: 14,
    paddingRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputIconRight: {
    position: 'absolute',
    right: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    height: '100%',
    paddingVertical: 0,
    paddingRight: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  checkboxBase: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  checkboxChecked: {
    backgroundColor: '#002b70',
    borderColor: '#002b70',
  },
  checkboxLabel: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#334155',
  },
  signInButton: {
    backgroundColor: '#002b70',
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#002b70',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  serverText: {
    fontSize: 12,
    color: '#94a3b8',
    marginRight: 8,
  },
  serverEditBtn: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  serverEditBox: {
    width: '100%',
    maxWidth: 420,
    marginTop: 8,
  },
  serverInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0f172a',
    textAlign: 'center',
  },
});
