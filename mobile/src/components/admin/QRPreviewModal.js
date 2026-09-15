import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { CloseIcon } from '../AdminIcons';
import QRCodeDisplay from '../QRCodeDisplay';
import styles from '../../styles/adminStyles';

/**
 * QRPreviewModal — shows the digital QR badge for a generated token.
 * Props: token (token object or null), onClose
 */
export default function QRPreviewModal({ token, onClose }) {
  return (
    <Modal
      visible={!!token}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Digital QR Badge</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <CloseIcon size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {token && (
            <ScrollView
              contentContainerStyle={styles.qrModalContent}
              showsVerticalScrollIndicator={false}
            >
              <QRCodeDisplay
                tokenCode={token.token_code}
                status={token.status || 'AVAILABLE'}
                size={210}
              />
              <TouchableOpacity style={styles.closeModalSimpleBtn} onPress={onClose}>
                <Text style={styles.closeModalSimpleBtnText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
