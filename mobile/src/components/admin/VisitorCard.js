import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import {
  CheckOutIcon,
  PhoneIcon,
  CheckMarkIcon,
  CrownIcon,
  BuildingIcon,
  ClockIcon,
  CalendarIcon,
  CancelCircleIcon,
  ChevronRightIcon,
} from '../AdminIcons';
import styles from '../../styles/adminStyles';

// Executive avatar color pairs
const AVATAR_PALETTES = [
  { bg: '#eff6ff', text: '#1d4ed8' },
  { bg: '#f1f5f9', text: '#334155' },
  { bg: '#ede9fe', text: '#5b21b6' },
  { bg: '#f0fdf4', text: '#15803d' },
  { bg: '#f8fafc', text: '#475569' },
  { bg: '#fff7ed', text: '#c2410c' },
  { bg: '#e0f2fe', text: '#0369a1' },
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
 * VisitorCard — Minimal, executive campus manifest visitor card.
 *
 * Features:
 *  - Ultra-clean card face with zero unnecessary clutter
 *  - Tapping the card opens the full visitor profile in a modal
 *  - Single-color line icons (zero emojis)
 *  - Clean light-gray border (#E5E7EB) and soft drop shadow
 *  - Executive VIP micro-badge with royal blue left accent
 *  - 3 equal-width outline buttons (Reschedule, Cancel, Contact) with flex: 1
 */
function VisitorCard({
  item,
  index,
  onCheckOut,
  onReschedule,
  onCancelToken,
  onDetails,
  onCall,
}) {
  const visitorName = (
    item?.full_name ||
    item?.fullName ||
    item?.name ||
    item?.visitor_name ||
    'Visitor Name'
  ).trim() || 'Visitor Name';

  const isScheduled = item.status === 'SCHEDULED';
  const isInside = item.status === 'ACTIVE';
  const isVip = item.is_vip || item.category === 'VIP';
  const palette = getAvatarPalette(visitorName);
  const initials = getInitials(visitorName);

  const dateDisplay = isScheduled
    ? (item.expected_date || 'Today')
    : (item.check_in ? new Date(item.check_in).toLocaleDateString() : 'Today');

  const timeDisplay = isScheduled
    ? (item.time_window || '09:00 AM - 01:00 PM')
    : formatDisplayTime(item.check_in);

  const handleCardPress = () => {
    if (onDetails) {
      onDetails(item);
    }
  };

  return (
    <View
      key={item.id || item.token_code || index}
      style={[styles.visitorCard, isVip && styles.vipCardHighlight]}
    >
      {/* ── 1. Top Bar: Token & VIP Micro-Badge + Status Pill ── */}
      <View style={styles.visitorCardTopRow}>
        <View style={styles.visitorCardLeftTags}>
          <View style={styles.tokenPill}>
            <Text style={styles.tokenPillText}>{item.token_code || 'V-000'}</Text>
          </View>
          {isVip && (
            <View style={styles.vipTagBadge}>
              <CrownIcon size={12} color="#1d4ed8" />
              <Text style={styles.vipTagBadgeText}>VIP GUEST</Text>
            </View>
          )}
        </View>

        {/* Clean Status Pill with #E5E7EB Light Gray Border */}
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

      {/* ── 2. Clickable Visitor Profile Summary (Opens Details Modal on click) ── */}
      <TouchableOpacity
        style={[styles.visitorInfoRowClickable, { width: '100%', alignSelf: 'stretch' }]}
        activeOpacity={0.7}
        onPress={handleCardPress}
      >
        <View style={[styles.avatarBox, { backgroundColor: palette.bg }]}>
          <Text style={[styles.avatarText, { color: palette.text }]}>{initials}</Text>
        </View>

        <View style={styles.visitorDetailsCol}>
          {/* Prominent, 100% visible visitor name */}
          <Text style={styles.visitorFullName} numberOfLines={1} ellipsizeMode="tail">
            {visitorName}
          </Text>

          {/* Sub Row: Company + Date + Time */}
          <View style={styles.compactSubRow}>
            {item.company ? (
              <View style={styles.compactMetaItem}>
                <BuildingIcon size={12} color="#64748b" />
                <Text style={styles.compactSubText} numberOfLines={1}>
                  {item.company}
                </Text>
              </View>
            ) : null}
            <View style={styles.compactMetaItem}>
              <CalendarIcon size={12} color="#64748b" />
              <Text style={styles.compactSubText} numberOfLines={1}>
                {dateDisplay}
              </Text>
            </View>
            <View style={styles.compactMetaItem}>
              <ClockIcon size={12} color="#64748b" />
              <Text style={styles.compactSubText} numberOfLines={1}>
                {timeDisplay}
              </Text>
            </View>
          </View>
        </View>

        {/* Minimal Tap Target Arrow */}
        <View style={styles.expandChevronBtn}>
          <ChevronRightIcon size={14} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      {/* ── 3. Bottom Action Row: 3 Equal-Width Clean Outline Buttons ── */}
      <View style={styles.visitorActionRow}>
        {isScheduled ? (
          <>
            {/* 1. Reschedule Button (flex: 1) */}
            <TouchableOpacity
              style={styles.outlineActionBtn}
              onPress={() => onReschedule && onReschedule(item)}
              activeOpacity={0.7}
            >
              <CalendarIcon size={14} color="#2563eb" />
              <Text style={styles.outlineActionBtnText}>Reschedule</Text>
            </TouchableOpacity>

            {/* 2. Cancel Button (flex: 1) */}
            <TouchableOpacity
              style={styles.outlineActionBtnCancel}
              onPress={() => onCancelToken && onCancelToken(item)}
              activeOpacity={0.7}
            >
              <CancelCircleIcon size={14} color="#dc2626" />
              <Text style={styles.outlineActionBtnCancelText}>Cancel</Text>
            </TouchableOpacity>

            {/* 3. Contact / Details Button (flex: 1) */}
            <TouchableOpacity
              style={styles.outlineActionBtn}
              onPress={handleCardPress}
              activeOpacity={0.7}
            >
              <PhoneIcon size={14} color="#475569" />
              <Text style={styles.outlineActionBtnText}>Contact</Text>
            </TouchableOpacity>
          </>
        ) : isInside ? (
          <>
            <TouchableOpacity
              style={[styles.outlineActionBtn, styles.checkOutBtn]}
              onPress={() => onCheckOut && onCheckOut(item)}
              activeOpacity={0.7}
            >
              <CheckOutIcon size={14} color="#1e293b" />
              <Text style={styles.checkOutBtnText}>Check Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineActionBtn}
              onPress={handleCardPress}
              activeOpacity={0.7}
            >
              <PhoneIcon size={14} color="#475569" />
              <Text style={styles.outlineActionBtnText}>Contact</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.outlineActionBtn, styles.completedBtn]}>
              <CheckMarkIcon size={14} color="#15803d" />
              <Text style={styles.completedBtnText}>
                {item.status === 'CANCELLED' ? 'Cancelled' : 'Completed'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.outlineActionBtn}
              onPress={handleCardPress}
              activeOpacity={0.7}
            >
              <PhoneIcon size={14} color="#475569" />
              <Text style={styles.outlineActionBtnText}>Details</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

export default React.memo(VisitorCard);

