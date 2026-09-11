import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';

export default function QRScanner({ onScanSuccess, availableTokens = [], onCancel }) {
  const [manualCode, setManualCode] = useState('');

  const handleManualSubmit = () => {
    if (!manualCode || manualCode.trim() === '') {
      Alert.alert('Validation Error', 'Please enter a valid Token ID (e.g., V-001)');
      return;
    }
    const cleanCode = manualCode.trim().toUpperCase();
    onScanSuccess(cleanCode);
  };

  const handleSelectToken = (code) => {
    onScanSuccess(code);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SCAN VISITOR QR BADGE</Text>
        <Text style={styles.headerSubtitle}>Enter badge token code or quick-select below</Text>
      </View>

      {/* Visual Scanner Simulation Box */}
      <View style={styles.viewfinderBox}>
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />

        <View style={styles.scanLaser} />

        <Text style={styles.viewfinderText}>CAMERA SCANNER ACTIVE</Text>
        <Text style={styles.viewfinderSubtext}>Point sensor towards badge</Text>
      </View>

      {/* Manual Input Section */}
      <View style={styles.inputCard}>
        <Text style={styles.inputTitle}>Enter Badge Code Manually</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. V-001"
            placeholderTextColor="#94a3b8"
            value={manualCode}
            onChangeText={setManualCode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.submitBtn} onPress={handleManualSubmit}>
            <Text style={styles.submitBtnText}>VERIFY</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Select Tokens */}
      {availableTokens && availableTokens.length > 0 && (
        <View style={styles.quickCard}>
          <Text style={styles.quickTitle}>Tap Available Badge to Scan:</Text>
          <View style={styles.chipGrid}>
            {availableTokens.map((t) => {
              const isInUse = t.status === 'IN USE';
              return (
                <TouchableOpacity
                  key={t.id || t.token_code}
                  style={[styles.chip, isInUse ? styles.chipInUse : styles.chipAvailable]}
                  onPress={() => handleSelectToken(t.token_code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipCode}>{t.token_code}</Text>
                  <Text style={[styles.chipStatus, isInUse ? styles.textInUse : styles.textAvailable]}>
                    {isInUse ? 'IN USE' : 'FREE'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {onCancel && (
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#38bdf8',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  viewfinderBox: {
    width: 260,
    height: 220,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 16,
  },
  scanLaser: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  viewfinderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
    letterSpacing: 1,
  },
  viewfinderSubtext: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  cornerTL: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#38bdf8',
  },
  cornerTR: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#38bdf8',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#38bdf8',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 24,
    height: 24,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#38bdf8',
  },
  inputCard: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
  },
  textInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginLeft: 10,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  quickCard: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
    marginRight: 6,
    marginBottom: 8,
  },
  chipAvailable: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    borderColor: '#16a34a',
  },
  chipInUse: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderColor: '#d97706',
  },
  chipCode: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  chipStatus: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  textAvailable: {
    color: '#4ade80',
  },
  textInUse: {
    color: '#fbbf24',
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
});
