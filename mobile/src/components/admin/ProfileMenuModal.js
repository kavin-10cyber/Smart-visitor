import React from 'react';
import { View, Text, Modal, TouchableOpacity, Alert } from 'react-native';
import { CloseIcon, BarChartIcon, QrTabIcon, SparklesIcon, LogoutIcon } from '../AdminIcons';
import styles from '../../styles/adminStyles';

/**
 * ProfileMenuModal — slide-up admin menu with nav shortcuts and logout.
 * Props: visible, onClose, onNavigate(tab), onRefresh, onLogout
 */
function ProfileMenuModal({ visible, onClose, onNavigate, onRefresh, onLogout }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Admin Menu</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <CloseIcon size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.menuSheetContent}>
            <TouchableOpacity
              style={styles.menuItemRow}
              onPress={() => {
                onClose();
                onNavigate('analytics');
              }}
            >
              <BarChartIcon size={20} color="#2563eb" />
              <Text style={styles.menuItemText}>View Campus Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItemRow}
              onPress={() => {
                onClose();
                onNavigate('tokens');
              }}
            >
              <QrTabIcon size={20} color="#2563eb" />
              <Text style={styles.menuItemText}>Manage QR Tokens</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItemRow}
              onPress={() => {
                onRefresh();
                onClose();
              }}
            >
              <SparklesIcon size={20} color="#2563eb" />
              <Text style={styles.menuItemText}>Force Refresh Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItemRow, { borderBottomWidth: 0, marginTop: 12 }]}
              onPress={() => {
                onClose();
                Alert.alert('Sign Out', 'Do you wish to log out of the Admin portal?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Log Out', style: 'destructive', onPress: onLogout },
                ]);
              }}
            >
              <LogoutIcon size={20} color="#ef4444" />
              <Text style={[styles.menuItemText, { color: '#ef4444', fontWeight: '700' }]}>
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default React.memo(ProfileMenuModal);

