import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  CheckOutIcon,
  InfoIcon,
  PhoneIcon,
  ArrowEnterIcon,
  CheckMarkIcon,
} from '../AdminIcons';
import styles from '../../styles/adminStyles';

// Pastel avatar color pairs
const AVATAR_PALETTES = [
  { bg: '#e0e7ff', text: '#3730a3' },
  { bg: '#ede9fe', text: '#5b21b6' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#e0f2fe', text: '#0369a1' },
  { bg: '#dcfce7', text: '#15803d' },
  { bg: '#fef3c7', text: '#b45309' },
  { bg: '#ffedd5', text: '#c2410c' },
];

export function getAvatarPalette(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

export function getInitials(name = '') {
  if (!name) return 'V';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatDisplayTime(isoString) {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (e) {
    return isoString;
  }
}

/**
 * VisitorCard — a single visitor row in the campus manifest list.
 * Props:
 *   item, index, onCheckOut, onReschedule, onCancelToken, onDetails, onCall
 */
export default function VisitorCard({
  item,
  index,
  onCheckOut,
  onReschedule,
  onCancelToken,
  onDetails,
  onCall,
}) {
  const isScheduled = item.status === 'SCHEDULED';
  const isInside = item.status === 'ACTIVE';
  const isVip = item.is_vip || item.category === 'VIP';
  const palette = getAvatarPalette(item.full_name || 'Visitor');
  const initials = getInitials(item.full_name);
  const gate = item.gate || 'Gate 1 Entrance';
  const purposeLabel = item.purpose || 'General Visit';
  const hostLabel =
    item.host || (item.address ? `${item.address}` : 'Dr. Amar Karthik (Placement Cell)');

  return (
    <View
      key={item.id || item.token_code || index}
      style={[styles.visitorCard, isVip && styles.vipCardHighlight]}
    >
      {/* Card Header Row */}
      <View style={styles.visitorCardTopRow}>
        <View style={styles.visitorCardLeftTags}>
          <View style={styles.tokenPill}>
            <Text style={styles.tokenPillText}>{item.token_code || 'V-000'}</Text>
          </View>
          <Text style={styles.gateLocationText} numberOfLines={1}>
            {gate}
          </Text>
        </View>

        {/* Sub-status: SCHEDULED (Yellow Badge) vs INSIDE (Green Badge) vs CHECKED OUT */}
        {isScheduled ? (
          <View style={[styles.statusPill, styles.statusPillScheduled]}>
            <View style={[styles.statusDot, styles.statusDotScheduled]} />
            <Text style={[styles.statusPillText, styles.statusPillTextScheduled]}>
              SCHEDULED
            </Text>
          </View>
        ) : isInside ? (
          <View style={[styles.statusPill, styles.statusPillInside]}>
            <View style={[styles.statusDot, styles.statusDotInside]} />
            <Text style={[styles.statusPillText, styles.statusPillTextInside]}>
              INSIDE
            </Text>
          </View>
        ) : (
          <View style={[styles.statusPill, styles.statusPillDone]}>
            <View style={[styles.statusDot, styles.statusDotDone]} />
            <Text style={[styles.statusPillText, styles.statusPillTextDone]}>
              {item.status === 'CANCELLED' ? 'CANCELLED' : 'CHECKED OUT'}
            </Text>
          </View>
        )}
      </View>

      {/* Visitor Profile Info Row */}
      <View style={styles.visitorInfoRow}>
        <View style={[styles.avatarBox, { backgroundColor: palette.bg }]}>
          <Text style={[styles.avatarText, { color: palette.text }]}>{initials}</Text>
        </View>
        <View style={styles.visitorDetailsCol}>
          <View style={styles.nameCategoryRow}>
            <Text style={styles.visitorFullName} numberOfLines={1}>
              {item.full_name || 'Visitor Name'}
            </Text>
            <View style={styles.purposeTag}>
              <Text style={styles.purposeTagText} numberOfLines={1}>
                {purposeLabel}
              </Text>
            </View>
          </View>

          <Text style={styles.hostText} numberOfLines={1}>
            Host: <Text style={styles.hostBold}>{hostLabel}</Text>
          </Text>

          <View style={styles.metaSubRow}>
            <View style={styles.metaItem}>
              <ArrowEnterIcon size={12} color="#64748b" />
              <Text style={styles.metaItemText}>
                {isScheduled
                  ? `Expected: ${item.expected_date || 'Today'}`
                  : `In: ${formatDisplayTime(item.check_in)}`}
              </Text>
            </View>
            {item.mobile && (
              <TouchableOpacity
                style={styles.metaItem}
                onPress={() => onCall && onCall(item.mobile)}
              >
                <PhoneIcon size={12} color="#64748b" />
                <Text style={styles.metaItemTextLink}>+91 {item.mobile}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Tags: VIP, Company, Vehicle, Time Window */}
      {(item.company || item.vehicle_no || item.expected_date || isVip) ? (
        <View style={styles.scheduledExtraRow}>
          {isVip && (
            <View style={styles.vipTagBadge}>
              <Text style={styles.vipTagBadgeText}>👑 VIP GUEST</Text>
            </View>
          )}
          {!!item.company && (
            <View style={styles.companyTag}>
              <Text style={styles.companyTagText}>🏢 {item.company}</Text>
            </View>
          )}
          {!!item.vehicle_no && (
            <View style={styles.vehicleTag}>
              <Text style={styles.vehicleTagText}>🚗 {item.vehicle_no}</Text>
            </View>
          )}
          {isScheduled && (
            <View style={styles.scheduledDateTag}>
              <Text style={styles.scheduledDateTagText}>
                ⏰ {item.time_window || '09:00 AM - 01:00 PM'}
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Bottom Action Buttons:
          - If SCHEDULED: Reschedule or Cancel Token button
          - If INSIDE: Check Out button
          - Plus Contact / Details */}
      <View style={styles.visitorActionRow}>
        {isScheduled ? (
          <>
            <TouchableOpacity
              style={[styles.visitorActionBtn, styles.rescheduleBtn]}
              onPress={() => onReschedule && onReschedule(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.rescheduleBtnText}>📅 Reschedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.visitorActionBtn, styles.cancelTokenBtn]}
              onPress={() => onCancelToken && onCancelToken(item)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelTokenBtnText}>✕ Cancel Token</Text>
            </TouchableOpacity>
          </>
        ) : isInside ? (
          <TouchableOpacity
            style={[styles.visitorActionBtn, styles.checkOutBtn]}
            onPress={() => onCheckOut(item)}
            activeOpacity={0.8}
          >
            <CheckOutIcon size={16} color="#1e293b" />
            <Text style={styles.checkOutBtnText}>Check Out</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.visitorActionBtn, styles.completedBtn]}>
            <CheckMarkIcon size={16} color="#15803d" />
            <Text style={styles.completedBtnText}>
              {item.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.visitorActionBtn, styles.detailsBtn]}
          onPress={() => onDetails(item)}
          activeOpacity={0.8}
        >
          <InfoIcon size={16} color="#1e40af" />
          <Text style={styles.detailsBtnText}>Contact / Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
