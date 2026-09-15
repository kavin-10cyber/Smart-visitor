import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  NativeModules,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { getDownloadUrl, getBadgeUrl } from '../services/api';

export default function QRCodeDisplay({ tokenCode, status = 'AVAILABLE', size = 200 }) {
  const isAvailable = status === 'AVAILABLE';
  const [downloading, setDownloading] = useState(false);
  const svgRef = useRef(null);

  const handleDownloadQR = () => {
    if (!tokenCode) return;
    setDownloading(true);

    if (svgRef.current && NativeModules.SaveImageModule) {
      svgRef.current.toDataURL(async (dataURL) => {
        try {
          const savedPath = await NativeModules.SaveImageModule.saveBase64Image(
            dataURL,
            `${tokenCode}-qrcode.png`
          );
          Alert.alert(
            '✅ Downloaded to Device',
            `QR Code saved directly to your folder:\n\n📁 ${savedPath}\n\nYou can view it in your Files / Downloads app!`
          );
        } catch (err) {
          console.error('Direct save error:', err);
          // Fallback to browser download if native fails
          try {
            const url = getDownloadUrl(tokenCode);
            await Linking.openURL(url);
          } catch (linkErr) {
            Alert.alert('Save Failed', 'Could not save file: ' + (err.message || ''));
          }
        } finally {
          setDownloading(false);
        }
      });
    } else {
      const url = getDownloadUrl(tokenCode);
      Linking.openURL(url).catch((e) => {
        Alert.alert('Download Error', 'Could not open download: ' + e.message);
      });
      setDownloading(false);
    }
  };

  const handleOpenPrintableBadge = async () => {
    if (!tokenCode) return;
    try {
      const url = getBadgeUrl(tokenCode);
      const supported = await Linking.canOpenURL(url).catch(() => false);
      if (supported) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(getDownloadUrl(tokenCode));
      }
    } catch (err) {
      console.error('Print view error:', err);
      try {
        await Linking.openURL(getDownloadUrl(tokenCode));
      } catch (fallbackErr) {
        Alert.alert('Error', 'Failed to open badge view');
      }
    }
  };

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
            getRef={(ref) => {
              svgRef.current = ref;
            }}
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

      {/* Action Buttons: Download and Print */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.downloadBtn]}
          onPress={handleDownloadQR}
          disabled={downloading || !tokenCode}
        >
          {downloading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Text style={styles.actionBtnIcon}>📥</Text>
              <Text style={styles.downloadBtnText}>DOWNLOAD QR IMAGE</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.printBtn]}
          onPress={handleOpenPrintableBadge}
          disabled={!tokenCode}
        >
          <Text style={styles.actionBtnIcon}>🖨️</Text>
          <Text style={styles.printBtnText}>PRINT BADGE PASS</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.caption}>Durable Physical / Digital Campus Badge</Text>
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
    marginTop: 14,
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  actionsContainer: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionBtnIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  downloadBtn: {
    width: '100%',
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 10,
  },
  downloadBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  printBtn: {
    width: '100%',
    backgroundColor: '#0f172a',
    paddingVertical: 12,
  },
  printBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
