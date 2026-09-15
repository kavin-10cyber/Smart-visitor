import { StyleSheet, Platform } from 'react-native';

const securityStyles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#ffffff' },
  screenContainer: { flex: 1, backgroundColor: '#f8fafc' },

  // Top Header
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeftCol: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shieldLogoBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  headerTimestamp: { fontSize: 11, color: '#64748b', fontWeight: '500', marginTop: 1 },
  profileAvatarBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center',
  },

  // Scroll Area
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 90 },

  // Hero Check-In Card
  heroCheckInCard: {
    backgroundColor: '#ffffff', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 14,
    shadowColor: '#000000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  heroCardHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  heroCardTitleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  blueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563eb' },
  heroCardTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  scannerReadyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  scannerReadyText: { fontSize: 10, fontWeight: '800', color: '#15803d', letterSpacing: 0.4 },
  scanCodeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 12, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  scanCodeIconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center',
  },
  scanCodeBtnText: {
    fontSize: 14, fontWeight: '800', color: '#ffffff',
    letterSpacing: 0.6, flex: 1, marginLeft: 12,
  },
  searchBarBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 12, height: 44, gap: 8, marginBottom: 10,
  },
  searchBarInput: { flex: 1, fontSize: 13, color: '#0f172a', paddingVertical: 0 },

  // Metrics Row
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricCard: {
    flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1,
  },
  metricHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  metricTitlePresent: { fontSize: 11, fontWeight: '800', color: '#2563eb', letterSpacing: 0.5 },
  metricTitleLogged: { fontSize: 11, fontWeight: '800', color: '#15803d', letterSpacing: 0.5 },
  metricIconBox: {
    width: 32, height: 32, borderRadius: 8, backgroundColor: '#eff6ff',
    justifyContent: 'center', alignItems: 'center',
  },
  metricNumberRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  metricNumberBold: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  trendTagPill: { backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  trendTagText: { fontSize: 11, fontWeight: '700', color: '#2563eb' },
  percentTagPill: { backgroundColor: '#dbeafe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  percentTagText: { fontSize: 11, fontWeight: '700', color: '#1d4ed8' },
  metricSubtitle: { fontSize: 11, color: '#64748b', fontWeight: '500' },

  // Filter Chips
  filterChipsRow: { gap: 8, paddingBottom: 4, marginBottom: 14 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  filterChipTextActive: { color: '#ffffff', fontWeight: '700' },
  filterCountBadge: {
    backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
  },
  filterCountBadgeActive: { backgroundColor: '#2563eb' },
  filterCountText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  filterCountTextActive: { color: '#ffffff' },

  // Security Notice Banner
  securityNoticeCard: {
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2',
    borderRadius: 16, padding: 14, marginBottom: 14,
  },
  securityNoticeTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  securityNoticeLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertIconBox: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#fecaca', justifyContent: 'center', alignItems: 'center',
  },
  securityNoticeTitle: { fontSize: 12, fontWeight: '800', color: '#991b1b', letterSpacing: 0.5 },
  priorityBadge: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#fecaca',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  priorityBadgeText: { fontSize: 10, fontWeight: '800', color: '#991b1b' },
  securityNoticeBody: { fontSize: 12, color: '#7f1d1d', lineHeight: 18 },
  boldNotice: { fontWeight: '800', color: '#991b1b' },

  // Recent Activity Section
  activityHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  activityHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  liveFeedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  liveFeedText: { fontSize: 10, fontWeight: '800', color: '#15803d', letterSpacing: 0.3 },

  // Activity Cards
  activityRowCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff',
    borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#f1f5f9', gap: 12,
  },
  activityCheckCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center',
  },
  activityContentCol: { flex: 1 },
  activityNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  activityVisitorName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  checkedInPill: { backgroundColor: '#dcfce7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  checkedInPillText: { fontSize: 10, fontWeight: '700', color: '#15803d' },
  activitySubDetail: { fontSize: 11, color: '#64748b' },
  activityTimestamp: { fontSize: 11, color: '#64748b', fontWeight: '600' },

  // Turnstile Status Card
  turnstileStatusCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe',
    borderRadius: 14, padding: 14, marginTop: 8, marginBottom: 10,
  },
  turnstileLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  turnstileFlagBox: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center',
  },
  turnstileTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  turnstileSubtitle: { fontSize: 11, color: '#64748b', marginTop: 2 },
  greenPulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },

  // Empty State
  emptyStateBox: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 8,
  },
  emptyStateTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  emptyStateSub: { fontSize: 12, color: '#64748b' },

  // Bottom Navigation Bar
  bottomTabBar: {
    flexDirection: 'row', backgroundColor: '#ffffff',
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
    paddingVertical: 10, paddingHorizontal: 6,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 10, fontWeight: '600', color: '#64748b' },
  tabLabelActive: { color: '#2563eb', fontWeight: '700' },

  // Generic Tab Content
  tabHeadingTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  tabHeadingSub: { fontSize: 12, color: '#64748b', marginBottom: 16 },
  logCardItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  logCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logCardToken: {
    fontSize: 12, fontWeight: '800', color: '#2563eb',
    backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  logCardName: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  logCardSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  statusBadgeSmall: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeActive: { backgroundColor: '#dcfce7' },
  badgeDone: { backgroundColor: '#f1f5f9' },
  statusBadgeSmallText: { fontSize: 10, fontWeight: '800' },
  textActive: { color: '#166534' },
  textDone: { color: '#475569' },

  // Access Tab
  bigScannerActionBtn: {
    backgroundColor: '#2563eb', borderRadius: 16, padding: 24,
    alignItems: 'center', gap: 10, marginBottom: 16,
  },
  bigScannerActionBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  gateControlCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  gateControlTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  gateControlSub: { fontSize: 12, color: '#64748b', marginBottom: 14 },
  unlockTurnstileBtn: {
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#dbeafe',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  unlockTurnstileBtnText: { color: '#2563eb', fontSize: 13, fontWeight: '700' },

  // Settings Tab
  settingsSection: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16,
  },
  settingsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  settingsLabel: { fontSize: 13, color: '#64748b' },
  settingsValue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  logoutBtnFull: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fef2f2', paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  logoutBtnFullText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },

  // Modals Styling
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.65)', justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24, maxHeight: '88%',
  },
  modalHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  modalHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  modalCloseBtn: { padding: 4 },

  // Scanner Modal Full Screen
  scannerModalSafeArea: { flex: 1, backgroundColor: '#ffffff' },
  scannerModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  scannerHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scannerShieldBox: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center',
  },
  scannerModalTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  scannerModalSub: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  scannerModalCloseBtn: { padding: 6 },

  // Form Inputs
  formInputLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6, marginTop: 8 },
  tokenDisplayBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, marginBottom: 8 },
  tokenDisplayText: { fontSize: 16, fontWeight: '800', color: '#2563eb' },
  tokenDisplaySub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  formTextInput: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, paddingHorizontal: 12, height: 44, fontSize: 13,
    color: '#0f172a', marginBottom: 8,
  },
  submitCheckInBtn: {
    backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginTop: 14, marginBottom: 10,
  },
  submitCheckInBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  // Action / Detail Modal
  actionHeroBox: {
    backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 14,
  },
  actionHeroName: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  actionHeroToken: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  actionTokenBold: { color: '#2563eb', fontWeight: '800' },
  actionStatusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusActivePill: { backgroundColor: '#dcfce7' },
  statusDonePill: { backgroundColor: '#f1f5f9' },
  actionStatusPillText: { fontSize: 11, fontWeight: '800' },
  statusActiveText: { color: '#166534' },
  statusDoneText: { color: '#475569' },
  actionDetailsList: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 14, marginBottom: 16 },
  actionDetailItem: { marginBottom: 10 },
  actionDetailLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  actionDetailVal: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  actionCheckOutBigBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#ef4444', paddingVertical: 14, borderRadius: 14, gap: 8, marginBottom: 10,
  },
  actionCheckOutBigBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  completedMessageBox: {
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10,
  },
  completedMessageText: { color: '#15803d', fontWeight: '700', fontSize: 13 },

  // Officer Profile Modal
  officerMenuContent: { paddingVertical: 6 },
  officerProfileHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 10,
  },
  officerAvatarLarge: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center',
  },
  officerName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  officerRole: { fontSize: 11, color: '#64748b', marginTop: 2 },
  officerActionRow: {
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  officerActionText: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
});

export default securityStyles;
