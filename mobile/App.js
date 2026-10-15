import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import AdminPortal from './src/screens/AdminPortal';
import SecurityPortal from './src/screens/SecurityPortal';
import EventPortal from './src/screens/EventPortal';
import { AlertProvider } from './src/components/common/CustomAlert';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('App Component Render Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, padding: 20, backgroundColor: '#FEF2F2', justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#FFFFFF', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#FECDD3' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#E11D48', marginBottom: 8 }}>
              ⚠️ Portal Render Error
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937', marginBottom: 12 }}>
              {this.state.error ? this.state.error.toString() : 'Unknown error'}
            </Text>
            <ScrollView style={{ maxHeight: 200, backgroundColor: '#F3F4F6', padding: 10, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#4B5563' }}>
                {this.state.errorInfo?.componentStack || this.state.error?.stack || 'No stack trace available'}
              </Text>
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                style={{ flex: 1, padding: 12, backgroundColor: '#0B2A5B', borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Retry Render</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={this.props.onReset}
                style={{ flex: 1, padding: 12, backgroundColor: '#E11D48', borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);

  const handleLoginSuccess = (userObj) => {
    setCurrentUser(userObj);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F9FC" />
      <ErrorBoundary onReset={handleLogout}>
        <AlertProvider>
          <View style={styles.appWrapper}>
            {!currentUser && (
              <LoginScreen onLoginSuccess={handleLoginSuccess} />
            )}

            {currentUser && currentUser.role === 'admin' && (
              <AdminPortal onLogout={handleLogout} />
            )}

            {currentUser && currentUser.role === 'security' && (
              <SecurityPortal onLogout={handleLogout} officer={currentUser} />
            )}

            {currentUser && currentUser.role === 'event' && (
              <EventPortal currentUser={currentUser} onLogout={handleLogout} />
            )}
          </View>
        </AlertProvider>
      </ErrorBoundary>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    maxHeight: '100%',
    backgroundColor: '#F7F9FC',
    overflow: 'hidden',
  },
  appWrapper: {
    flex: 1,
    height: '100%',
    maxHeight: '100%',
    overflow: 'hidden',
  },
});
