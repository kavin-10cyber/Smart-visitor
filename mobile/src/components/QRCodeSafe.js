import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCodeSVG from 'react-native-qrcode-svg';

// Safely resolve the component whether exported as default or named or inside a bundle wrapper
const ResolvedQRCode = (QRCodeSVG && QRCodeSVG.default) ? QRCodeSVG.default : QRCodeSVG;

export default function QRCodeSafe({
  value = 'PASS',
  size = 150,
  color = '#000000',
  backgroundColor = '#FFFFFF',
  quietZone = 4,
  getRef,
  ...rest
}) {
  const safeVal = (typeof value === 'string' && value.trim().length > 0) ? value : 'PASS';

  if (!ResolvedQRCode || typeof ResolvedQRCode !== 'function') {
    return (
      <View style={[styles.fallbackContainer, { width: size, height: size, backgroundColor }]}>
        <Text style={styles.fallbackLabel}>QR CODE</Text>
        <Text style={styles.fallbackValue} numberOfLines={2}>
          {safeVal}
        </Text>
      </View>
    );
  }

  try {
    return (
      <ResolvedQRCode
        value={safeVal}
        size={size}
        color={color}
        backgroundColor={backgroundColor}
        quietZone={quietZone}
        getRef={getRef}
        {...rest}
      />
    );
  } catch (err) {
    console.warn('QRCodeSafe render fallback due to error:', err);
    return (
      <View style={[styles.fallbackContainer, { width: size, height: size, backgroundColor }]}>
        <Text style={styles.fallbackLabel}>QR CODE</Text>
        <Text style={styles.fallbackValue} numberOfLines={2}>
          {safeVal}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 8,
  },
  fallbackLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6C5CE7',
    marginBottom: 4,
    letterSpacing: 1,
  },
  fallbackValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
});
