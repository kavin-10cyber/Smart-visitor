import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { api } from '../services/api';
import {
  BellIcon,
  QRIcon,
  GridIcon,
  QrTabIcon,
  IssueTokenTabIcon,
  BarChartIcon,
  UserTabIcon,
  LogoutIcon,
  SearchIcon,
  CloseIcon,
  FilterIcon,
  EventsTabIcon,
  TicketIcon,
  CalendarIcon,
  KeyIcon,
  FilterSlidersIcon,
  ArrowUpRightIcon,
  PlusIcon,
  QrNavIcon,
  CrownIcon,
  WrenchIcon,
  BuildingIcon,
  HomeTabIcon,
  ShieldTabIcon,
  TotalPassIcon,
  HistoryIcon,
} from '../components/AdminIcons';

// Extracted components
import VisitorCard from '../components/admin/VisitorCard';
import VisitorDetailsModal from '../components/admin/VisitorDetailsModal';
import QRPreviewModal from '../components/admin/QRPreviewModal';
import IssueScheduledTokenModal from '../components/admin/IssueScheduledTokenModal';
import RescheduleModal from '../components/admin/RescheduleModal';
import NotificationsModal from '../components/admin/NotificationsModal';
import ProfileMenuModal from '../components/admin/ProfileMenuModal';
import AddEventModal from '../components/admin/AddEventModal';
import VisitorHistoryModal from '../components/admin/VisitorHistoryModal';
import LiveHeaderClock from '../components/common/LiveHeaderClock';
import { FilterModal } from '../components/security/SecurityModals';

// Styles & helpers
import styles from '../styles/adminStyles';

export default function AdminPortal({ onLogout }) {
  // ── Navigation ──────────────────────────────────────────────
  const [activeNavTab, setActiveNavTab] = useState('dashboard');

  // ── Dashboard Filters ────────────────────────────────────────
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Data ─────────────────────────────────────────────────────
  const [tokens, setTokens] = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);
  const [scheduledVisits, setScheduledVisits] = useState([]);
  const [historyVisits, setHistoryVisits] = useState([]);
  const [events, setEvents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);

  // ── Events Handling State ────────────────────────────────────
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [eventSearchQuery, setEventSearchQuery] = useState('');

  // ── Modals ───────────────────────────────────────────────────
  const [selectedVisitorDetails, setSelectedVisitorDetails] = useState(null);
  const [previewToken, setPreviewToken] = useState(null);
  const [showIssueTokenModal, setShowIssueTokenModal] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [reschedulingLoading, setReschedulingLoading] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // ── Issue Token State ────────────────────────────────────────
  const [issuingLoading, setIssuingLoading] = useState(false);

  // ── Derived values ───────────────────────────────────────────
  const availableTokens = useMemo(() => tokens.filter((t) => t.status === 'AVAILABLE'), [tokens]);
  const inUseTokens = useMemo(() => tokens.filter((t) => t.status === 'IN USE'), [tokens]);
  const availableCount = availableTokens.length;
  const totalTokensCount = tokens.length;
  const maxCapacity = Math.max(totalTokensCount, 100);
  const capacityPercent = Math.min(100, Math.round((availableCount / (maxCapacity || 1)) * 100));
  const totalTodayCount = activeVisits.length + scheduledVisits.length + historyVisits.length;

  const hasNotificationAlerts = useMemo(() => {
    return (
      activeVisits.some((v) => v.is_vip || v.category === 'VIP') ||
      availableCount <= 5 ||
      scheduledVisits.some((v) => v.expected_date === 'Today')
    );
  }, [activeVisits, availableCount, scheduledVisits]);

  const allVisitsCombined = useMemo(
    () => [...activeVisits, ...scheduledVisits, ...historyVisits],
    [activeVisits, scheduledVisits, historyVisits]
  );

  const filterCounts = useMemo(() => {
    let vip = 0;
    let contractors = 0;
    for (let i = 0; i < allVisitsCombined.length; i++) {
      const v = allVisitsCombined[i];
      if (
        v.is_vip ||
        v.category === 'VIP' ||
        (v.purpose && v.purpose.toLowerCase().includes('vip')) ||
        (v.address && v.address.toLowerCase().includes('vip'))
      ) {
        vip++;
      }
      if (
        v.category === 'Contractor' ||
        v.category === 'Utility' ||
        (v.purpose &&
          (v.purpose.toLowerCase().includes('contract') ||
            v.purpose.toLowerCase().includes('atm') ||
            v.purpose.toLowerCase().includes('utility') ||
            v.purpose.toLowerCase().includes('maintenance') ||
            v.purpose.toLowerCase().includes('delivery')))
      ) {
        contractors++;
      }
    }
    return {
      all: allVisitsCombined.length,
      active: activeVisits.length,
      inside: activeVisits.length,
      issued: scheduledVisits.length,
      exited: historyVisits.length,
      vip,
      contractors,
      history: historyVisits.length,
    };
  }, [allVisitsCombined, activeVisits.length, scheduledVisits.length, historyVisits.length]);

  const selectedFilterName = useMemo(() => {
    switch (selectedFilter) {
      case 'ISSUED':
      case 'SCHEDULED':
        return 'Issued Passes';
      case 'INSIDE':
      case 'ACTIVE':
        return 'Inside Campus';
      case 'EXITED':
      case 'HISTORY':
        return 'Exited';
      case 'VIP':
        return 'VIP Passes';
      case 'CONTRACTORS':
        return 'Contractors';
      case 'GENERAL':
        return 'General';
      default:
        return 'All Passes';
    }
  }, [selectedFilter]);

  const filteredVisits = useMemo(() => {
    let list = [];
    if (selectedFilter === 'ACTIVE' || selectedFilter === 'INSIDE') {
      list = activeVisits;
    } else if (selectedFilter === 'SCHEDULED' || selectedFilter === 'ISSUED') {
      list = scheduledVisits;
    } else if (selectedFilter === 'EXITED' || selectedFilter === 'HISTORY') {
      list = historyVisits;
    } else if (selectedFilter === 'VIP') {
      list = allVisitsCombined.filter(
        (v) =>
          v.is_vip ||
          v.category === 'VIP' ||
          (v.purpose && v.purpose.toLowerCase().includes('vip')) ||
          (v.address && v.address.toLowerCase().includes('vip'))
      );
    } else if (selectedFilter === 'CONTRACTORS') {
      list = allVisitsCombined.filter(
        (v) =>
          v.category === 'Contractor' ||
          v.category === 'Utility' ||
          (v.purpose && v.purpose.toLowerCase().includes('contract')) ||
          (v.purpose && v.purpose.toLowerCase().includes('atm')) ||
          (v.purpose && v.purpose.toLowerCase().includes('utility')) ||
          (v.purpose && v.purpose.toLowerCase().includes('maintenance')) ||
          (v.purpose && v.purpose.toLowerCase().includes('delivery'))
      );
    } else if (selectedFilter === 'GENERAL') {
      list = allVisitsCombined.filter(
        (v) =>
          v.category === 'General' ||
          (!v.is_vip && v.category !== 'VIP' && v.category !== 'Contractor')
      );
    } else if (selectedFilter === 'VEHICLES') {
      list = allVisitsCombined.filter(
        (v) => v.vehicle_no || (v.purpose && v.purpose.toLowerCase().includes('veh'))
      );
    } else {
      list = allVisitsCombined;
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        (item.full_name && item.full_name.toLowerCase().includes(q)) ||
        (item.token_code && item.token_code.toLowerCase().includes(q)) ||
        (item.mobile && item.mobile.toLowerCase().includes(q)) ||
        (item.company && item.company.toLowerCase().includes(q)) ||
        (item.purpose && item.purpose.toLowerCase().includes(q)) ||
        (item.address && item.address.toLowerCase().includes(q))
    );
  }, [selectedFilter, searchQuery, activeVisits, scheduledVisits, historyVisits, allVisitsCombined]);

  // ── Data Loading ─────────────────────────────────────────────
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tokenRes, visitRes, eventRes, partRes] = await Promise.all([
        api.getTokens().catch(() => ({ success: false, tokens: [] })),
        api.getVisits().catch(() => ({ success: false, activeVisits: [], scheduledVisits: [], historyVisits: [] })),
        api.getEvents().catch(() => ({ success: false, events: [] })),
        api.getParticipants().catch(() => ({ success: false, participants: [] })),
      ]);
      if (tokenRes?.success) setTokens(tokenRes.tokens || []);
      if (visitRes?.success) {
        setActiveVisits(visitRes.activeVisits || []);
        setScheduledVisits(visitRes.scheduledVisits || []);
        setHistoryVisits(visitRes.historyVisits || []);
      }
      if (eventRes?.success && Array.isArray(eventRes.events)) {
        setEvents(eventRes.events);
      }
      if (partRes?.success && Array.isArray(partRes.participants)) {
        setParticipants(partRes.participants);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Event Handlers ───────────────────────────────────────────
  const handleCreateEventSubmit = async (eventData) => {
    setCreatingEvent(true);
    try {
      const res = await api.createEvent(eventData);
      if (res?.success) {
        Alert.alert(
          'Event & Credentials Created',
          `Event: ${res.event.title}\nVenue: ${res.event.venue}\n\nCOORDINATOR LOGIN:\nLogin ID: ${res.event.login_id}\nPassword: ${res.event.password}\n\nThe user can now log in using these credentials under the "Events" tab on the Login Screen!`
        );
        setShowAddEventModal(false);
        loadData(true);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not create event');
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleDeleteEvent = (eventId, title) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteEvent(eventId);
              setEvents((prev) => prev.filter((e) => e.id !== eventId));
              Alert.alert('Deleted', `Event "${title}" has been removed.`);
            } catch (e) {
              Alert.alert('Error', 'Could not delete event');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
  };

  // ── Handlers ─────────────────────────────────────────────────
  const handleGenerateNewQR = useCallback(async () => {
    setGeneratingToken(true);
    try {
      const res = await api.generateToken();
      if (res.success && res.token) {
        setPreviewToken(res.token);
        await loadData(true);
      } else {
        Alert.alert('Error', res.message || 'Could not generate token');
      }
    } catch {
      Alert.alert('Connection Error', 'Failed to communicate with backend server');
    } finally {
      setGeneratingToken(false);
    }
  }, []);

  const handleCheckOut = useCallback((visit) => {
    Alert.alert(
      'Confirm Check-Out',
      `Check out visitor ${visit.full_name} with Token ${visit.token_code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check Out',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.checkOutVisitor(visit.token_code);
              if (res.success) {
                Alert.alert('Success', `Visitor ${visit.full_name} checked out successfully.`);
                setSelectedVisitorDetails((current) => (current?.id === visit.id ? null : current));
                loadData(true);
              } else {
                Alert.alert('Checkout Failed', res.message || 'Error checking out visitor');
              }
            } catch {
              Alert.alert('Error', 'Failed to check out visitor');
            }
          },
        },
      ]
    );
  }, []);

  const handleCheckInScheduled = useCallback(async (visit) => {
    try {
      const res = await api.checkInScheduledVisit(visit);
      if (res.success) {
        Alert.alert('Check-In Recorded', `Pass ${visit.token_code} checked in. ${visit.full_name} is now INSIDE campus.`);
        loadData(true);
      } else {
        Alert.alert('Check-In Failed', res.message || 'Could not check in scheduled pass');
      }
    } catch (err) {
      Alert.alert('Check-In Error', err.message || 'Failed to check in pass');
    }
  }, []);

  const handleIssueScheduledSubmit = useCallback(async (formData) => {
    if (!formData.full_name || !formData.mobile) {
      Alert.alert('Required Fields', 'Please enter visitor full name and mobile number.');
      return;
    }
    setIssuingLoading(true);
    try {
      const res = await api.checkInVisitor(formData);
      if (res.success) {
        setShowIssueTokenModal(false);
        await loadData(true);

        // Professional SMS / WhatsApp notification message
        const smsMessage = `Smart Campus Pass: Hello ${formData.full_name}, your pass has been pre-approved for ${formData.expected_date} (${formData.time_window}) at ${formData.gate}. Host: ${formData.address}.`;

        Alert.alert(
          'Pass Issued Successfully',
          `Pass pre-approved for ${formData.full_name}.\n\nDate: ${formData.expected_date}\nWindow: ${formData.time_window}\nGate: ${formData.gate}`,
          [
            {
              text: 'Send WhatsApp',
              onPress: () => {
                const waUrl = `whatsapp://send?phone=+91${formData.mobile}&text=${encodeURIComponent(smsMessage)}`;
                Linking.openURL(waUrl).catch(() => {
                  Linking.openURL(`https://wa.me/91${formData.mobile}?text=${encodeURIComponent(smsMessage)}`).catch(() => {
                    Alert.alert('Notice', 'Could not open WhatsApp on this device.');
                  });
                });
              },
            },
            {
              text: 'Send SMS',
              onPress: () => {
                Linking.openURL(`sms:${formData.mobile}?body=${encodeURIComponent(smsMessage)}`).catch(() => {
                  Alert.alert('Notice', 'Could not open SMS on this device.');
                });
              },
            },
            { text: 'Done', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Issue Failed', res.message || 'Could not issue scheduled token pass');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to submit scheduled token');
    } finally {
      setIssuingLoading(false);
    }
  }, []);

  const handleCancelToken = useCallback((visit) => {
    Alert.alert(
      'Cancel Scheduled Token',
      `Cancel pass for ${visit.full_name} and return Token ${visit.token_code} to available fleet?`,
      [
        { text: 'Keep Pass', style: 'cancel' },
        {
          text: 'Yes, Cancel Token',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.cancelVisit(visit.token_code, visit.id);
              if (res.success) {
                Alert.alert('Cancelled', `Token ${visit.token_code} returned to fleet.`);
                loadData(true);
              } else {
                Alert.alert('Failed', res.message || 'Could not cancel token pass');
              }
            } catch {
              Alert.alert('Error', 'Failed to cancel token pass');
            }
          },
        },
      ]
    );
  }, []);

  const handleRescheduleConfirm = useCallback(async (visit, newDate, newTime) => {
    setReschedulingLoading(true);
    try {
      const res = await api.rescheduleVisit(visit.token_code, newDate, newTime, visit.id);
      if (res.success) {
        Alert.alert('Rescheduled', `Token ${visit.token_code} rescheduled for ${newDate} (${newTime}).`);
        setRescheduleTarget(null);
        loadData(true);
      } else {
        Alert.alert('Failed', res.message || 'Could not reschedule visit');
      }
    } catch {
      Alert.alert('Error', 'Failed to reschedule visit');
    } finally {
      setReschedulingLoading(false);
    }
  }, []);

  const handleCallVisitor = useCallback((mobile) => {
    if (!mobile) return;
    Linking.openURL(`tel:${mobile}`).catch(() =>
      Alert.alert('Unavailable', `Could not initiate phone call to ${mobile}`)
    );
  }, []);

  const handleSmsVisitor = useCallback((mobile) => {
    if (!mobile) return;
    Linking.openURL(`sms:${mobile}`).catch(() =>
      Alert.alert('Unavailable', `Could not send SMS to ${mobile}`)
    );
  }, []);

  // ── Tab Renders ───────────────────────────────────────────────
  const renderDashboardTab = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C5CE7']} tintColor="#6C5CE7" />
      }
    >
      {/* Featured Vibrant Purple Hero Card (Reference UI Screen 1) */}
      <View style={styles.heroCard}>
        <View style={styles.heroDecorCircle1} />
        <View style={styles.heroDecorCircle2} />

        <View style={styles.heroTopRow}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroShieldIconBox}>
              <TotalPassIcon size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.heroCategoryTitle}>Campus Pass Control</Text>
              <Text style={styles.heroCategorySub}>Executive Command • Real-time Sync</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.heroArrowBtn}
            activeOpacity={0.8}
            onPress={() => setShowIssueTokenModal(true)}
          >
            <ArrowUpRightIcon size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroContentRow}>
          <View style={styles.heroInfoCol}>
            <Text style={styles.heroInfoLabel}>Active Campus Passes</Text>
            <Text style={styles.heroInfoValue}>{activeVisits.length} Visitors Inside</Text>
            <Text style={styles.heroInfoSub}>
              {availableCount} Badges Available • {totalTodayCount} Total Today
            </Text>
          </View>

          <TouchableOpacity
            style={styles.heroActionBtn}
            activeOpacity={0.85}
            onPress={() => setShowIssueTokenModal(true)}
          >
            <Text style={styles.heroActionBtnText}>+ Issue Pass</Text>
            <ArrowUpRightIcon size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Strip Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Visitor Categories</Text>
      </View>

      <View style={styles.categoryScrollRow}>
        {[
          { key: 'VIP', label: 'VIP Pass', Icon: CrownIcon, bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
          { key: 'CONTRACTORS', label: 'Contractor', Icon: WrenchIcon, bg: '#FFE8D6', text: '#D97706', border: '#FED7AA' },
          { key: 'GENERAL', label: 'General', Icon: BuildingIcon, bg: '#F2EBFE', text: '#7C3AED', border: '#DDD6FE' },
        ].map(({ key, label, Icon, bg, text, border }) => {
          const isSelected = selectedFilter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.categoryCard,
                { backgroundColor: isSelected ? text : bg, borderColor: border },
              ]}
              onPress={() => setSelectedFilter(isSelected ? 'ALL' : key)}
              activeOpacity={0.8}
            >
              <View style={[styles.categoryIconBox, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#FFFFFF' }]}>
                <Icon size={20} color={isSelected ? '#FFFFFF' : text} />
              </View>
              <Text style={[styles.categoryLabel, { color: isSelected ? '#FFFFFF' : text }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Actions / Recent Visitors Header with Filter Logo (Like in Security Portal) */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Recent Visitors</Text>
          <Text style={styles.sectionSubtitle}>Today</Text>
        </View>

        <View style={styles.sectionHeaderActions}>
          <TouchableOpacity
            style={[styles.filterIconButton, selectedFilter !== 'ALL' && styles.filterIconButtonActive]}
            activeOpacity={0.8}
            onPress={() => setShowFilterModal(true)}
          >
            <FilterSlidersIcon
              size={18}
              color={selectedFilter !== 'ALL' ? '#FFFFFF' : '#6C5CE7'}
            />
            {selectedFilter !== 'ALL' && <View style={styles.filterActiveDot} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => { setSelectedFilter('ALL'); setSearchQuery(''); }}>
            <Text style={styles.sectionViewAll}>See All ({totalTodayCount})</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Active Filter Indicator Bar */}
      {selectedFilter !== 'ALL' && (
        <View style={styles.activeFilterBar}>
          <Text style={styles.activeFilterLabel}>
            Filtered: <Text style={styles.activeFilterName}>{selectedFilterName}</Text>
          </Text>
          <TouchableOpacity onPress={() => setSelectedFilter('ALL')} activeOpacity={0.7}>
            <Text style={styles.clearFilterText}>Clear Filter ✕</Text>
          </TouchableOpacity>
        </View>
      )}


      {filteredVisits.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No visitors found</Text>
          <Text style={styles.emptyStateSub}>
            {searchQuery ? `No results for "${searchQuery}"` : 'No visitor records in this category.'}
          </Text>
        </View>
      ) : (
        filteredVisits.slice(0, 10).map((item, index) => (
          <VisitorCard
            key={item.id || item.token_code || index}
            item={item}
            index={index}
            onCheckInScheduled={handleCheckInScheduled}
            onCheckOut={handleCheckOut}
            onReschedule={setRescheduleTarget}
            onCancelToken={handleCancelToken}
            onDetails={setSelectedVisitorDetails}
            onCall={handleCallVisitor}
          />
        ))
      )}
    </ScrollView>
  );

  // ── Events Tab: Campus Events & Coordinator Handling ────────
  const renderEventsTab = () => {
    const q = eventSearchQuery.trim().toLowerCase();
    const filteredEvents = events.filter((e) => {
      if (!q) return true;
      return (
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.venue && e.venue.toLowerCase().includes(q)) ||
        (e.coordinator_name && e.coordinator_name.toLowerCase().includes(q)) ||
        (e.login_id && e.login_id.toLowerCase().includes(q))
      );
    });

    return (
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C5CE7']} tintColor="#6C5CE7" />
        }
      >
        {/* Header with Title and "Add Event" button */}
        <View style={eventStyles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={eventStyles.title}>Campus Events</Text>
            <Text style={eventStyles.sub}>Event handling & coordinator credentials</Text>
          </View>
          <TouchableOpacity
            style={eventStyles.createBtn}
            onPress={() => setShowAddEventModal(true)}
            activeOpacity={0.85}
          >
            <PlusIcon size={16} color="#FFFFFF" />
            <Text style={eventStyles.createBtnText}>Add Event</Text>
          </TouchableOpacity>
        </View>

        {/* Metric summary chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={eventStyles.metricsRow}>
          <View style={[eventStyles.metricChip, { backgroundColor: '#F4F0FF' }]}>
            <Text style={[eventStyles.metricCount, { color: '#6C5CE7' }]}>{events.length}</Text>
            <Text style={[eventStyles.metricLabel, { color: '#6C5CE7' }]}>Total Events</Text>
          </View>
          <View style={[eventStyles.metricChip, { backgroundColor: '#DCFCE7' }]}>
            <Text style={[eventStyles.metricCount, { color: '#16A34A' }]}>
              {events.filter((e) => e.status === 'ACTIVE').length}
            </Text>
            <Text style={[eventStyles.metricLabel, { color: '#16A34A' }]}>Active Events</Text>
          </View>
          <View style={[eventStyles.metricChip, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[eventStyles.metricCount, { color: '#D97706' }]}>{events.length}</Text>
            <Text style={[eventStyles.metricLabel, { color: '#D97706' }]}>Coordinators</Text>
          </View>
        </ScrollView>

        {/* Search input for events */}
        <View style={eventStyles.searchBar}>
          <SearchIcon size={18} color="#64748B" />
          <TextInput
            style={eventStyles.searchInput}
            value={eventSearchQuery}
            onChangeText={setEventSearchQuery}
            placeholder="Search events, venues, or login IDs..."
            placeholderTextColor="#94A3B8"
          />
          {eventSearchQuery ? (
            <TouchableOpacity onPress={() => setEventSearchQuery('')}>
              <CloseIcon size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Event Cards List */}
        {filteredEvents.length === 0 ? (
          <View style={eventStyles.emptyBox}>
            <TicketIcon size={40} color="#94A3B8" />
            <Text style={eventStyles.emptyTitle}>No Events Found</Text>
            <Text style={eventStyles.emptySub}>
              {eventSearchQuery
                ? `No event matches "${eventSearchQuery}".`
                : 'Tap "Add Event" above to create an event and coordinator login credentials.'}
            </Text>
          </View>
        ) : (
          filteredEvents.map((item) => {
            const isPasswordShown = !!revealedPasswords[item.id];
            return (
              <View key={item.id} style={eventStyles.card}>
                {/* Top Row: Title + Status + Delete */}
                <View style={eventStyles.cardTopRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={eventStyles.cardTitle}>{item.title}</Text>
                    <Text style={eventStyles.cardVenue}>{item.venue || 'Campus Hall'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={eventStyles.activeBadge}>
                      <Text style={eventStyles.activeBadgeText}>{item.status || 'ACTIVE'}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteEvent(item.id, item.title)}
                      style={eventStyles.deleteBtn}
                    >
                      <Text style={eventStyles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {item.description ? (
                  <Text style={eventStyles.cardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {/* Details badge row */}
                <View style={eventStyles.detailsRow}>
                  <View style={eventStyles.detailPill}>
                    <Text style={eventStyles.detailPillText}>Date: {item.date || 'Upcoming'}</Text>
                  </View>
                  <View style={eventStyles.detailPill}>
                    <Text style={eventStyles.detailPillText}>Time: {item.time || 'All Day'}</Text>
                  </View>
                  <View style={eventStyles.detailPill}>
                    <Text style={eventStyles.detailPillText}>{item.expected_attendees || '100'} attendees</Text>
                  </View>
                </View>

                {/* Coordinator Login Credentials Box */}
                <View style={eventStyles.credBox}>
                  <View style={eventStyles.credHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <KeyIcon size={14} color="#6C5CE7" />
                      <Text style={eventStyles.credHeading}>COORDINATOR LOGIN CREDENTIALS</Text>
                    </View>
                    <Text style={eventStyles.credCoordinatorName}>
                      {item.coordinator_name || 'Coordinator'}
                    </Text>
                  </View>

                  <View style={eventStyles.credFieldRow}>
                    <Text style={eventStyles.credFieldLabel}>Login ID:</Text>
                    <Text style={eventStyles.credFieldValue}>{item.login_id}</Text>
                  </View>

                  <View style={eventStyles.credFieldRow}>
                    <Text style={eventStyles.credFieldLabel}>Password:</Text>
                    <Text style={eventStyles.credFieldValue}>
                      {isPasswordShown ? item.password : '••••••••'}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setRevealedPasswords((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      style={eventStyles.togglePwBtn}
                    >
                      <Text style={eventStyles.togglePwText}>
                        {isPasswordShown ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Action buttons */}
                <View style={eventStyles.cardActionsRow}>
                  <TouchableOpacity
                    style={eventStyles.previewQrBtn}
                    onPress={() =>
                      setPreviewToken({
                        token_code: item.event_qr_code || `EVT-${item.id}`,
                        status: 'AVAILABLE',
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <QRIcon size={16} color="#6C5CE7" />
                    <Text style={eventStyles.previewQrBtnText}>Preview QR Badge</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={eventStyles.shareCredBtn}
                    onPress={() => {
                      Alert.alert(
                        'Coordinator Login Access',
                        `Event: ${item.title}\nRole: Event Coordinator\nLogin ID: ${item.login_id}\nPassword: ${item.password}\n\nThe user can log in under the "Events" tab on the Login Screen!`
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={eventStyles.shareCredBtnText}>Share Login</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  const renderTokensTab = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.tabHeaderRow}>
        <View>
          <Text style={styles.tabHeaderTitle}>QR Token Inventory</Text>
          <Text style={styles.tabHeaderSub}>
            {availableCount} Available • {inUseTokens.length} In-Use • {tokens.length} Total
          </Text>
        </View>
        <TouchableOpacity style={styles.tabHeaderActionBtn} onPress={handleGenerateNewQR} disabled={generatingToken}>
          <Text style={styles.tabHeaderActionBtnText}>+ New Token</Text>
        </TouchableOpacity>
      </View>

      {tokens.map((token) => {
        const isAvail = token.status === 'AVAILABLE';
        return (
          <TouchableOpacity
            key={token.id || token.token_code}
            style={styles.tokenListItem}
            activeOpacity={0.85}
            onPress={() => setPreviewToken(token)}
          >
            <View style={styles.tokenListLeft}>
              <View style={[styles.tokenListQrIconBox, isAvail ? styles.qrBoxAvail : styles.qrBoxInUse]}>
                <QRIcon size={22} color={isAvail ? '#2563eb' : '#f59e0b'} />
              </View>
              <View style={styles.tokenListInfo}>
                <Text style={styles.tokenListCode}>{token.token_code}</Text>
                <Text style={styles.tokenListSub}>
                  {isAvail ? 'Ready for assignment' : 'Assigned to active visitor'}
                </Text>
              </View>
            </View>
            <View style={[styles.statusPill, isAvail ? styles.statusPillInside : styles.statusPillAmber]}>
              <Text style={[styles.statusPillText, isAvail ? styles.statusPillTextInside : styles.statusPillTextAmber]}>
                {token.status}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderAnalyticsTab = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.tabHeaderTitle}>Campus Traffic Analytics</Text>
      <Text style={styles.tabHeaderSub}>Real-time occupancy and visitor patterns</Text>

      <View style={styles.analyticsStatsGrid}>
        {[
          { number: activeVisits.length, label: 'Current Occupancy' },
          { number: totalTodayCount, label: 'Total Passes Today' },
          { number: '42m', label: 'Avg Visit Duration' },
          { number: '11:30 AM', label: 'Peak Arrival Hour' },
        ].map(({ number, label }) => (
          <View key={label} style={styles.analyticsStatBox}>
            <Text style={styles.analyticsStatNumber}>{number}</Text>
            <Text style={styles.analyticsStatLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.analyticsSectionCard}>
        <Text style={styles.analyticsSectionCardTitle}>Token Fleet Health</Text>
        <View style={styles.capacityBarLarge}>
          <View style={[styles.capacityFillInUse, { flex: Math.max(1, inUseTokens.length) }]} />
          <View style={[styles.capacityFillAvail, { flex: Math.max(1, availableTokens.length) }]} />
        </View>
        <View style={styles.capacityLegendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.legendText}>In-Use ({inUseTokens.length})</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
            <Text style={styles.legendText}>Available ({availableTokens.length})</Text>
          </View>
        </View>
      </View>

      <View style={styles.analyticsSectionCard}>
        <Text style={styles.analyticsSectionCardTitle}>Visit Categories Breakdown</Text>
        {[
          { name: 'Admissions & Enquiries', pct: '45%', color: '#2563eb' },
          { name: 'Campus Tours & Visits', pct: '30%', color: '#8b5cf6' },
          { name: 'Deliveries & Contractors', pct: '25%', color: '#10b981' },
        ].map(({ name, pct, color }) => (
          <View key={name}>
            <View style={styles.categoryRowItem}>
              <Text style={styles.categoryName}>{name}</Text>
              <Text style={styles.categoryPercent}>{pct}</Text>
            </View>
            <View style={styles.categoryBar}>
              <View style={[styles.categoryBarFill, { width: pct, backgroundColor: color }]} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderProfileTab = () => (
    <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
      <View style={styles.profileHeroCard}>
        <View style={styles.profileAvatarLarge}>
          <UserTabIcon size={36} color="#ffffff" />
        </View>
        <Text style={styles.profileName}>Campus Administrator</Text>
        <Text style={styles.profileRole}>Super Admin • Security Level 1</Text>
        <View style={styles.profileStatusBadge}>
          <View style={styles.statusDotInside} />
          <Text style={styles.profileStatusText}>System Live & Syncing</Text>
        </View>
      </View>

      <View style={styles.profileDetailsCard}>
        <Text style={styles.profileSectionTitle}>System Architecture</Text>
        {[
          { key: 'Database Provider', val: 'Supabase PostgreSQL Cloud' },
          { key: 'Architecture', val: 'Serverless Direct Client' },
          { key: 'App Engine', val: 'React Native Bare CLI' },
          { key: 'QR Standard', val: 'Vector SVG (FastScan)' },
        ].map(({ key, val }) => (
          <View key={key} style={styles.profileItemRow}>
            <Text style={styles.profileItemKey}>{key}</Text>
            <Text style={styles.profileItemVal} numberOfLines={1}>{val}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.refreshSyncBtn}
        onPress={() => {
          loadData(false);
          Alert.alert('Database Refreshed', 'Successfully fetched latest state from Supabase.');
        }}
      >
        <Text style={styles.refreshSyncBtnText}>↻ Force Supabase Sync</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutFullBtn}
        onPress={() => {
          Alert.alert('Sign Out', 'Are you sure you want to log out of Admin Portal?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: onLogout },
          ]);
        }}
      >
        <LogoutIcon size={18} color="#ef4444" />
        <Text style={styles.logoutFullBtnText}>Sign Out from Portal</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Main Render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F8FC" />

      {/* Top Header (Matching Screen 1 of Reference) */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeftCol}>
          <TouchableOpacity
            style={styles.profileAvatarBox}
            onPress={() => setShowProfileModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.profileAvatarText}>AD</Text>
          </TouchableOpacity>
          <View style={styles.greetingCol}>
            <Text style={styles.greetingTitle}>Hello, Administrator!</Text>
            <Text style={styles.greetingSub}>Campus Visitor Portal • Super Admin</Text>
          </View>
        </View>

        <View style={styles.headerRightCol}>
          <TouchableOpacity
            style={adminHeaderStyles.historyBtn}
            onPress={() => setShowHistoryModal(true)}
            activeOpacity={0.8}
          >
            <HistoryIcon size={17} color="#6C5CE7" />
            <Text style={adminHeaderStyles.historyBtnText}>History</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Content */}
      <View style={styles.screenContainer}>
        {activeNavTab === 'dashboard' && renderDashboardTab()}
        {activeNavTab === 'events' && renderEventsTab()}
        {activeNavTab === 'tokens' && renderTokensTab()}
        {activeNavTab === 'analytics' && renderAnalyticsTab()}
        {activeNavTab === 'profile' && renderProfileTab()}
      </View>

      {/* ── Modern Curved Bottom Navigation Bar with Center Elevated FAB (Reference UI) ── */}
      <View style={styles.bottomNavWrapper}>
        <View style={styles.bottomNavRow}>
          {/* Tab 1: Home / Dashboard */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => {
              setActiveNavTab('dashboard');
              setSearchQuery('');
              setSelectedFilter('ALL');
            }}
            activeOpacity={0.8}
          >
            <HomeTabIcon size={22} color={activeNavTab === 'dashboard' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[styles.navTabLabel, activeNavTab === 'dashboard' && styles.navTabLabelActive]}>Home</Text>
            {activeNavTab === 'dashboard' && <View style={styles.navActiveDot} />}
          </TouchableOpacity>

          {/* Tab 2: Events */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => {
              setActiveNavTab('events');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            <EventsTabIcon size={22} color={activeNavTab === 'events' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[styles.navTabLabel, activeNavTab === 'events' && styles.navTabLabelActive]}>Events</Text>
            {activeNavTab === 'events' && <View style={styles.navActiveDot} />}
          </TouchableOpacity>

          {/* Center Elevated FAB: Issue Pass / Token */}
          <View style={styles.centerFabContainer}>
            <TouchableOpacity
              style={styles.centerFabButton}
              activeOpacity={0.85}
              onPress={() => setShowIssueTokenModal(true)}
            >
              <PlusIcon size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Tab 3: Tokens */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => {
              setActiveNavTab('tokens');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            <QrTabIcon size={22} color={activeNavTab === 'tokens' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[styles.navTabLabel, activeNavTab === 'tokens' && styles.navTabLabelActive]}>Tokens</Text>
            {activeNavTab === 'tokens' && <View style={styles.navActiveDot} />}
          </TouchableOpacity>

          {/* Tab 4: Analytics */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => {
              setActiveNavTab('analytics');
              setSearchQuery('');
            }}
            activeOpacity={0.8}
          >
            <BarChartIcon size={22} color={activeNavTab === 'analytics' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[styles.navTabLabel, activeNavTab === 'analytics' && styles.navTabLabelActive]}>Analytics</Text>
            {activeNavTab === 'analytics' && <View style={styles.navActiveDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Modals ────────────────────────────────────────────── */}
      <VisitorDetailsModal
        visitor={selectedVisitorDetails}
        onClose={() => setSelectedVisitorDetails(null)}
        onCall={handleCallVisitor}
        onSms={handleSmsVisitor}
        onCheckOut={handleCheckOut}
      />

      <QRPreviewModal
        token={previewToken}
        onClose={() => setPreviewToken(null)}
      />

      <AddEventModal
        visible={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        onSubmit={handleCreateEventSubmit}
        loading={creatingEvent}
      />

      <IssueScheduledTokenModal
        visible={showIssueTokenModal}
        onClose={() => setShowIssueTokenModal(false)}
        availableTokens={availableTokens}
        onSubmit={handleIssueScheduledSubmit}
        isLoading={issuingLoading}
      />

      <RescheduleModal
        visible={!!rescheduleTarget}
        visit={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={handleRescheduleConfirm}
        isLoading={reschedulingLoading}
      />

      <NotificationsModal
        visible={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        activeVisits={activeVisits}
        scheduledVisits={scheduledVisits}
        historyVisits={historyVisits}
        availableCount={availableCount}
        totalTokensCount={totalTokensCount}
      />

      <VisitorHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        allVisits={allVisitsCombined}
        participants={participants}
        onSelectVisitor={(v) => {
          setSelectedVisitorDetails(v);
        }}
      />

      <ProfileMenuModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onNavigate={setActiveNavTab}
        onRefresh={() => loadData(false)}
        onLogout={onLogout}
      />

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        selectedFilter={selectedFilter === 'ACTIVE' ? 'INSIDE' : selectedFilter === 'SCHEDULED' ? 'ISSUED' : selectedFilter === 'EXITED' ? 'EXITED' : selectedFilter}
        onSelectFilter={setSelectedFilter}
        counts={{
          all: allVisitsCombined.length,
          issued: scheduledVisits.length,
          inside: activeVisits.length,
          exited: historyVisits.length,
          vip: filterCounts.vip,
        }}
      />
    </SafeAreaView>
  );
}

const adminHeaderStyles = StyleSheet.create({
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  historyBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#6C5CE7',
    letterSpacing: 0.2,
  },
});

// ── Unified Search + Filter Block Styles ─────────────────────────
const searchFilterStyles = {
  block: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 0,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 4,
  },
  filterBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBtnActive: {
    backgroundColor: '#F4F0FF',
    borderColor: '#E5DDFF',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6C5CE7',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#F4F0FF',
    borderColor: '#6C5CE7',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  chipTextActive: {
    color: '#6C5CE7',
  },
  chipCount: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    minWidth: 18,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  chipCountActive: {
    backgroundColor: '#E5DDFF',
  },
  chipCountText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  chipCountTextActive: {
    color: '#6C5CE7',
  },
};

const navStyles = {
  dashManifestBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dashManifestBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dashManifestBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  dashManifestBannerBadge: {
    backgroundColor: '#F4F0FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5DDFF',
  },
  dashManifestBannerBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6C5CE7',
  },
  dashManifestBannerBtn: {
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dashManifestBannerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  manifestTabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  manifestTabTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  manifestTabSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  manifestTabCountBox: {
    backgroundColor: '#F4F0FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5DDFF',
  },
  manifestTabCountNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6C5CE7',
  },
  manifestTabCountLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6C5CE7',
    textTransform: 'uppercase',
  },
  manifestSummaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  manifestSummaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  manifestSummaryCount: {
    fontSize: 13,
    fontWeight: '800',
  },
  manifestSummaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  navWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 12,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 99,
  },
  navContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 32,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navItemAction: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActionCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -24,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  navIconWrap: {
    width: 32,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  navIconWrapActive: {
    backgroundColor: '#F4F0FF',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  navLabelActive: {
    color: '#6C5CE7',
    fontWeight: '800',
  },
};

const eventStyles = {
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
  },
  sub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  metricChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    minWidth: 95,
  },
  metricCount: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    padding: 0,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardVenue: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  deleteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  deleteText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  cardDesc: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  detailPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  credBox: {
    backgroundColor: '#F7F6FE',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E6E1FA',
    marginBottom: 12,
  },
  credHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE9FE',
  },
  credHeading: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#6C5CE7',
    letterSpacing: 0.5,
  },
  credCoordinatorName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  credFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  credFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    width: 65,
  },
  credFieldValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  togglePwBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#EDE9FE',
    borderRadius: 4,
    marginLeft: 6,
  },
  togglePwText: {
    fontSize: 11,
    color: '#6C5CE7',
    fontWeight: '700',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  previewQrBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F4F0FF',
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5DDFF',
  },
  previewQrBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  shareCredBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 9,
    borderRadius: 8,
  },
  shareCredBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
};

