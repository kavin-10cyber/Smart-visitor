import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '../AdminIcons';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/**
 * Format a Date object to "Sep 14, 2026 (Mon)"
 */
export const formatDisplayDate = (d) => {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const month = MONTH_SHORT[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const dayName = DAY_NAMES[d.getDay()];
  return `${month} ${day}, ${year} (${dayName})`;
};

/**
 * Parse a date string if possible, fallback to today
 */
export const parseToDate = (str) => {
  if (!str) return new Date();
  const parsed = new Date(str.replace(/\([^)]*\)/, '').trim());
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

export default function CalendarPicker({
  value,
  onChange,
  label = 'Expected Date',
  allowManualInput = true,
  defaultExpanded = true,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  const initialDate = parseToDate(value);

  const [calYear, setCalYear] = useState(initialDate.getFullYear());
  const [calMonth, setCalMonth] = useState(initialDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Sync when external value changes
  useEffect(() => {
    if (value) {
      const parsed = parseToDate(value);
      setSelectedDate(parsed);
      setCalYear(parsed.getFullYear());
      setCalMonth(parsed.getMonth());
    }
  }, [value]);

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  const handleSelectDay = (day) => {
    const newDate = new Date(calYear, calMonth, day);
    setSelectedDate(newDate);
    const formatted = formatDisplayDate(newDate);
    onChange(formatted);
  };

  const handlePresetSelect = (targetDate) => {
    setSelectedDate(targetDate);
    setCalYear(targetDate.getFullYear());
    setCalMonth(targetDate.getMonth());
    const formatted = formatDisplayDate(targetDate);
    onChange(formatted);
  };

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  // Calendar calculations
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  return (
    <View style={styles.container}>
      {/* Label and Toggle Header */}
      <View style={styles.labelRow}>
        <View style={styles.labelWithIcon}>
          <CalendarIcon size={15} color="#0B2A5B" />
          <Text style={styles.label}>{label}</Text>
        </View>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.toggleBtnText}>
            {isExpanded ? 'Hide Calendar ▲' : 'Open Calendar ▼'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expandable Visual Calendar Grid */}
      {isExpanded && (
        <View style={styles.calendarCard}>
          {/* Month Navigation */}
          <View style={styles.monthHeader}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={prevMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronLeftIcon size={16} color="#334155" />
            </TouchableOpacity>

            <Text style={styles.monthTitle}>
              {MONTH_NAMES[calMonth]} {calYear}
            </Text>

            <TouchableOpacity
              style={styles.navBtn}
              onPress={nextMonth}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ChevronRightIcon size={16} color="#334155" />
            </TouchableOpacity>
          </View>

          {/* Weekday Row */}
          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map((w, index) => (
              <Text key={`${w}-${index}`} style={styles.weekdayText}>
                {w}
              </Text>
            ))}
          </View>

          {/* Day Grid */}
          <View style={styles.daysGrid}>
            {/* Blank leading slots */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const cellDate = new Date(calYear, calMonth, day);
              cellDate.setHours(0, 0, 0, 0);

              const isPast = cellDate < today;
              const isTodayCell = isSameDay(cellDate, today);
              const isSelectedCell = isSameDay(cellDate, selectedDate);

              return (
                <View key={`day-${day}`} style={styles.dayCell}>
                  <TouchableOpacity
                    style={[
                      styles.dayBtn,
                      isTodayCell && !isSelectedCell && styles.dayBtnToday,
                      isSelectedCell && styles.dayBtnSelected,
                    ]}
                    onPress={() => !isPast && handleSelectDay(day)}
                    disabled={isPast}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isPast && styles.dayTextPast,
                        isTodayCell && !isSelectedCell && styles.dayTextToday,
                        isSelectedCell && styles.dayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Selected Date Confirmation Banner */}
          <View style={styles.summaryBanner}>
            <View style={styles.summaryLeft}>
              <View style={styles.statusDot} />
              <Text style={styles.summaryText}>
                Pass Date: <Text style={styles.summaryHighlight}>{value || formatDisplayDate(selectedDate)}</Text>
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsExpanded(false)}
              style={styles.doneBtn}
            >
              <Text style={styles.doneBtnText}>Confirm ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Manual Input Field */}
      {allowManualInput && (
        <TextInput
          style={styles.manualInput}
          placeholder="e.g. Sep 18, 2026 or Next Monday"
          placeholderTextColor="#7B8CA3"
          value={value}
          onChangeText={onChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginTop: 6,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  toggleBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B2A5B',
  },
  calendarCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 6,
  },
  weekdayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#7B8CA3',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBtnSelected: {
    backgroundColor: '#0B2A5B',
    shadowColor: '#0B2A5B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  dayBtnToday: {
    borderWidth: 1.5,
    borderColor: '#0B2A5B',
    backgroundColor: '#F1F5FA',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  dayTextToday: {
    color: '#0B2A5B',
    fontWeight: '800',
  },
  dayTextPast: {
    color: '#cbd5e1',
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5FA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#0B2A5B',
  },
  summaryText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  summaryHighlight: {
    fontWeight: '800',
    color: '#1e3a8a',
  },
  doneBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  doneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B2A5B',
  },
  manualInput: {
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 8,
  },
});
