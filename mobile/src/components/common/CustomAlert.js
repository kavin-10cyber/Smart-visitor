import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

const { width } = Dimensions.get('window');

const AlertContext = createContext({
  showAlert: () => {},
  hideAlert: () => {},
});

export function useAlert() {
  return useContext(AlertContext);
}

// Global alert reference so non-hook code / helpers can trigger custom alerts
let globalAlertHandler = null;

export const CustomAlert = {
  alert(title, message, buttons, options) {
    if (globalAlertHandler) {
      globalAlertHandler(title, message, buttons, options);
    } else {
      // Fallback if provider is not mounted
      const RNAlert = require('react-native').Alert;
      RNAlert.alert(title, message, buttons, options);
    }
  },
};

// Distinct Icons for Alert Types
function AlertTypeIcon({ type = 'info', size = 32 }) {
  if (type === 'success') {
    return (
      <View style={[styles.iconContainer, { backgroundColor: '#DCFCE7' }]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <Path d="M22 4L12 14.01l-3-3" />
        </Svg>
      </View>
    );
  }

  if (type === 'danger' || type === 'destructive' || type === 'error') {
    return (
      <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="12" cy="12" r="10" />
          <Line x1="15" y1="9" x2="9" y2="15" />
          <Line x1="9" y1="9" x2="15" y2="15" />
        </Svg>
      </View>
    );
  }

  if (type === 'warning') {
    return (
      <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <Line x1="12" y1="9" x2="12" y2="13" />
          <Line x1="12" y1="17" x2="12.01" y2="17" />
        </Svg>
      </View>
    );
  }

  // Info / Default / Neutral
  return (
    <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <Circle cx="12" cy="12" r="10" />
        <Line x1="12" y1="16" x2="12" y2="12" />
        <Line x1="12" y1="8" x2="12.01" y2="8" />
      </Svg>
    </View>
  );
}

function detectAlertType(title, buttons) {
  const t = (title || '').toLowerCase();
  if (t.includes('success') || t.includes('saved') || t.includes('recorded') || t.includes('unlocked') || t.includes('issued')) {
    return 'success';
  }
  if (t.includes('error') || t.includes('fail') || t.includes('delete') || t.includes('cancel') || t.includes('invalid') || t.includes('denied')) {
    return 'danger';
  }
  if (t.includes('warning') || t.includes('alert') || t.includes('sign out') || t.includes('required') || t.includes('notice')) {
    return 'warning';
  }
  if (Array.isArray(buttons) && buttons.some(b => b.style === 'destructive')) {
    return 'danger';
  }
  return 'info';
}

export function AlertProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    title: '',
    message: '',
    buttons: [],
    type: 'info',
  });

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const hideAlert = useCallback(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
    });
  }, [scaleAnim, opacityAnim]);

  const showAlert = useCallback((title, message, buttons, options) => {
    const determinedType = (options && options.type) || detectAlertType(title, buttons);
    const defaultButtons = [{ text: 'OK', style: 'default' }];
    const resolvedButtons = buttons && buttons.length > 0 ? buttons : defaultButtons;

    setConfig({
      title,
      message,
      buttons: resolvedButtons,
      type: determinedType,
    });
    setVisible(true);

    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim]);

  // Register global alert handler
  globalAlertHandler = showAlert;

  const handleButtonPress = (btn) => {
    hideAlert();
    if (btn.onPress) {
      setTimeout(() => {
        btn.onPress();
      }, 100);
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {visible && (
        <Modal
          transparent
          visible={visible}
          animationType="none"
          statusBarTranslucent
          onRequestClose={hideAlert}
        >
          <View style={styles.overlay}>
            <Animated.View
              style={[
                styles.backdrop,
                { opacity: opacityAnim },
              ]}
            >
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={hideAlert}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.card,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Header Accent Pill */}
              <View style={styles.topAccent} />

              {/* Icon badge */}
              <AlertTypeIcon type={config.type} />

              {/* Title */}
              {Boolean(config.title) && (
                <Text style={styles.title}>{config.title}</Text>
              )}

              {/* Message */}
              {Boolean(config.message) && (
                <Text style={styles.message}>{config.message}</Text>
              )}

              {/* Action Buttons */}
              <View
                style={[
                  styles.buttonRow,
                  config.buttons.length > 2 && styles.buttonColumn,
                ]}
              >
                {config.buttons.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';

                  let btnBg = '#1E293B'; // App primary slate
                  let textColor = '#FFFFFF';
                  let borderColor = 'transparent';

                  if (isCancel) {
                    btnBg = '#F1F5F9';
                    textColor = '#475569';
                  } else if (isDestructive) {
                    btnBg = '#EF4444';
                    textColor = '#FFFFFF';
                  } else if (config.type === 'success') {
                    btnBg = '#10B981';
                    textColor = '#FFFFFF';
                  } else if (config.type === 'warning') {
                    btnBg = '#F59E0B';
                    textColor = '#FFFFFF';
                  }

                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.8}
                      onPress={() => handleButtonPress(btn)}
                      style={[
                        styles.actionButton,
                        { backgroundColor: btnBg, borderColor },
                        config.buttons.length <= 2 && { flex: 1 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionButtonText,
                          { color: textColor },
                          !isCancel && { fontWeight: '700' },
                        ]}
                      >
                        {btn.text || 'OK'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  card: {
    width: Math.min(width - 48, 380),
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 26,
    paddingBottom: 22,
    paddingHorizontal: 22,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
      android: {
        elevation: 16,
      },
    }),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  topAccent: {
    position: 'absolute',
    top: 8,
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  actionButton: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
