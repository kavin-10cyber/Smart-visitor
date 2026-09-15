import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { CloseIcon } from '../AdminIcons';
import styles from '../../styles/adminStyles';

/**
 * IssueTokenModal — bottom sheet form to issue a campus pass to a walk-in visitor.
 * Props:
 *   visible, onClose
 *   availableTokens, selectedToken
 *   visitorName, visitorPhone, visitorHost, visitorPurpose
 *   onChangeName, onChangePhone, onChangeHost, onChangePurpose
 *   onSubmit, isLoading
 */
export default function IssueTokenModal({
  visible,
  onClose,
  availableTokens,
  selectedToken,
  visitorName,
  visitorPhone,
  visitorHost,
  visitorPurpose,
  onChangeName,
  onChangePhone,
  onChangeHost,
  onChangePurpose,
  onSubmit,
  isLoading,
}) {
  const availableCount = availableTokens.length;

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
            <Text style={styles.modalHeaderTitle}>Issue Campus Pass</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <CloseIcon size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.formInputLabel}>Assigned Token ID</Text>
            <View style={styles.tokenSelectorBox}>
              <Text style={styles.tokenSelectorText}>
                {selectedToken || (availableTokens[0]?.token_code ?? 'None')}
              </Text>
              <Text style={styles.tokenSelectorSub}>
                {availableCount} available tokens in fleet
              </Text>
            </View>

            <Text style={styles.formInputLabel}>Visitor Full Name *</Text>
            <TextInput
              style={styles.formTextInput}
              placeholder="e.g. Arun Kumar"
              placeholderTextColor="#94a3b8"
              value={visitorName}
              onChangeText={onChangeName}
            />

            <Text style={styles.formInputLabel}>Mobile Number *</Text>
            <TextInput
              style={styles.formTextInput}
              placeholder="e.g. 9840122345"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={visitorPhone}
              onChangeText={onChangePhone}
            />

            <Text style={styles.formInputLabel}>Host Person / Dept</Text>
            <TextInput
              style={styles.formTextInput}
              placeholder="e.g. Prof. Radhakrishnan (EE Dept)"
              placeholderTextColor="#94a3b8"
              value={visitorHost}
              onChangeText={onChangeHost}
            />

            <Text style={styles.formInputLabel}>Purpose of Visit</Text>
            <TextInput
              style={styles.formTextInput}
              placeholder="e.g. General Visit / Admission Enquiry"
              placeholderTextColor="#94a3b8"
              value={visitorPurpose}
              onChangeText={onChangePurpose}
            />

            <TouchableOpacity
              style={styles.submitIssueBtn}
              onPress={onSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitIssueBtnText}>Confirm Check-In Pass</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
