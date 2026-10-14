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
  StatusBar,
} from 'react-native';
import { Camera, CameraType } from 'react-native-camera-kit';
import {
  ArrowBackIcon,
  FlashlightIcon,
  FlashlightOffIcon,
  QrScanCornerIcon,
  QRIcon,
  CloseIcon,
  CheckCircleIcon,
  ShieldIcon,
  ArrowRightIcon,
} from './AdminIcons';

export default function QRScanner({
  onScan,
  onScanSuccess,
  onClose,
  onCancel,
}) {
  const [manualCode, setManualCode] = useState('');
  const [torchActive, setTorchActive] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState(null);

  // Laser beam animation inside reticle
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Live indicator pulsing animation
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // Request Camera Permission on Android
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

  // Scanning laser animation loop
  useEffect(() => {
    const laserLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    laserLoop.start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      laserLoop.stop();
      pulseLoop.stop();
    };
  }, [scanAnim, pulseAnim]);

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

  // Laser traverses from top (8) to bottom (216) of the 240px reticle frame
  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 216],
  });

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FC" />

      {/* Modern Soft Header with Navigation, Title, and Flashlight Button */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerCircleBtn}
          onPress={handleDismiss}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowBackIcon size={20} color="#14172C" />
        </TouchableOpacity>

        <View style={styles.headerCenterCol}>
          <Text style={styles.headerTitle}>Scan Visitor Badge</Text>
          <View style={styles.headerLiveRow}>
            <Animated.View
              style={[
                styles.headerLiveDot,
                hasCameraPermission === false
                  ? styles.headerLiveDotRed
                  : { opacity: pulseAnim },
              ]}
            />
            <Text
              style={[
                styles.headerLiveText,
                hasCameraPermission === false && styles.headerLiveTextRed,
              ]}
            >
              {hasCameraPermission === false
                ? 'CAMERA DISABLED'
                : 'OPTICAL SENSOR ACTIVE'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.headerCircleBtn,
            torchActive && styles.headerCircleBtnActive,
          ]}
          onPress={() => setTorchActive(!torchActive)}
          activeOpacity={0.8}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {torchActive ? (
            <FlashlightIcon size={20} color="#FFFFFF" />
          ) : (
            <FlashlightOffIcon size={20} color="#667085" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Prominent High-Tech Viewfinder Card - Fills Screen Space */}
        <View style={styles.viewfinderCard}>
          <View style={styles.viewfinderInterior}>
            {/* Native Hardware Optical Camera */}
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
                <View style={styles.cameraFallbackIconCircle}>
                  <ShieldIcon size={30} color="#EF4444" />
                </View>
                <Text style={styles.cameraFallbackTitle}>Camera Access Denied</Text>
                <Text style={styles.cameraFallbackSub}>
                  Grant camera permissions in your device settings or use Manual Entry below.
                </Text>
              </View>
            ) : (
              <View style={styles.cameraFallback}>
                <ActivityIndicator size="large" color="#6C5CE7" />
                <Text style={styles.cameraFallbackSub}>Calibrating optical sensor...</Text>
              </View>
            )}

            {/* Dark Ambient Vignette Overlay */}
            <View style={styles.viewfinderOverlay} pointerEvents="none" />

            {/* Centered Reticle Scanning Box - Connects Corners & Fills Gap */}
            <View style={styles.reticleBox} pointerEvents="none">
              {/* Continuous Connected Outline (Fills the gap between corners) */}
              <View style={styles.reticleOutline} />

              {/* Solid Electric Violet Curved Corner Brackets */}
              <View style={[styles.reticleCorner, styles.cornerTL]} />
              <View style={[styles.reticleCorner, styles.cornerTR]} />
              <View style={[styles.reticleCorner, styles.cornerBL]} />
              <View style={[styles.reticleCorner, styles.cornerBR]} />

              {/* High-Tech Scanning Laser Beam moving within reticle box */}
              <Animated.View
                style={[
                  styles.scanLaserBeam,
                  {
                    transform: [{ translateY }],
                  },
                ]}
              >
                <View style={styles.laserLine} />
                <View style={styles.laserGlow} />
              </Animated.View>

              {/* Central Aim Target Graphic */}
              <View style={styles.centerTargetGraphic}>
                <QrScanCornerIcon size={44} color="rgba(255, 255, 255, 0.55)" />
                <Text style={styles.viewfinderTargetLabel}>ALIGN QR IN RETICLE</Text>
              </View>
            </View>

            {/* Bottom In-Camera Auto-Detect Pill */}
            <View style={styles.inCameraPill} pointerEvents="none">
              <View style={styles.inCameraDot} />
              <Text style={styles.inCameraText}>Optical Engine Active</Text>
            </View>
          </View>

          {/* Viewfinder Bottom Controls Bar */}
          <View style={styles.viewfinderBottomRow}>
            <TouchableOpacity
              style={[styles.quickTorchBtn, torchActive && styles.quickTorchBtnActive]}
              onPress={() => setTorchActive(!torchActive)}
              activeOpacity={0.8}
            >
              <FlashlightIcon size={16} color={torchActive ? '#6C5CE7' : '#667085'} />
              <Text style={[styles.quickTorchText, torchActive && styles.quickTorchTextActive]}>
                {torchActive ? 'Flashlight ON' : 'Flashlight OFF'}
              </Text>
            </TouchableOpacity>

            <View style={styles.autoDetectPill}>
              <CheckCircleIcon size={14} color="#059669" />
              <Text style={styles.autoDetectPillText}>Auto-Scan Ready</Text>
            </View>
          </View>
        </View>

        {/* Manual Badge Entry Card */}
        <View style={styles.cardContainer}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Manual Badge Entry</Text>
              <Text style={styles.cardSub}>If QR is scratched or damaged, enter the printed ID</Text>
            </View>
            <View style={styles.keyTag}>
              <Text style={styles.keyTagText}>KEYPAD</Text>
            </View>
          </View>

          <View style={styles.inputGroupRow}>
            <View style={styles.inputBox}>
              <QRIcon size={20} color="#6C5CE7" />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. V-001 or V-027"
                placeholderTextColor="#94A3B8"
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {manualCode.length > 0 && (
                <TouchableOpacity
                  onPress={() => setManualCode('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <CloseIcon size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.verifyBtn}
              activeOpacity={0.85}
              onPress={handleManualSubmit}
            >
              <Text style={styles.verifyBtnText}>Verify</Text>
              <ArrowRightIcon size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>


        {/* Dismiss Button */}
        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={handleDismiss}
          activeOpacity={0.8}
        >
          <Text style={styles.dismissBtnText}>Cancel & Return to Dashboard</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    paddingBottom: 12,
    backgroundColor: '#F7F8FC',
  },
  headerCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF0F6',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  headerCircleBtnActive: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  headerCenterCol: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#14172C',
    letterSpacing: -0.3,
  },
  headerLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  headerLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  headerLiveDotRed: {
    backgroundColor: '#EF4444',
  },
  headerLiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.6,
  },
  headerLiveTextRed: {
    color: '#DC2626',
  },

  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },

  // Viewfinder Card - Taller, Immersive proportions
  viewfinderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EEF0F6',
    padding: 10,
    marginBottom: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  viewfinderInterior: {
    height: 380,
    borderRadius: 20,
    backgroundColor: '#0A0C16',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 12, 22, 0.28)',
  },
  cameraFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  cameraFallbackIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  cameraFallbackTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cameraFallbackSub: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Centered Reticle Scanning Box (240x240 square)
  reticleBox: {
    width: 240,
    height: 240,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Continuous Outline: Fills the gap between corner brackets with glowing line
  reticleOutline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: 'rgba(147, 130, 248, 0.45)',
    borderRadius: 20,
    backgroundColor: 'rgba(108, 92, 231, 0.04)',
  },
  // Solid Electric Violet Curved Corner Accents
  reticleCorner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#6C5CE7',
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 4.5,
    borderLeftWidth: 4.5,
    borderTopLeftRadius: 20,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 4.5,
    borderRightWidth: 4.5,
    borderTopRightRadius: 20,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 4.5,
    borderLeftWidth: 4.5,
    borderBottomLeftRadius: 20,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 4.5,
    borderRightWidth: 4.5,
    borderBottomRightRadius: 20,
  },

  // Scanning Laser Beam - perfectly fitted to reticle box
  scanLaserBeam: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 16,
    zIndex: 10,
    justifyContent: 'center',
  },
  laserLine: {
    height: 2.5,
    backgroundColor: '#8B78FF',
    borderRadius: 1.5,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 6,
    elevation: 3,
  },
  laserGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(108, 92, 231, 0.32)',
    borderRadius: 8,
  },

  // Central Aim Target Graphic
  centerTargetGraphic: {
    alignItems: 'center',
    gap: 8,
  },
  viewfinderTargetLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1.2,
  },

  // In-Camera Floating Pill
  inCameraPill: {
    position: 'absolute',
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 20, 36, 0.78)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  inCameraDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  inCameraText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Viewfinder Bottom Controls Bar
  viewfinderBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 4,
  },
  quickTorchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F7F8FC',
    borderWidth: 1,
    borderColor: '#EEF0F6',
  },
  quickTorchBtnActive: {
    backgroundColor: '#F4F0FF',
    borderColor: '#6C5CE7',
  },
  quickTorchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667085',
  },
  quickTorchTextActive: {
    color: '#6C5CE7',
  },
  autoDetectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  autoDetectPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },

  // Manual Entry Card
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EEF0F6',
    marginBottom: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#14172C',
    letterSpacing: -0.2,
  },
  cardSub: {
    fontSize: 12,
    color: '#667085',
    marginTop: 2,
  },
  keyTag: {
    backgroundColor: '#F4F0FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  keyTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6C5CE7',
    letterSpacing: 0.5,
  },

  // Input & Button Row
  inputGroupRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F8FC',
    borderWidth: 1.5,
    borderColor: '#EEF0F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#14172C',
    paddingVertical: 0,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141624',
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 16,
    gap: 6,
    shadowColor: '#141624',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  verifyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Security Protocol Card
  protocolCard: {
    flexDirection: 'row',
    backgroundColor: '#F9F8FF',
    borderWidth: 1.5,
    borderColor: '#E9E3FF',
    borderRadius: 20,
    padding: 16,
    gap: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  protocolIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  protocolContentCol: {
    flex: 1,
  },
  protocolTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#341B77',
    marginBottom: 3,
  },
  protocolSub: {
    fontSize: 11,
    color: '#5B4E99',
    lineHeight: 16,
    fontWeight: '500',
  },

  // Dismiss Button
  dismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEF0F6',
    height: 48,
    borderRadius: 16,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  dismissBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#667085',
  },
});
