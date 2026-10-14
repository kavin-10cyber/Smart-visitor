import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  NativeModules,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { api, getDownloadUrl, getBadgeUrl } from '../services/api';
import {
  LogoutIcon,
  TicketIcon,
  CalendarIcon,
  QRIcon,
  QrNavIcon,
  BuildingIcon,
  PlusIcon,
  CloseIcon,
  SearchIcon,
  UsersIcon,
  DownloadIcon,
  PrinterIcon,
  LinkIcon,
} from '../components/AdminIcons';

export default function EventPortal({ currentUser, onLogout }) {
  // Navigation: 'pass' | 'participants'
  const [activeNavTab, setActiveNavTab] = useState('pass');

  const [eventData, setEventData] = useState(
    currentUser?.event || {
      id: 'evt-001',
      title: 'Campus Tech Symposium 2026',
      description: 'National Technology & AI Exhibition with keynote addresses and startup exhibitions.',
      date: '2026-10-25',
      time: '09:30 AM - 04:30 PM',
      venue: 'Main Auditorium, Gate 1',
      expected_attendees: '250',
      coordinator_name: currentUser?.name || 'Event Coordinator',
      coordinator_phone: '+91 98765 43210',
      login_id: currentUser?.username || 'tech2026',
      event_qr_code: 'EVT-TECH-2026',
      status: 'ACTIVE',
    }
  );

  const [mainQRCode, setMainQRCode] = useState(
    eventData?.event_qr_code || 'EVT-TECH-2026'
  );

  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Participants State
  const [participants, setParticipants] = useState([]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Attendee Passes State
  const [attendeePasses, setAttendeePasses] = useState([
    {
      id: 'p-1',
      token_code: `${mainQRCode}-ATT01`,
      attendee_name: 'Keynote Speaker 1',
      category: 'Speaker',
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
      id: 'p-2',
      token_code: `${mainQRCode}-VIP01`,
      attendee_name: 'Dr. Katherine Cole',
      category: 'VIP',
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Modal for new attendee pass
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newAttendeeName, setNewAttendeeName] = useState('');
  const [newCategory, setNewCategory] = useState('Delegate'); // 'Delegate' | 'VIP' | 'Speaker' | 'Guest'
  const [generatingPass, setGeneratingPass] = useState(false);

  // Modal for QR Preview
  const [previewPass, setPreviewPass] = useState(null);

  const svgRef = useRef(null);
  const modalSvgRef = useRef(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadParticipantsSilently();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [eventsRes, partsRes] = await Promise.all([
        api.getEvents().catch(() => ({ success: false, events: [] })),
        api.getParticipants(eventData?.id).catch(() => ({ success: false, participants: [] })),
      ]);

      if (eventsRes?.success && Array.isArray(eventsRes.events)) {
        const found = eventsRes.events.find(
          (e) =>
            (e.login_id || '').toLowerCase() === (currentUser?.username || '').toLowerCase() ||
            e.id === currentUser?.event?.id
        );
        if (found) {
          setEventData(found);
          if (found.event_qr_code) setMainQRCode(found.event_qr_code);
        }
      }

      if (partsRes?.success && Array.isArray(partsRes.participants)) {
        setParticipants(partsRes.participants);
      }
    } catch (_) {}
  };

  const loadParticipantsSilently = async () => {
    try {
      const partsRes = await api.getParticipants(eventData?.id);
      if (partsRes?.success && Array.isArray(partsRes.participants)) {
        setParticipants(partsRes.participants);
      }
    } catch (_) {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Download Main Event QR Code
  const handleDownloadMainQR = () => {
    if (!mainQRCode) return;
    setDownloading(true);

    if (svgRef.current && NativeModules.SaveImageModule) {
      svgRef.current.toDataURL(async (dataURL) => {
        try {
          const savedPath = await NativeModules.SaveImageModule.saveBase64Image(
            dataURL,
            `${mainQRCode}-event-qr.png`
          );
          const savedMsg =
            Platform.OS === 'ios'
              ? `Event QR Code saved directly to Photos:\n\n${savedPath}`
              : `Event QR Code saved directly to device Downloads:\n\n${savedPath}`;
          Alert.alert('QR Saved to Device', savedMsg);
        } catch (err) {
          console.error('SaveImageModule error:', err);
          try {
            const url = getDownloadUrl(mainQRCode);
            await Linking.openURL(url);
          } catch (e) {
            Alert.alert('Save Failed', 'Could not save QR code: ' + (err.message || ''));
          }
        } finally {
          setDownloading(false);
        }
      });
    } else {
      const url = getDownloadUrl(mainQRCode);
      Linking.openURL(url).catch((e) => {
        Alert.alert('Download Error', 'Could not open QR download: ' + e.message);
      });
      setDownloading(false);
    }
  };

  // Download Preview Modal QR Code
  const handleDownloadPreviewQR = (pass) => {
    const code = pass.token_code;
    if (modalSvgRef.current && NativeModules.SaveImageModule) {
      modalSvgRef.current.toDataURL(async (dataURL) => {
        try {
          const savedPath = await NativeModules.SaveImageModule.saveBase64Image(
            dataURL,
            `${code}-badge.png`
          );
          Alert.alert('Pass Saved', `Saved pass badge to device: ${savedPath}`);
        } catch (err) {
          Linking.openURL(getDownloadUrl(code));
        }
      });
    } else {
      Linking.openURL(getDownloadUrl(code));
    }
  };

  // Generate a new custom Event Master QR Code
  const handleRegenerateMasterQR = () => {
    Alert.alert(
      'Generate New Event QR Code',
      'This will update the official Master QR Code for this event.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate New QR',
          onPress: () => {
            const clean = (eventData.title || 'EVT')
              .slice(0, 4)
              .toUpperCase()
              .replace(/[^A-Z]/g, 'X');
            const newCode = `EVT-${clean}-${Math.floor(1000 + Math.random() * 9000)}`;
            setMainQRCode(newCode);
            setEventData((prev) => ({ ...prev, event_qr_code: newCode }));
            Alert.alert('Success', `New Event QR Code generated: ${newCode}`);
          },
        },
      ]
    );
  };

  // Generate an individual attendee/delegate pass
  const handleCreateAttendeePass = async () => {
    const name = newAttendeeName.trim() || `${newCategory} Guest`;
    setGeneratingPass(true);

    try {
      const passNum = String(attendeePasses.length + 1).padStart(2, '0');
      const passPrefix = newCategory === 'VIP' ? 'VIP' : newCategory === 'Speaker' ? 'SPK' : 'DEL';
      const tokenCode = `${mainQRCode}-${passPrefix}${passNum}`;

      await api.ensureTokenExists(tokenCode);

      const newPass = {
        id: 'p-' + Date.now(),
        token_code: tokenCode,
        attendee_name: name,
        category: newCategory,
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setAttendeePasses([newPass, ...attendeePasses]);
      setNewAttendeeName('');
      setShowGenerateModal(false);
      setPreviewPass(newPass);
    } catch (err) {
      Alert.alert('Error', 'Could not generate pass: ' + err.message);
    } finally {
      setGeneratingPass(false);
    }
  };

  // Filtered Participants List
  const filteredParticipants = participants.filter((p) => {
    if (selectedCategoryFilter !== 'ALL' && p.category !== selectedCategoryFilter) {
      return false;
    }
    if (!participantSearch.trim()) return true;
    const q = participantSearch.toLowerCase().trim();
    return (
      (p.full_name && p.full_name.toLowerCase().includes(q)) ||
      (p.mobile && p.mobile.toLowerCase().includes(q)) ||
      (p.participant_code && p.participant_code.toLowerCase().includes(q)) ||
      (p.organization && p.organization.toLowerCase().includes(q))
    );
  });

  // ── Render: Tab 1 — Event Pass & QR ──────────────────────────
  const renderPassTab = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C5CE7']} />
      }
    >
      {/* Event Quick Info Banner */}
      <View style={styles.eventInfoBanner}>
        <View style={styles.bannerRow}>
          <View style={styles.infoPill}>
            <CalendarIcon size={14} color="#6C5CE7" />
            <Text style={styles.infoPillText}>{eventData.date || 'Today'}</Text>
          </View>
          <View style={styles.infoPill}>
            <BuildingIcon size={14} color="#6C5CE7" />
            <Text style={styles.infoPillText} numberOfLines={1}>
              {eventData.venue || 'Campus Auditorium'}
            </Text>
          </View>
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activePillText}>{eventData.status || 'ACTIVE'}</Text>
          </View>
        </View>

        {eventData.description ? (
          <Text style={styles.eventDescText}>{eventData.description}</Text>
        ) : null}
      </View>

      {/* ── Official Event QR Code Section ── */}
      <View style={styles.qrSectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Official Event QR Code</Text>
            <Text style={styles.sectionSub}>Scan at Gate 1 Entrance to enroll attendees</Text>
          </View>
          <TouchableOpacity
            style={styles.regenerateBtn}
            onPress={handleRegenerateMasterQR}
            activeOpacity={0.8}
          >
            <Text style={styles.regenerateBtnText}>↻ New QR</Text>
          </TouchableOpacity>
        </View>

        {/* Centered QR Display */}
        <View style={styles.qrBox}>
          <QRCode
            value={mainQRCode}
            size={210}
            color="#0F172A"
            backgroundColor="#FFFFFF"
            quietZone={10}
            getRef={(ref) => {
              svgRef.current = ref;
            }}
          />
        </View>

        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>PASS CODE:</Text>
          <Text style={styles.codeValue}>{mainQRCode}</Text>
        </View>

        {/* Action Buttons: Download and Print/Badge */}
        <View style={styles.buttonActionsGroup}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.downloadBtn]}
            onPress={handleDownloadMainQR}
            disabled={downloading}
            activeOpacity={0.85}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <DownloadIcon size={16} color="#FFFFFF" />
                <Text style={styles.downloadBtnText}>DOWNLOAD QR IMAGE</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.secondaryBtnRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.printBtn]}
              onPress={() => Linking.openURL(getBadgeUrl(mainQRCode))}
              activeOpacity={0.85}
            >
              <PrinterIcon size={15} color="#6C5CE7" />
              <Text style={styles.printBtnText}>Print Pass</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.shareBtn]}
              onPress={() => Linking.openURL(getDownloadUrl(mainQRCode))}
              activeOpacity={0.85}
            >
              <LinkIcon size={15} color="#6C5CE7" />
              <Text style={styles.shareBtnText}>Open Cloud Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Attendee Passes Management ── */}
      <View style={styles.attendeesHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Custom Delegate Passes</Text>
          <Text style={styles.sectionSub}>Generate specialized VIP/Speaker badges</Text>
        </View>
        <TouchableOpacity
          style={styles.addPassBtn}
          onPress={() => setShowGenerateModal(true)}
          activeOpacity={0.85}
        >
          <PlusIcon size={16} color="#FFFFFF" />
          <Text style={styles.addPassBtnText}>Create Pass</Text>
        </TouchableOpacity>
      </View>

      {attendeePasses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No Attendee Passes Yet</Text>
          <Text style={styles.emptyStateSub}>
            Tap "Create Pass" above to generate customized guest or VIP QR passes.
          </Text>
        </View>
      ) : (
        attendeePasses.map((pass) => (
          <View key={pass.id} style={styles.passCard}>
            <View style={styles.passLeft}>
              <View
                style={[
                  styles.passCategoryBadge,
                  pass.category === 'VIP'
                    ? styles.vipBg
                    : pass.category === 'Speaker'
                    ? styles.speakerBg
                    : styles.delBg,
                ]}
              >
                <Text
                  style={[
                    styles.passCategoryText,
                    pass.category === 'VIP'
                      ? styles.vipText
                      : pass.category === 'Speaker'
                      ? styles.speakerText
                      : styles.delText,
                  ]}
                >
                  {pass.category}
                </Text>
              </View>
              <Text style={styles.passAttendeeName}>{pass.attendee_name}</Text>
              <Text style={styles.passCode}>{pass.token_code}</Text>
            </View>

            <TouchableOpacity
              style={styles.viewQrBtn}
              onPress={() => setPreviewPass(pass)}
              activeOpacity={0.8}
            >
              <QRIcon size={18} color="#6C5CE7" />
              <Text style={styles.viewQrBtnText}>View QR</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <View style={{ height: 90 }} />
    </ScrollView>
  );

  // ── Render: Tab 2 — Participants Nav Item ────────────────────
  const renderParticipantsTab = () => (
    <ScrollView
      style={styles.scrollArea}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6C5CE7']} />
      }
    >
      {/* Header */}
      <View style={styles.participantsHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>Enrolled Participants</Text>
          <Text style={styles.sectionSub}>Live Gate Enrollment • Auto-Incremented Passes</Text>
        </View>
        <View style={styles.participantCountBox}>
          <Text style={styles.participantCountNum}>{participants.length}</Text>
          <Text style={styles.participantCountLabel}>Enrolled</Text>
        </View>
      </View>

      {/* Metrics Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsRow}>
        <View style={[styles.metricChip, { backgroundColor: '#F4F0FF' }]}>
          <Text style={[styles.metricCount, { color: '#6C5CE7' }]}>{participants.length}</Text>
          <Text style={[styles.metricLabel, { color: '#6C5CE7' }]}>Total Checked-In</Text>
        </View>
        <View style={[styles.metricChip, { backgroundColor: '#DCFCE7' }]}>
          <Text style={[styles.metricCount, { color: '#16A34A' }]}>
            {participants.filter((p) => p.category === 'Speaker').length}
          </Text>
          <Text style={[styles.metricLabel, { color: '#16A34A' }]}>Speakers</Text>
        </View>
        <View style={[styles.metricChip, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[styles.metricCount, { color: '#D97706' }]}>
            {participants.filter((p) => p.category === 'VIP').length}
          </Text>
          <Text style={[styles.metricLabel, { color: '#D97706' }]}>VIP Guests</Text>
        </View>
        <View style={[styles.metricChip, { backgroundColor: '#EFF6FF' }]}>
          <Text style={[styles.metricCount, { color: '#2563EB' }]}>
            {participants.filter((p) => p.category === 'Delegate' || p.category === 'Student').length}
          </Text>
          <Text style={[styles.metricLabel, { color: '#2563EB' }]}>Delegates</Text>
        </View>
      </ScrollView>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <SearchIcon size={18} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          value={participantSearch}
          onChangeText={setParticipantSearch}
          placeholder="Search participant name, mobile, or pass #..."
          placeholderTextColor="#94A3B8"
        />
        {participantSearch ? (
          <TouchableOpacity onPress={() => setParticipantSearch('')}>
            <CloseIcon size={16} color="#64748B" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category Filter Chips */}
      <View style={styles.categoryFilterRow}>
        {['ALL', 'Delegate', 'VIP', 'Speaker', 'Student'].map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.catFilterChip,
              selectedCategoryFilter === cat && styles.catFilterChipActive,
            ]}
            onPress={() => setSelectedCategoryFilter(cat)}
          >
            <Text
              style={[
                styles.catFilterChipText,
                selectedCategoryFilter === cat && styles.catFilterChipTextActive,
              ]}
            >
              {cat === 'ALL' ? 'All' : cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Participants List */}
      {filteredParticipants.length === 0 ? (
        <View style={styles.emptyState}>
          <UsersIcon size={40} color="#94A3B8" />
          <Text style={styles.emptyStateTitle}>No Participants Enrolled Yet</Text>
          <Text style={styles.emptyStateSub}>
            When Security scans this event's QR code at the entrance, each attendee is enrolled with an auto-incrementing ID number and will appear here in real-time.
          </Text>
        </View>
      ) : (
        filteredParticipants.map((part) => (
          <View key={part.id} style={styles.participantCard}>
            <View style={styles.participantTopRow}>
              <View style={styles.participantBadgeBox}>
                <Text style={styles.participantBadgeText}>
                  Participant #{part.participant_no}
                </Text>
                <Text style={styles.participantCodeText}>{part.participant_code}</Text>
              </View>

              <View style={styles.checkedInPill}>
                <View style={styles.checkedInDot} />
                <Text style={styles.checkedInPillText}>CHECKED IN</Text>
              </View>
            </View>

            <Text style={styles.participantName}>{part.full_name}</Text>

            <View style={styles.participantMetaRow}>
              {part.organization ? (
                <Text style={styles.participantMetaText}>Organization: {part.organization}</Text>
              ) : null}
              {part.mobile ? (
                <Text style={styles.participantMetaText}>Phone: {part.mobile}</Text>
              ) : null}
            </View>

            <View style={styles.participantFooterRow}>
              <View
                style={[
                  styles.passCategoryBadge,
                  part.category === 'VIP'
                    ? styles.vipBg
                    : part.category === 'Speaker'
                    ? styles.speakerBg
                    : styles.delBg,
                ]}
              >
                <Text
                  style={[
                    styles.passCategoryText,
                    part.category === 'VIP'
                      ? styles.vipText
                      : part.category === 'Speaker'
                      ? styles.speakerText
                      : styles.delText,
                  ]}
                >
                  {part.category || 'Delegate'}
                </Text>
              </View>

              <Text style={styles.participantTimeText}>
                {part.check_in_time ? new Date(part.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'} • {part.gate || 'Gate 1'}
              </Text>

              <TouchableOpacity
                style={styles.participantQrBtn}
                onPress={() =>
                  setPreviewPass({
                    token_code: part.participant_code,
                    attendee_name: part.full_name,
                    category: part.category,
                  })
                }
              >
                <QRIcon size={15} color="#6C5CE7" />
                <Text style={styles.participantQrBtnText}>QR</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 90 }} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.roleBadgeContainer}>
            <Text style={styles.roleBadgeText}>EVENT PORTAL</Text>
          </View>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {eventData.title}
          </Text>
          <Text style={styles.headerSub}>
            Coordinator: {eventData.coordinator_name || currentUser?.name || 'Manager'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <LogoutIcon size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Screen Content */}
      <View style={styles.screenWrapper}>
        {activeNavTab === 'pass' && renderPassTab()}
        {activeNavTab === 'participants' && renderParticipantsTab()}
      </View>

      {/* ── Modern Curved Bottom Navigation Bar ── */}
      <View style={styles.bottomNavWrapper}>
        <View style={styles.bottomNavRow}>
          {/* Tab 1: Event Pass & QR */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => setActiveNavTab('pass')}
            activeOpacity={0.8}
          >
            <TicketIcon size={22} color={activeNavTab === 'pass' ? '#6C5CE7' : '#94A3B8'} />
            <Text style={[styles.navTabLabel, activeNavTab === 'pass' && styles.navTabLabelActive]}>
              Event Pass
            </Text>
            {activeNavTab === 'pass' && <View style={styles.navActiveDot} />}
          </TouchableOpacity>

          {/* Tab 2: Participants (New Nav Item) */}
          <TouchableOpacity
            style={styles.navTabItem}
            onPress={() => setActiveNavTab('participants')}
            activeOpacity={0.8}
          >
            <View style={{ position: 'relative' }}>
              <UsersIcon size={22} color={activeNavTab === 'participants' ? '#6C5CE7' : '#94A3B8'} />
              {participants.length > 0 && (
                <View style={styles.navCountBadge}>
                  <Text style={styles.navCountBadgeText}>{participants.length}</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.navTabLabel,
                activeNavTab === 'participants' && styles.navTabLabelActive,
              ]}
            >
              Participants
            </Text>
            {activeNavTab === 'participants' && <View style={styles.navActiveDot} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Modal: Create Attendee Pass ── */}
      <Modal
        visible={showGenerateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGenerateModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Issue Delegate QR Pass</Text>
              <TouchableOpacity onPress={() => setShowGenerateModal(false)}>
                <CloseIcon size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Attendee / Guest Name</Text>
            <TextInput
              style={styles.textInput}
              value={newAttendeeName}
              onChangeText={setNewAttendeeName}
              placeholder="e.g. Dr. Alex Mercer"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Pass Category</Text>
            <View style={styles.categoryPickerRow}>
              {['Delegate', 'VIP', 'Speaker', 'Guest'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    newCategory === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setNewCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      newCategory === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={handleCreateAttendeePass}
              disabled={generatingPass}
              activeOpacity={0.85}
            >
              {generatingPass ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Generate Pass & QR Code</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Preview Pass QR with Download ── */}
      <Modal
        visible={!!previewPass}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPreviewPass(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{previewPass?.attendee_name || 'Event Pass'}</Text>
                <Text style={styles.modalSub}>{previewPass?.category || 'Attendee'} Pass</Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewPass(null)}>
                <CloseIcon size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {previewPass && (
              <View style={styles.modalQrArea}>
                <View style={styles.qrBox}>
                  <QRCode
                    value={previewPass.token_code}
                    size={200}
                    color="#0F172A"
                    backgroundColor="#FFFFFF"
                    quietZone={8}
                    getRef={(ref) => {
                      modalSvgRef.current = ref;
                    }}
                  />
                </View>

                <Text style={styles.modalTokenCode}>{previewPass.token_code}</Text>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.downloadBtn, { marginTop: 14 }]}
                  onPress={() => handleDownloadPreviewQR(previewPass)}
                  activeOpacity={0.85}
                >
                  <DownloadIcon size={16} color="#FFFFFF" />
                  <Text style={styles.downloadBtnText}>DOWNLOAD PASS QR</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => setPreviewPass(null)}
                >
                  <Text style={styles.doneBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  screenWrapper: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  roleBadgeContainer: {
    backgroundColor: '#F4F0FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6C5CE7',
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 6,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  scrollArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
  },
  eventInfoBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  bannerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  eventDescText: {
    marginTop: 10,
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
  },
  qrSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  regenerateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F4F0FF',
  },
  regenerateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  qrBox: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  codeValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#6C5CE7',
    letterSpacing: 1,
  },
  buttonActionsGroup: {
    width: '100%',
    marginTop: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  btnIcon: {
    fontSize: 15,
  },
  downloadBtn: {
    width: '100%',
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 10,
  },
  downloadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  printBtn: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  printBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  shareBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  shareBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  attendeesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addPassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  addPassBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 6,
    marginBottom: 4,
  },
  emptyStateSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
  passCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  passLeft: {
    flex: 1,
    marginRight: 10,
  },
  passCategoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  vipBg: {
    backgroundColor: '#FEF3C7',
  },
  vipText: {
    color: '#D97706',
    fontWeight: '800',
    fontSize: 10,
  },
  speakerBg: {
    backgroundColor: '#DCFCE7',
  },
  speakerText: {
    color: '#16A34A',
    fontWeight: '800',
    fontSize: 10,
  },
  delBg: {
    backgroundColor: '#F1F5F9',
  },
  delText: {
    color: '#475569',
    fontWeight: '800',
    fontSize: 10,
  },
  passAttendeeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  passCode: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  viewQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F0FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  viewQrBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  participantsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  participantCountBox: {
    backgroundColor: '#F4F0FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8D1F8',
  },
  participantCountNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#6C5CE7',
  },
  participantCountLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6C5CE7',
    textTransform: 'uppercase',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
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
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
    padding: 0,
  },
  categoryFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  catFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catFilterChipActive: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  catFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  catFilterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  participantCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  participantTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  participantBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantBadgeText: {
    backgroundColor: '#F4F0FF',
    color: '#6C5CE7',
    fontWeight: '800',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  participantCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  checkedInPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  checkedInDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  checkedInPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#15803D',
  },
  participantName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  participantMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  participantMetaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  participantFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  participantTimeText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  participantQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F0FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  participantQrBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C5CE7',
  },
  bottomNavWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  navTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 3,
  },
  navTabLabelActive: {
    color: '#6C5CE7',
    fontWeight: '800',
  },
  navActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6C5CE7',
    marginTop: 2,
  },
  navCountBadge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#6C5CE7',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  navCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 16,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#6C5CE7',
    borderColor: '#6C5CE7',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  modalSubmitBtn: {
    backgroundColor: '#6C5CE7',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalQrArea: {
    alignItems: 'center',
    marginTop: 8,
  },
  modalTokenCode: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6C5CE7',
    marginTop: 12,
    letterSpacing: 1,
  },
  doneBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  doneBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
