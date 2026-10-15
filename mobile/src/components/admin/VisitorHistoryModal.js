import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import {
  CloseIcon,
  HistoryIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CrownIcon,
  BuildingIcon,
  WrenchIcon,
  PhoneIcon,
  DoorEnterIcon,
  ClockIcon,
  SearchIcon,
  TicketIcon,
  CarIcon,
} from '../AdminIcons';
import { formatDisplayTime } from './VisitorCard';
import CalendarPicker from './CalendarPicker';

/**
 * Helper to convert any Date object to "YYYY-MM-DD"
 */
function toDateKey(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date object to "Tue, 13 Oct 2026"
 */
function formatHumanDate(d) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Extract YYYY-MM-DD from any visitor or participant record
 */
function getVisitorDateKey(item) {
  if (!item) return '';

  // 1. check_in timestamp
  if (item.check_in) {
    try {
      const d = new Date(item.check_in);
      if (!isNaN(d.getTime())) return toDateKey(d);
    } catch (_) {}
  }

  // 2. check_in_time (event participants)
  if (item.check_in_time) {
    try {
      const d = new Date(item.check_in_time);
      if (!isNaN(d.getTime())) return toDateKey(d);
    } catch (_) {}
  }

  // 3. check_out timestamp
  if (item.check_out) {
    try {
      const d = new Date(item.check_out);
      if (!isNaN(d.getTime())) return toDateKey(d);
    } catch (_) {}
  }

  // 4. expected_date
  if (item.expected_date) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(item.expected_date)) {
      return item.expected_date;
    }
    if (item.expected_date.toLowerCase() === 'today') {
      return toDateKey(new Date());
    }
    try {
      const d = new Date(item.expected_date);
      if (!isNaN(d.getTime())) return toDateKey(d);
    } catch (_) {}
  }

  // 5. created_at
  if (item.created_at) {
    try {
      const d = new Date(item.created_at);
      if (!isNaN(d.getTime())) return toDateKey(d);
    } catch (_) {}
  }

  // 6. expected_duration with '•'
  if (item.expected_duration && item.expected_duration.includes('•')) {
    const raw = item.expected_duration.split('•')[0].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    if (raw.toLowerCase() === 'today') return toDateKey(new Date());
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) return toDateKey(d);
    } catch (_) {}
  }

  // Default to today
  return toDateKey(new Date());
}

export default function VisitorHistoryModal({
  visible,
  onClose,
  allVisits = [],
  participants = [],
  onSelectVisitor,
}) {
  const todayDate = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toDateKey(todayDate), [todayDate]);

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);

  // Sync to today on open
  useEffect(() => {
    if (visible) {
      setSelectedDate(new Date());
      setSelectedTypeFilter('ALL');
      setSearchQuery('');
      setShowCalendarPicker(false);
    }
  }, [visible]);

  const selectedKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
  const isToday = selectedKey === todayKey;

  // Day navigation handlers
  const handlePrevDay = () => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  };

  const handleTodayJump = () => {
    setSelectedDate(new Date());
    setShowCalendarPicker(false);
  };

  // Combine standard visits + event participants into a unified visitor list
  const combinedAllVisitors = useMemo(() => {
    const list = [...allVisits];

    // Map participants into uniform visitor objects
    const mappedParticipants = participants.map((p) => ({
      id: p.id || `part-${p.participant_no}`,
      full_name: p.full_name || 'Attendee',
      mobile: p.mobile || '',
      token_code: p.participant_code || `EVT-${p.participant_no}`,
      category: p.category || 'Event Attendee',
      gate: p.gate || 'Gate 1 Entrance',
      status: p.status === 'CHECKED_IN' ? 'ACTIVE' : p.status || 'ACTIVE',
      check_in: p.check_in_time || p.created_at || new Date().toISOString(),
      company: p.organization || p.event_title || 'Campus Event',
      purpose: `Event Attendee: ${p.event_title || 'Campus Event'}`,
      is_event_participant: true,
      participant_no: p.participant_no,
    }));

    return [...list, ...mappedParticipants];
  }, [allVisits, participants]);

  // Filter visitors belonging to the selected date
  const dateVisitors = useMemo(() => {
    return combinedAllVisitors.filter((v) => {
      const vKey = getVisitorDateKey(v);

      // Matches exact selected date
      if (vKey === selectedKey) return true;

      // If viewing today, also include currently active visitors inside campus
      if (isToday && v.status === 'ACTIVE') return true;

      return false;
    });
  }, [combinedAllVisitors, selectedKey, isToday]);

  // Count breakdowns for the selected date
  const counts = useMemo(() => {
    return {
      all: dateVisitors.length,
      active: dateVisitors.filter((v) => v.status === 'ACTIVE').length,
      completed: dateVisitors.filter((v) => v.status === 'COMPLETED').length,
      scheduled: dateVisitors.filter((v) => v.status === 'SCHEDULED').length,
      vip: dateVisitors.filter((v) => v.is_vip || v.category === 'VIP').length,
      contractors: dateVisitors.filter((v) => v.category === 'Contractor' || v.category === 'Utility').length,
      events: dateVisitors.filter((v) => v.is_event_participant || (v.token_code && v.token_code.startsWith('EVT'))).length,
    };
  }, [dateVisitors]);

  // Apply category and search filter
  const filteredVisitors = useMemo(() => {
    let list = dateVisitors;

    if (selectedTypeFilter === 'ACTIVE') {
      list = list.filter((v) => v.status === 'ACTIVE');
    } else if (selectedTypeFilter === 'COMPLETED') {
      list = list.filter((v) => v.status === 'COMPLETED');
    } else if (selectedTypeFilter === 'SCHEDULED') {
      list = list.filter((v) => v.status === 'SCHEDULED');
    } else if (selectedTypeFilter === 'VIP') {
      list = list.filter((v) => v.is_vip || v.category === 'VIP');
    } else if (selectedTypeFilter === 'CONTRACTORS') {
      list = list.filter((v) => v.category === 'Contractor' || v.category === 'Utility');
    } else if (selectedTypeFilter === 'EVENTS') {
      list = list.filter((v) => v.is_event_participant || (v.token_code && v.token_code.startsWith('EVT')));
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (v) =>
        (v.full_name && v.full_name.toLowerCase().includes(q)) ||
        (v.token_code && v.token_code.toLowerCase().includes(q)) ||
        (v.mobile && v.mobile.toLowerCase().includes(q)) ||
        (v.company && v.company.toLowerCase().includes(q)) ||
        (v.purpose && v.purpose.toLowerCase().includes(q))
    );
  }, [dateVisitors, selectedTypeFilter, searchQuery]);

  const handleCall = (mobile) => {
    if (!mobile) return;
    Linking.openURL(`tel:${mobile}`).catch(() => {
      Alert.alert('Notice', `Could not initiate call to ${mobile}`);
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {/* Top Drag Indicator */}
          <View style={styles.dragBar} />

          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.historyIconBadge}>
                <HistoryIcon size={20} color="#0B2A5B" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Visitor History Log</Text>
                <Text style={styles.headerSubtitle}>
                  {isToday ? 'Today’s Attendance Archive' : 'Historical Date Records'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <CloseIcon size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Interactive Date Navigation Bar */}
          <View style={styles.dateControlCard}>
            <View style={styles.dateNavRow}>
              <TouchableOpacity
                onPress={handlePrevDay}
                style={styles.dayArrowBtn}
                activeOpacity={0.7}
              >
                <ChevronLeftIcon size={18} color="#475569" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowCalendarPicker((prev) => !prev)}
                style={styles.dateCenterBtn}
                activeOpacity={0.8}
              >
                <CalendarIcon size={16} color="#0B2A5B" />
                <Text style={styles.dateCenterText}>
                  {formatHumanDate(selectedDate)}
                </Text>
                {isToday && (
                  <View style={styles.todayPill}>
                    <Text style={styles.todayPillText}>TODAY</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNextDay}
                style={styles.dayArrowBtn}
                activeOpacity={0.7}
              >
                <ChevronRightIcon size={18} color="#475569" />
              </TouchableOpacity>
            </View>

            {/* Quick date jumps: Today, Yesterday, Pick Date */}
            <View style={styles.presetButtonsRow}>
              <TouchableOpacity
                style={[styles.presetBtn, isToday && styles.presetBtnActive]}
                onPress={handleTodayJump}
                activeOpacity={0.75}
              >
                <Text style={[styles.presetBtnText, isToday && styles.presetBtnTextActive]}>
                  Present Date (Today)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetBtn}
                onPress={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  setSelectedDate(y);
                  setShowCalendarPicker(false);
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.presetBtnText}>Yesterday</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.presetBtn, showCalendarPicker && styles.presetBtnActive]}
                onPress={() => setShowCalendarPicker((prev) => !prev)}
                activeOpacity={0.75}
              >
                <Text style={[styles.presetBtnText, showCalendarPicker && styles.presetBtnTextActive]}>
                  Calendar Picker
                </Text>
              </TouchableOpacity>
            </View>

            {/* Collapsible Calendar Picker */}
            {showCalendarPicker && (
              <View style={styles.calendarPickerContainer}>
                <CalendarPicker
                  value={selectedDate.toISOString()}
                  onChange={(dateStr) => {
                    const parsed = new Date(dateStr.replace(/\([^)]*\)/, '').trim());
                    if (!isNaN(parsed.getTime())) {
                      setSelectedDate(parsed);
                    }
                    setShowCalendarPicker(false);
                  }}
                  label="Select History Date"
                  defaultExpanded={true}
                />
              </View>
            )}
          </View>

          {/* Metric Counter Strip for Selected Date */}
          <View style={styles.metricsStrip}>
            <View style={[styles.metricBox, { backgroundColor: '#F1F5FA' }]}>
              <Text style={[styles.metricNum, { color: '#0B2A5B' }]}>{counts.all}</Text>
              <Text style={styles.metricLabel}>Total Visitors</Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: '#DCFCE7' }]}>
              <Text style={[styles.metricNum, { color: '#16A34A' }]}>{counts.active}</Text>
              <Text style={styles.metricLabel}>Inside Campus</Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: '#F1F5F9' }]}>
              <Text style={[styles.metricNum, { color: '#475569' }]}>{counts.completed}</Text>
              <Text style={styles.metricLabel}>Completed</Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.metricNum, { color: '#D97706' }]}>{counts.scheduled}</Text>
              <Text style={styles.metricLabel}>Scheduled</Text>
            </View>
          </View>

          {/* Quick Search Input */}
          <View style={styles.searchBar}>
            <SearchIcon size={16} color="#7B8CA3" />
            <TextInput
              style={styles.searchInput}
              placeholder="Filter by name, badge, or phone..."
              placeholderTextColor="#7B8CA3"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <CloseIcon size={15} color="#7B8CA3" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Horizontal Category Filter Chips */}
          <View style={styles.chipsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
              {[
                { key: 'ALL', label: 'All Kinds', count: counts.all },
                { key: 'ACTIVE', label: 'Active Inside', count: counts.active },
                { key: 'COMPLETED', label: 'Checked Out', count: counts.completed },
                { key: 'SCHEDULED', label: 'Scheduled', count: counts.scheduled },
                { key: 'VIP', label: 'VIP Pass', count: counts.vip },
                { key: 'CONTRACTORS', label: 'Contractor', count: counts.contractors },
                { key: 'EVENTS', label: 'Event Attendees', count: counts.events },
              ].map(({ key, label, count }) => {
                const isActive = selectedTypeFilter === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setSelectedTypeFilter(key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {label}
                    </Text>
                    <View style={[styles.chipBadge, isActive && styles.chipBadgeActive]}>
                      <Text style={[styles.chipBadgeText, isActive && styles.chipBadgeTextActive]}>
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Visitor Records List */}
          <ScrollView
            style={styles.visitorList}
            contentContainerStyle={styles.visitorListContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredVisitors.length === 0 ? (
              <View style={styles.emptyStateBox}>
                <DoorEnterIcon size={42} color="#CBD5E1" />
                <Text style={styles.emptyStateTitle}>No Visitor Records Found</Text>
                <Text style={styles.emptyStateSub}>
                  {searchQuery
                    ? `No visitors match "${searchQuery}" on this date.`
                    : `No visitors were recorded on ${formatHumanDate(selectedDate)}.`}
                </Text>
                {!isToday && (
                  <TouchableOpacity
                    style={styles.jumpTodayBtn}
                    onPress={handleTodayJump}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.jumpTodayBtnText}>View Present Date (Today)</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredVisitors.map((item, index) => {
                const isVip = item.is_vip || item.category === 'VIP';
                const isContractor = item.category === 'Contractor' || item.category === 'Utility';
                const isEvent = item.is_event_participant || (item.token_code && item.token_code.startsWith('EVT'));
                const isActive = item.status === 'ACTIVE';
                const isCompleted = item.status === 'COMPLETED';
                const isScheduled = item.status === 'SCHEDULED';

                return (
                  <TouchableOpacity
                    key={item.id || item.token_code || index}
                    style={styles.visitorCard}
                    activeOpacity={0.85}
                    onPress={() => onSelectVisitor && onSelectVisitor(item)}
                  >
                    {/* Top Row: Category + Status Badge */}
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.categoryBadgeRow}>
                        {isVip && (
                          <View style={[styles.badgePill, { backgroundColor: '#FEF3C7' }]}>
                            <CrownIcon size={12} color="#D97706" />
                            <Text style={[styles.badgeText, { color: '#D97706' }]}>VIP PASS</Text>
                          </View>
                        )}
                        {isContractor && (
                          <View style={[styles.badgePill, { backgroundColor: '#FFE8D6' }]}>
                            <WrenchIcon size={12} color="#D97706" />
                            <Text style={[styles.badgeText, { color: '#D97706' }]}>CONTRACTOR</Text>
                          </View>
                        )}
                        {isEvent && (
                          <View style={[styles.badgePill, { backgroundColor: '#EDE9FE' }]}>
                            <TicketIcon size={12} color="#0B2A5B" />
                            <Text style={[styles.badgeText, { color: '#0B2A5B' }]}>
                              {item.category || 'EVENT'}
                            </Text>
                          </View>
                        )}
                        {!isVip && !isContractor && !isEvent && (
                          <View style={[styles.badgePill, { backgroundColor: '#F1F5F9' }]}>
                            <BuildingIcon size={12} color="#475569" />
                            <Text style={[styles.badgeText, { color: '#475569' }]}>
                              {item.category || 'GENERAL'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Status indicator */}
                      <View
                        style={[
                          styles.statusTag,
                          isActive && styles.statusActive,
                          isCompleted && styles.statusCompleted,
                          isScheduled && styles.statusScheduled,
                        ]}
                      >
                        <View
                          style={[
                            styles.statusDot,
                            isActive && { backgroundColor: '#16A34A' },
                            isCompleted && { backgroundColor: '#475569' },
                            isScheduled && { backgroundColor: '#D97706' },
                          ]}
                        />
                        <Text
                          style={[
                            styles.statusTagText,
                            isActive && { color: '#15803D' },
                            isCompleted && { color: '#334155' },
                            isScheduled && { color: '#B45309' },
                          ]}
                        >
                          {isActive ? 'INSIDE' : isCompleted ? 'CHECKED OUT' : 'SCHEDULED'}
                        </Text>
                      </View>
                    </View>

                    {/* Middle Row: Name + Badge Code + Actions */}
                    <View style={styles.cardMainRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.visitorName}>{item.full_name}</Text>
                        {!isScheduled && item.token_code ? (
                          <Text style={styles.visitorBadgeCode}>
                            Badge: <Text style={styles.badgeCodeHighlight}>{item.token_code}</Text>
                          </Text>
                        ) : null}
                      </View>

                      {item.mobile ? (
                        <TouchableOpacity
                          style={styles.callButton}
                          onPress={() => handleCall(item.mobile)}
                          activeOpacity={0.8}
                        >
                          <PhoneIcon size={13} color="#0B2A5B" />
                          <Text style={styles.callButtonText}>Call</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Details: Gate, Purpose / Host, Timestamps */}
                    <View style={styles.cardDetailsBox}>
                      <View style={styles.detailItem}>
                        <DoorEnterIcon size={12} color="#64748B" />
                        <Text style={styles.detailText}>{item.gate || 'Gate 1 Entrance'}</Text>
                      </View>

                      {item.purpose ? (
                        <View style={styles.detailItem}>
                          <Text style={styles.detailText} numberOfLines={1}>
                            Purpose: {item.purpose}
                          </Text>
                        </View>
                      ) : null}

                      {item.company ? (
                        <View style={styles.detailItem}>
                          <BuildingIcon size={12} color="#64748B" />
                          <Text style={styles.detailText} numberOfLines={1}>
                            {item.company}
                          </Text>
                        </View>
                      ) : null}

                      {item.vehicle_no ? (
                        <View style={styles.detailItem}>
                          <CarIcon size={12} color="#64748B" />
                          <Text style={styles.detailText}>{item.vehicle_no}</Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Footer Timestamps */}
                    <View style={styles.cardFooter}>
                      <View style={styles.timeRow}>
                        <ClockIcon size={12} color="#7B8CA3" />
                        <Text style={styles.timeText}>
                          {isActive
                            ? `In: ${formatDisplayTime(item.check_in)}`
                            : isCompleted
                            ? `In: ${formatDisplayTime(item.check_in)} • Out: ${formatDisplayTime(item.check_out)}`
                            : `Window: ${item.time_window || '09:00 AM - 01:00 PM'}`}
                        </Text>
                      </View>

                      <Text style={styles.tapDetailsHint}>View Details ›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#F7F9FC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  dragBar: {
    width: 44,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Date Control
  dateControlCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F7F9FC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateCenterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  todayPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  todayPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  presetButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  presetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetBtnActive: {
    backgroundColor: '#EDE9FE',
    borderColor: '#C4B5FD',
  },
  presetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  presetBtnTextActive: {
    color: '#0B2A5B',
  },
  calendarPickerContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },

  // Metric strip
  metricsStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  metricBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },

  // Search input
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },

  // Chips
  chipsContainer: {
    marginTop: 10,
  },
  chipsContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#0B2A5B',
    borderColor: '#0B2A5B',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  chipBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  chipBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  chipBadgeTextActive: {
    color: '#FFFFFF',
  },

  // Visitor List
  visitorList: {
    marginTop: 10,
    paddingHorizontal: 16,
  },
  visitorListContent: {
    paddingBottom: 24,
    gap: 10,
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptyStateSub: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  jumpTodayBtn: {
    marginTop: 16,
    backgroundColor: '#0B2A5B',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  jumpTodayBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Card
  visitorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  statusActive: {
    backgroundColor: '#DCFCE7',
  },
  statusCompleted: {
    backgroundColor: '#F1F5F9',
  },
  statusScheduled: {
    backgroundColor: '#FEF3C7',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },

  cardMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  visitorName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  visitorBadgeCode: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  badgeCodeHighlight: {
    fontWeight: '700',
    color: '#0B2A5B',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  callButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0B2A5B',
  },

  cardDetailsBox: {
    gap: 4,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  tapDetailsHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0B2A5B',
  },
});
