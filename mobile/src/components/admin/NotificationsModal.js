import React, { useMemo } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import {
  CloseIcon,
  DoorEnterIcon,
  CrownIcon,
  CalendarIcon,
  QRIcon,
  ClockIcon,
  CheckMarkIcon,
  AlertTriangleIcon,
  UsersIcon,
} from '../AdminIcons';

/**
 * NotificationsModal — live data-driven security & campus alerts.
 * Props: visible, onClose, activeVisits, scheduledVisits, historyVisits, availableCount, totalTokensCount
 */
function NotificationsModal({
  visible,
  onClose,
  activeVisits = [],
  scheduledVisits = [],
  historyVisits = [],
  availableCount = 0,
  totalTokensCount = 0,
}) {
  const notifications = useMemo(() => {
    const items = [];
    const now = new Date();
    const todayStr = now.toDateString();

    // ── 1. Low Token Inventory Warning (Critical) ──────────────
    const tokenPct = totalTokensCount > 0 ? (availableCount / totalTokensCount) * 100 : 100;
    if (availableCount <= 5) {
      items.push({
        id: 'low_tokens',
        type: 'critical',
        icon: 'alert',
        iconBg: '#fee2e2',
        iconColor: '#dc2626',
        title: `Only ${availableCount} QR Token${availableCount === 1 ? '' : 's'} Left`,
        sub: 'Token inventory critically low. Generate new QR tokens immediately.',
        time: 'Now',
      });
    } else if (tokenPct < 30) {
      items.push({
        id: 'low_tokens_warn',
        type: 'warning',
        icon: 'alert',
        iconBg: '#fef3c7',
        iconColor: '#d97706',
        title: `Token Inventory Low — ${availableCount} Remaining`,
        sub: `${Math.round(tokenPct)}% of tokens available. Consider generating more soon.`,
        time: 'Now',
      });
    }

    // ── 2. Active VIP Visitors Inside Campus ──────────────────
    const vipInside = activeVisits.filter(
      v => v.is_vip || v.category === 'VIP'
    );
    if (vipInside.length > 0) {
      vipInside.forEach(v => {
        const name = v.full_name || v.name || 'VIP Guest';
        items.push({
          id: `vip_${v.id || v.token_code}`,
          type: 'vip',
          icon: 'crown',
          iconBg: '#F1F5FA',
          iconColor: '#071D40',
          title: `VIP Guest Active — ${name}`,
          sub: v.company ? `${v.company} · Badge ${v.token_code}` : `Badge ${v.token_code} · Currently inside campus`,
          time: v.check_in
            ? _timeAgo(new Date(v.check_in))
            : 'Active',
        });
      });
    }

    // ── 3. Active Visitors Inside Count ──────────────────────
    const nonVipActive = activeVisits.filter(v => !v.is_vip && v.category !== 'VIP');
    if (nonVipActive.length > 0) {
      items.push({
        id: 'active_count',
        type: 'info',
        icon: 'users',
        iconBg: '#f0fdf4',
        iconColor: '#15803d',
        title: `${nonVipActive.length} Visitor${nonVipActive.length > 1 ? 's' : ''} Currently Inside`,
        sub: nonVipActive
          .slice(0, 2)
          .map(v => v.full_name || v.name || 'Visitor')
          .join(', ') + (nonVipActive.length > 2 ? ` +${nonVipActive.length - 2} more` : ''),
        time: 'Live',
      });
    }

    // ── 4. Upcoming Scheduled Visits Today ────────────────────
    const todayScheduled = scheduledVisits.filter(v => {
      if (!v.expected_date) return false;
      try {
        const d = new Date(v.expected_date);
        return d.toDateString() === todayStr || v.expected_date === 'Today';
      } catch { return false; }
    });

    if (todayScheduled.length > 0) {
      todayScheduled.slice(0, 3).forEach(v => {
        const name = v.full_name || v.name || 'Visitor';
        items.push({
          id: `sched_${v.id || v.token_code}`,
          type: 'scheduled',
          icon: 'calendar',
          iconBg: '#faf5ff',
          iconColor: '#123B73',
          title: `Scheduled: ${name}`,
          sub: v.time_window
            ? `Expected ${v.time_window}${v.company ? ' · ' + v.company : ''}`
            : `Pre-approved visit today${v.company ? ' · ' + v.company : ''}`,
          time: 'Today',
        });
      });
      if (todayScheduled.length > 3) {
        items.push({
          id: 'sched_more',
          type: 'info',
          icon: 'calendar',
          iconBg: '#f1f5f9',
          iconColor: '#64748b',
          title: `+${todayScheduled.length - 3} More Scheduled Visits Today`,
          sub: 'Open the visitor manifest for full details.',
          time: 'Today',
        });
      }
    }

    // ── 5. Upcoming Scheduled (Not Today) ────────────────────
    const futureScheduled = scheduledVisits.filter(v => {
      if (!v.expected_date) return false;
      try {
        const d = new Date(v.expected_date);
        return d.toDateString() !== todayStr && v.expected_date !== 'Today';
      } catch { return false; }
    });
    if (futureScheduled.length > 0) {
      items.push({
        id: 'upcoming_sched',
        type: 'info',
        icon: 'clock',
        iconBg: '#F1F5FA',
        iconColor: '#0B2A5B',
        title: `${futureScheduled.length} Upcoming Pre-Approved Pass${futureScheduled.length > 1 ? 'es' : ''}`,
        sub: futureScheduled
          .slice(0, 2)
          .map(v => `${v.full_name || 'Visitor'} (${v.expected_date || 'TBD'})`)
          .join(', '),
        time: 'Upcoming',
      });
    }

    // ── 6. Recent Check-Outs (last 5 completions today) ──────
    const recentCheckouts = historyVisits
      .filter(v => v.status === 'COMPLETED' && v.check_out)
      .filter(v => {
        try {
          return new Date(v.check_out).toDateString() === todayStr;
        } catch { return false; }
      })
      .slice(0, 2);

    recentCheckouts.forEach(v => {
      const name = v.full_name || v.name || 'Visitor';
      items.push({
        id: `checkout_${v.id || v.token_code}`,
        type: 'success',
        icon: 'check',
        iconBg: '#f0fdf4',
        iconColor: '#15803d',
        title: `Checked Out — ${name}`,
        sub: `Badge ${v.token_code} returned to pool.`,
        time: v.check_out ? _timeAgo(new Date(v.check_out)) : 'Today',
      });
    });

    // ── 7. All Clear (if no visitors and no issues) ───────────
    if (items.length === 0) {
      items.push({
        id: 'all_clear',
        type: 'success',
        icon: 'check',
        iconBg: '#f0fdf4',
        iconColor: '#15803d',
        title: 'Campus All Clear',
        sub: 'No active alerts. All systems operating normally.',
        time: 'Now',
      });
    }

    return items;
  }, [activeVisits, scheduledVisits, historyVisits, availableCount, totalTokensCount]);

  const unreadCount = notifications.filter(n => n.type === 'critical' || n.type === 'vip').length;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      {/* Tap outside to dismiss */}
      <TouchableOpacity
        style={notifStyles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Stop propagation inside the card */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={notifStyles.dropdownCard}
        >
          {/* Arrow caret pointing up toward bell */}
          <View style={notifStyles.caret} />

          {/* Header */}
          <View style={notifStyles.dropdownHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Text style={notifStyles.dropdownTitle}>Alerts & Activity</Text>
              {unreadCount > 0 && (
                <View style={notifStyles.unreadBadge}>
                  <Text style={notifStyles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <CloseIcon size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 400 }}
            bounces={false}
          >
            {notifications.length === 0 ? (
              <View style={notifStyles.emptyState}>
                <CheckMarkIcon size={24} color="#15803d" />
                <Text style={notifStyles.emptyTitle}>All Clear</Text>
                <Text style={notifStyles.emptySub}>No active alerts right now.</Text>
              </View>
            ) : (
              notifications.map((notif, idx) => (
                <View
                  key={notif.id}
                  style={[
                    notifStyles.notifRow,
                    notif.type === 'critical' && notifStyles.criticalRow,
                    idx === notifications.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={[notifStyles.notifIcon, { backgroundColor: notif.iconBg }]}>
                    {notif.icon === 'crown' && <CrownIcon size={14} color={notif.iconColor} />}
                    {notif.icon === 'alert' && <AlertTriangleIcon size={14} color={notif.iconColor} />}
                    {notif.icon === 'calendar' && <CalendarIcon size={14} color={notif.iconColor} />}
                    {notif.icon === 'clock' && <ClockIcon size={14} color={notif.iconColor} />}
                    {notif.icon === 'door' && <DoorEnterIcon size={14} color={notif.iconColor} />}
                    {notif.icon === 'qr' && <QRIcon size={14} color={notif.iconColor} />}
                    {notif.icon === 'check' && <CheckMarkIcon size={14} color={notif.iconColor} />}
                    {notif.icon === 'users' && <UsersIcon size={14} color={notif.iconColor} />}
                  </View>
                  <View style={notifStyles.notifContent}>
                    <Text style={[notifStyles.notifTitle, notif.type === 'critical' && { color: '#dc2626' }]}>
                      {notif.title}
                    </Text>
                    <Text style={notifStyles.notifSub} numberOfLines={2}>{notif.sub}</Text>
                    <Text style={[notifStyles.notifTime, notif.type === 'critical' && { color: '#ef4444' }]}>
                      {notif.time}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Dropdown card styles — positioned near the bell icon ──────
const notifStyles = {
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  dropdownCard: {
    marginTop: 56,        // below status bar + header (~56dp)
    marginRight: 12,      // align near the right edge / bell icon
    width: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 0,
    paddingBottom: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 14,
    overflow: 'visible',
  },
  caret: {
    position: 'absolute',
    top: -7,
    right: 22,           // points toward the bell icon
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffffff',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  unreadBadge: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  notifRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F9FC',
  },
  criticalRow: {
    backgroundColor: '#fff5f5',
  },
  notifIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    minWidth: 0,
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.1,
  },
  notifSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  notifTime: {
    fontSize: 10,
    color: '#7B8CA3',
    marginTop: 3,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 6,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
};

// ── Helper: human-readable time-ago ──────────────────────────────
function _timeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

export default React.memo(NotificationsModal);

