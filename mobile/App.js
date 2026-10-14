import React, { useState } from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import AdminPortal from './src/screens/AdminPortal';
import SecurityPortal from './src/screens/SecurityPortal';
import EventPortal from './src/screens/EventPortal';

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
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    maxHeight: '100%',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  appWrapper: {
    flex: 1,
    height: '100%',
    maxHeight: '100%',
    overflow: 'hidden',
  },
});
