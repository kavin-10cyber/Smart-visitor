import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import { Camera, CameraType } from 'react-native-camera-kit';
import {
  QrScanCornerIcon,
  QRIcon,
  SearchIcon,
  CloseIcon,
  CheckCircleIcon,
  ShieldIcon,
  ArrowRightIcon,
} from './AdminIcons';

export default function QRScanner({
  onScan,
  onScanSuccess,
  availableTokens = [],
  onClose,
  onCancel,
}) {
  const [manualCode, setManualCode] = useState('');
  const [torchActive, setTorchActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL'); // 'ALL' | 'AVAILABLE' | 'IN_USE'
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState(null);

  // Laser animation
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Request Android Camera Permission
  useEffect(() => {
    const requestCameraPermission = async () => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Camera Access Needed',
              message: 'Smart Visitor requires camera access to scan visitor QR badges.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          setHasCameraPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
        } catch (err) {
          console.warn('Camera permission request error:', err);
          setHasCameraPermission(false);
        }
      } else {
        setHasCameraPermission(true);
      }
    };

    requestCameraPermission();
  }, []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scanAnim]);

  const handleCallback = (code) => {
    if (!code) return;
    const clean = code.trim().toUpperCase();
    if (clean === lastScannedCode) return; // Prevent duplicate rapid scans
    setLastScannedCode(clean);
    setTimeout(() => setLastScannedCode(null), 2500); // Re-enable scan after 2.5s

    if (onScan) onScan(clean);
    else if (onScanSuccess) onScanSuccess(clean);
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) {
      Alert.alert('Badge Required', 'Please enter a badge code (e.g. V-001 or V-027)');
      return;
    }
    handleCallback(manualCode);
  };

  const handleDismiss = () => {
    if (onClose) onClose();
    else if (onCancel) onCancel();
  };

  const [showAllTokens, setShowAllTokens] = useState(false);
  const [badgeSearch, setBadgeSearch] = useState('');

  // Counts
  const availableCount = availableTokens.filter((t) => t.status === 'AVAILABLE').length;
  const inUseCount = availableTokens.filter((t) => t.status === 'IN USE').length;

  // Filter tokens for quick select
  const filteredTokens = availableTokens.filter((t) => {
    if (selectedCategory === 'AVAILABLE' && t.status !== 'AVAILABLE') return false;
    if (selectedCategory === 'IN_USE' && t.status !== 'IN USE') return false;
    if (badgeSearch.trim()) {
      return t.token_code.toLowerCase().includes(badgeSearch.trim().toLowerCase());
    }
    return true;
  });

  // Display tokens: by default show first 24 or all if expanded/searching
  const displayTokens = (showAllTokens || badgeSearch.trim().length > 0)
    ? filteredTokens
    : filteredTokens.slice(0, 24);

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Adaptive Subtitle & Scanner Status Banner */}
        <View style={styles.scannerStatusRow}>
          <View style={[styles.statusPill, hasCameraPermission === false && styles.statusPillError]}>
            <View style={[styles.greenLiveDot, hasCameraPermission === false && styles.redLiveDot]} />
            <Text style={[styles.statusPillText, hasCameraPermission === false && styles.statusPillTextError]}>
              {hasCameraPermission === true
                ? 'OPTICAL SENSOR ACTIVE'
                : hasCameraPermission === false
                ? 'CAMERA PERMISSION DENIED'
                : 'INITIALIZING OPTICAL SENSOR...'}
            </Text>
          </View>
          <Text style={styles.scannerInstruction}>
            Position badge QR code within viewfinder
          </Text>
        </View>

        {/* High-Tech Adaptive Viewfinder Box with Live Optical Camera */}
        <View style={styles.viewfinderCard}>
          <View style={styles.viewfinderInterior}>
            {/* Native Hardware Camera View */}
            {hasCameraPermission === true ? (
              <Camera
                style={StyleSheet.absoluteFill}
                cameraType={CameraType.Back}
                scanBarcode={true}
                onReadCode={(event) => {
                  const val = event?.nativeEvent?.codeStringValue;
                  if (val) handleCallback(val);
                }}
                torchMode={torchActive ? 'on' : 'off'}
                showFrame={false}
              />
            ) : hasCameraPermission === false ? (
              <View style={styles.cameraFallback}>
                <ShieldIcon size={36} color="#ef4444" />
                <Text style={styles.cameraFallbackTitle}>Camera Access Denied</Text>
                <Text style={styles.cameraFallbackSub}>
                  Please grant camera permission in phone Settings or use Manual Entry below.
                </Text>
              </View>
            ) : (
              <View style={styles.cameraFallback}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.cameraFallbackSub}>Connecting to optical sensor...</Text>
              </View>
            )}

            {/* Dark Tint Overlay around Reticle */}
            <View style={styles.viewfinderOverlay} pointerEvents="none" />

            {/* Viewfinder Corner Reticles */}
            <View style={[styles.reticleCorner, styles.cornerTL]} pointerEvents="none" />
            <View style={[styles.reticleCorner, styles.cornerTR]} pointerEvents="none" />
            <View style={[styles.reticleCorner, styles.cornerBL]} pointerEvents="none" />
            <View style={[styles.reticleCorner, styles.cornerBR]} pointerEvents="none" />

            {/* Scanning Laser Beam */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.scanLaserBeam,
                {
                  transform: [{ translateY }],
                },
              ]}
            >
              <View style={styles.laserGlow} />
            </Animated.View>

            {/* Subdued Central Watermark */}
            <View style={styles.centerTargetGraphic} pointerEvents="none">
              <QrScanCornerIcon size={44} color="rgba(255, 255, 255, 0.4)" />
              <Text style={styles.viewfinderTargetLabel}>AIM AT QR BADGE</Text>
            </View>
          </View>

          {/* Scanner Toolbar Controls */}
          <View style={styles.scannerControlsRow}>
            <TouchableOpacity
              style={[styles.controlBtn, torchActive && styles.controlBtnActive]}
              onPress={() => setTorchActive(!torchActive)}
              activeOpacity={0.8}
            >
              <Text style={[styles.controlBtnText, torchActive && styles.controlBtnTextActive]}>
                {torchActive ? '🔦 Flashlight ON' : '💡 Flashlight OFF'}
              </Text>
            </TouchableOpacity>

            <View style={styles.controlDivider} />

            <View style={styles.autoDetectBadge}>
              <CheckCircleIcon size={14} color="#15803d" />
              <Text style={styles.autoDetectText}>
                {torchActive ? 'Flash Active' : 'Auto-Detection'}
              </Text>
            </View>
          </View>
        </View>

        {/* Manual Input Card (Matches App Card Aesthetics) */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Manual Badge Entry</Text>
            <View style={styles.keyTag}>
              <Text style={styles.keyTagText}>KEYPAD</Text>
            </View>
          </View>

          <Text style={styles.cardSub}>
            If QR is scratched or damaged, enter the printed ID code
          </Text>

          <View style={styles.inputGroupRow}>
            <View style={styles.inputBox}>
              <QRIcon size={18} color="#2563eb" />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. V-001 or V-027"
                placeholderTextColor="#94a3b8"
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {manualCode.length > 0 && (
                <TouchableOpacity onPress={() => setManualCode('')}>
                  <CloseIcon size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.verifyBtn}
              activeOpacity={0.85}
              onPress={handleManualSubmit}
            >
              <Text style={styles.verifyBtnText}>Verify</Text>
              <ArrowRightIcon size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick-Select Tokens Section (Adaptive Simulation) */}
        {availableTokens && availableTokens.length > 0 && (
          <View style={styles.cardContainer}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Quick-Select Station Badges</Text>
              <Text style={styles.fleetCountText}>
                {availableTokens.length} registered
              </Text>
            </View>

            {/* Filter Chips and Quick Search */}
            <View style={styles.filterChipRow}>
              <TouchableOpacity
                style={[styles.smallFilterChip, selectedCategory === 'ALL' && styles.smallFilterChipActive]}
                onPress={() => setSelectedCategory('ALL')}
              >
                <Text style={[styles.smallFilterChipText, selectedCategory === 'ALL' && styles.smallFilterChipTextActive]}>
                  All ({availableTokens.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallFilterChip, selectedCategory === 'AVAILABLE' && styles.smallFilterChipActive]}
                onPress={() => setSelectedCategory('AVAILABLE')}
              >
                <Text style={[styles.smallFilterChipText, selectedCategory === 'AVAILABLE' && styles.smallFilterChipTextActive]}>
                  Available ({availableCount})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallFilterChip, selectedCategory === 'IN_USE' && styles.smallFilterChipActive]}
                onPress={() => setSelectedCategory('IN_USE')}
              >
                <Text style={[styles.smallFilterChipText, selectedCategory === 'IN_USE' && styles.smallFilterChipTextActive]}>
                  In Use ({inUseCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Filter Search Input for station badges */}
            <View style={styles.badgeSearchBox}>
              <SearchIcon size={14} color="#94a3b8" />
              <TextInput
                style={styles.badgeSearchInput}
                placeholder="Filter badges by code (e.g. 021)..."
                placeholderTextColor="#94a3b8"
                value={badgeSearch}
                onChangeText={setBadgeSearch}
                autoCapitalize="characters"
              />
              {badgeSearch.length > 0 && (
                <TouchableOpacity onPress={() => setBadgeSearch('')}>
                  <CloseIcon size={14} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Tokens Chip Grid - All Badges Accessible */}
            <View style={styles.tokensGrid}>
              {displayTokens.length === 0 ? (
                <View style={styles.emptyTokensBox}>
                  <Text style={styles.emptyTokensText}>No badges matching filter</Text>
                </View>
              ) : (
                displayTokens.map((t) => {
                  const isAvail = t.status === 'AVAILABLE';
                  return (
                    <TouchableOpacity
                      key={t.id || t.token_code}
                      style={[styles.tokenChipBtn, isAvail ? styles.tokenChipAvail : styles.tokenChipInUse]}
                      onPress={() => handleCallback(t.token_code)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.tokenChipCode}>{t.token_code}</Text>
                      <View style={[styles.tokenStatusDot, isAvail ? styles.dotAvail : styles.dotInUse]} />
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Expand / Collapse or Count Status */}
            {filteredTokens.length > 24 && (
              <TouchableOpacity
                style={styles.showMoreTokensBtn}
                onPress={() => setShowAllTokens(!showAllTokens)}
                activeOpacity={0.8}
              >
                <Text style={styles.showMoreTokensBtnText}>
                  {showAllTokens
                    ? `▲ Show Fewer Badges`
                    : `▼ Show All ${filteredTokens.length} Badges (${filteredTokens.length - 24} more)`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Security Operator Guidelines */}
        <View style={styles.guidelineCard}>
          <ShieldIcon size={18} color="#2563eb" />
          <View style={styles.guidelineTextCol}>
            <Text style={styles.guidelineTitle}>Standard Operating Protocol</Text>
            <Text style={styles.guidelineSub}>
              Ensure visitor photo ID matches before passing turnstiles. Return badge to charging dock on checkout.
            </Text>
          </View>
        </View>

        {/* Return Button */}
        <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
          <Text style={styles.dismissBtnText}>Cancel & Return to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  // Status Row
  scannerStatusRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  greenLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: 0.5,
  },
  statusPillError: {
    backgroundColor: '#fee2e2',
  },
  statusPillTextError: {
    color: '#b91c1c',
  },
  redLiveDot: {
    backgroundColor: '#ef4444',
  },
  scannerInstruction: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },

  // High-Tech Viewfinder Card
  viewfinderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  viewfinderInterior: {
    height: 240,
    backgroundColor: '#000000',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.15)',
  },
  cameraFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  cameraFallbackTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  cameraFallbackSub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  reticleCorner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#38bdf8',
  },
  cornerTL: {
    top: 20,
    left: 24,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 20,
    right: 24,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 20,
    left: 24,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 20,
    right: 24,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 8,
  },
  scanLaserBeam: {
    position: 'absolute',
    top: 20,
    left: 30,
    right: 30,
    height: 2,
    backgroundColor: '#38bdf8',
    zIndex: 10,
  },
  laserGlow: {
    height: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 5,
    marginTop: -4,
  },
  centerTargetGraphic: {
    alignItems: 'center',
    opacity: 0.85,
    gap: 6,
  },
  viewfinderTargetLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1,
    marginTop: 4,
  },

  // Viewfinder Bottom Toolbar
  scannerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  controlBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  controlBtnActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  controlBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  controlBtnTextActive: {
    color: '#2563eb',
  },
  controlDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#e2e8f0',
  },
  autoDetectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  autoDetectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
  },

  // Card Container Generic
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  keyTag: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  keyTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    letterSpacing: 0.5,
  },
  cardSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },

  // Manual Input Row
  inputGroupRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    paddingVertical: 0,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 12,
    gap: 6,
  },
  verifyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Quick Select Section
  fleetCountText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  smallFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  smallFilterChipActive: {
    backgroundColor: '#0f172a',
  },
  smallFilterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  smallFilterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  badgeSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    gap: 6,
    marginVertical: 10,
  },
  badgeSearchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    paddingVertical: 0,
  },
  tokensGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  emptyTokensBox: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTokensText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  showMoreTokensBtn: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  showMoreTokensBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  tokenChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  tokenChipAvail: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  tokenChipInUse: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
  },
  tokenChipCode: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  tokenStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotAvail: {
    backgroundColor: '#22c55e',
  },
  dotInUse: {
    backgroundColor: '#f59e0b',
  },

  // Guidelines Card
  guidelineCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  guidelineTextCol: {
    flex: 1,
  },
  guidelineTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1e40af',
    marginBottom: 2,
  },
  guidelineSub: {
    fontSize: 11,
    color: '#3b82f6',
    lineHeight: 16,
  },

  // Dismiss Button
  dismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
});
