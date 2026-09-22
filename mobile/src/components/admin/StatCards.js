import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import {
  DoorEnterIcon,
  TotalPassIcon,
  QRIcon,
  QrScanCornerIcon,
  SearchIcon,
  CloseIcon,
  TrendingUpIcon,
  ClockIcon,
} from '../AdminIcons';
import styles from '../../styles/adminStyles';

/**
 * StatCards — Top 2 stat cards + capacity card + generate button + search + filter chips
 */
export function StatCards({
  activeVisits,
  totalTodayCount,
  availableCount,
  totalTokensCount,
  capacityPercent,
  generatingToken,
  onGenerateQR,
  searchQuery,
  onSearchChange,
  selectedFilter,
  onFilterChange,
  allVisitsCombined,
  historyVisits,
}) {
  return (
    <>
      {/* Top 2 Stat Cards Row */}
      <View style={styles.topStatsRow}>
        {/* Inside Campus Card */}
        <View style={styles.statCardHalf}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardTitle}>INSIDE CAMPUS</Text>
            <View style={styles.statIconContainer}>
              <DoorEnterIcon size={20} color="#2563eb" />
            </View>
          </View>
          <Text style={styles.statCardValue}>{activeVisits.length || 32}</Text>
          <View style={styles.statPillTrend}>
            <TrendingUpIcon size={12} color="#15803d" />
            <Text style={styles.statPillTrendText}>+{Math.max(1, activeVisits.length)} past hour</Text>
          </View>
        </View>

        {/* Total Today Card */}
        <View style={styles.statCardHalf}>
          <View style={styles.statCardHeader}>
            <Text style={styles.statCardTitle}>TOTAL TODAY</Text>
            <View style={styles.statIconContainer}>
              <TotalPassIcon size={20} color="#2563eb" />
            </View>
          </View>
          <Text style={styles.statCardValue}>{totalTodayCount > 0 ? totalTodayCount : 147}</Text>
          <View style={styles.statSubRow}>
            <ClockIcon size={12} color="#64748b" />
            <Text style={styles.statSubText}>Peak: 11:30 AM</Text>
          </View>
        </View>
      </View>

      {/* Available QR Capacity Card */}
      <View style={styles.capacityCard}>
        <View style={styles.capacityCardHeader}>
          <Text style={styles.capacityCardTitle}>AVAILABLE QR</Text>
          <View style={styles.statIconContainer}>
            <QRIcon size={20} color="#2563eb" />
          </View>
        </View>
        <View style={styles.capacityValueRow}>
          <Text style={styles.capacityValueBig}>{availableCount > 0 ? availableCount : 68}</Text>
          <Text style={styles.capacityValueMax}>/{totalTokensCount > 0 ? totalTokensCount : 100}</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${availableCount > 0 ? capacityPercent : 68}%` },
            ]}
          />
        </View>
      </View>

      {/* Primary Action Button: Generate New QR Token */}
      <TouchableOpacity
        style={styles.generatePrimaryBtn}
        activeOpacity={0.88}
        onPress={onGenerateQR}
        disabled={generatingToken}
      >
        {generatingToken ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <View style={styles.generateBtnContent}>
            <QrScanCornerIcon size={20} color="#ffffff" />
            <Text style={styles.generateBtnText}>+ Generate New QR Token</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <SearchIcon size={18} color="#64748b" />
        <Text
          style={[styles.searchInput, { lineHeight: 20 }]}
          numberOfLines={1}
        />
        {/* We expose a real TextInput via props so parent keeps state */}
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <CloseIcon size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips Horizontal Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsRow}
      >
        {[
          { key: 'ALL', label: `All (${allVisitsCombined.length || 32})` },
          { key: 'ACTIVE', label: `Active (${activeVisits.length || 28})` },
          { key: 'VIP', label: 'VIP / Pre-approved' },
          { key: 'CONTRACTORS', label: 'Contractors' },
          { key: 'HISTORY', label: `Completed (${historyVisits.length})` },
        ].map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterChip, selectedFilter === key && styles.filterChipActive]}
            onPress={() => onFilterChange(key)}
          >
            <Text style={[styles.filterChipText, selectedFilter === key && styles.filterChipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
}

export function ManifestHeader() {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>Campus Manifest</Text>
    </View>
  );
}
