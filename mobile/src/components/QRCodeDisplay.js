import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function QRCodeDisplay({ tokenCode, status = 'AVAILABLE', size = 200 }) {
  const isAvailable = status === 'AVAILABLE';

  return (
    <View style={styles.container}>
      <Text style={styles.titleLabel}>Visitor Token</Text>
      <Text style={styles.tokenCode}>{tokenCode}</Text>

      <View style={styles.qrCard}>
        {tokenCode ? (
          <QRCode
            value={tokenCode}
            size={size}
            color="#0f172a"
            backgroundColor="#ffffff"
            quietZone={8}
          />
        ) : (
          <Text style={styles.errorText}>No Token Code</Text>
        )}
      </View>

      <View style={[styles.badge, isAvailable ? styles.badgeAvailable : styles.badgeInUse]}>
        <View style={[styles.dot, isAvailable ? styles.dotAvailable : styles.dotInUse]} />
        <Text style={[styles.badgeText, isAvailable ? styles.textAvailable : styles.textInUse]}>
          Status: {status}
        </Text>
      </View>
      <Text style={styles.caption}>Reusable Physical Campus Token</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  titleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  tokenCode: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  qrCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 18,
  },
  badgeAvailable: {
    backgroundColor: '#dcfce7',
  },
  badgeInUse: {
    backgroundColor: '#fef3c7',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotAvailable: {
    backgroundColor: '#16a34a',
  },
  dotInUse: {
    backgroundColor: '#d97706',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  textAvailable: {
    color: '#15803d',
  },
  textInUse: {
    color: '#b45309',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  caption: {
    marginTop: 10,
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
});
