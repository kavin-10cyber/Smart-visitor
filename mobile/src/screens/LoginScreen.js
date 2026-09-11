import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { api } from '../services/api';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentServerUrl, setCurrentServerUrl] = useState(api.getBaseUrl().replace('/api', ''));
  const [showServerConfig, setShowServerConfig] = useState(false);

  const handleLogin = async (userToUse, passToUse) => {
    const userVal = userToUse || username;
    const passVal = passToUse || password;

    if (!userVal || !passVal) {
      setErrorMessage('Please enter username and password');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      // Demo authentication logic
      if (userVal === 'admin' && passVal === 'admin123') {
        onLoginSuccess({ role: 'admin', username: 'admin', name: 'Campus Admin' });
      } else if (userVal === 'security' && passVal === 'security123') {
        onLoginSuccess({ role: 'security', username: 'security', name: 'Security Staff' });
      } else {
        setErrorMessage('Invalid credentials. Use admin/admin123 or security/security123');
      }
    } catch (err) {
      setErrorMessage('Login failed. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    handleLogin(user, pass);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.headerBox}>
          <Text style={styles.appTitleMain}>SMART CAMPUS</Text>
          <Text style={styles.appTitleSub}>VISITOR MANAGEMENT</Text>
          <Text style={styles.subtitle}>Visitor Management System</Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor="#94a3b8"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => handleLogin()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginBtnText}>LOG IN</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>DEMO ACCOUNTS</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* 1-Click Predefined Demo Accounts */}
        <View style={styles.quickAccountsContainer}>
          <TouchableOpacity
            style={[styles.quickAccountBtn, styles.adminQuickBtn]}
            onPress={() => handleQuickFill('admin', 'admin123')}
          >
            <Text style={styles.quickBtnTitle}>ADMIN PORTAL</Text>
            <Text style={styles.quickBtnCreds}>admin / admin123</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickAccountBtn, styles.securityQuickBtn]}
            onPress={() => handleQuickFill('security', 'security123')}
          >
            <Text style={styles.quickBtnTitle}>SECURITY PORTAL</Text>
            <Text style={styles.quickBtnCreds}>security / security123</Text>
          </TouchableOpacity>
        </View>

        {/* Server IP Configurator for Standalone Mobile Usage */}
        <TouchableOpacity
          style={styles.serverRow}
          onPress={() => setShowServerConfig(!showServerConfig)}
        >
          <Text style={styles.serverText}>🌐 Server: {currentServerUrl}</Text>
          <Text style={styles.serverEditBtn}>{showServerConfig ? 'Close' : 'Change'}</Text>
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
              placeholder="e.g. http://10.10.172.216:5000"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  appTitleMain: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2563eb',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  appTitleSub: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  loginBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  quickAccountsContainer: {
    gap: 10,
  },
  quickAccountBtn: {
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  adminQuickBtn: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  securityQuickBtn: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  quickBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 0.5,
  },
  quickBtnCreds: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  serverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  serverText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  serverEditBtn: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '700',
  },
  serverEditBox: {
    marginTop: 8,
  },
  serverInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
});

