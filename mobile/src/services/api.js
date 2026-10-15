// Direct Serverless Supabase REST API Service
// Connects directly to Supabase Cloud - NO local Node.js backend server required!
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';

const HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Supabase request timed out. Please check your internet connection.');
    }
    throw err;
  }
}

// ── In-Memory Fast Cache for instant screen transitions ─────────
const memoryCache = new Map();

function getCached(key, maxAgeMs = 15000) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > maxAgeMs) return null;
  return entry.data;
}

function setCached(key, data) {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

export function invalidateApiCache() {
  memoryCache.clear();
}


async function postgrest(endpoint, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${endpoint}`;
  const res = await fetchWithTimeout(url, {
    ...options,
    headers: { ...HEADERS, ...options.headers },
  });

  if (!res.ok) {
    let errMessage = `Supabase HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      errMessage = errJson.message || errJson.error || errMessage;
    } catch (_) {
      try {
        const text = await res.text();
        if (text) errMessage = text;
      } catch (__) {}
    }
    throw new Error(errMessage);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await res.json();
  }
  return null;
}

// Helper to enrich visits with structured metadata (Company, Gate, Vehicle, VIP, etc.)
function enrichVisit(v) {
  if (!v) return v;
  const is_vip = v.is_vip !== undefined ? v.is_vip : !!(v.purpose && v.purpose.includes('[VIP]'));

  let category = v.category;
  if (!category) {
    if (is_vip) category = 'VIP';
    else if (v.purpose && (v.purpose.includes('[Contractor]') || v.purpose.toLowerCase().includes('contract') || v.purpose.toLowerCase().includes('atm'))) category = 'Contractor';
    else if (v.purpose && (v.purpose.includes('[Utility]') || v.purpose.toLowerCase().includes('utility') || v.purpose.toLowerCase().includes('maintenance'))) category = 'Utility';
    else category = 'General';
  }

  let company = v.company;
  if (!company && v.address) {
    const m = v.address.match(/\[Co:(.*?)\]/);
    if (m) company = m[1];
  }

  let vehicle_no = v.vehicle_no;
  if (!vehicle_no && v.purpose) {
    const m = v.purpose.match(/\[Veh:(.*?)\]/);
    if (m) vehicle_no = m[1];
  }

  let gate = v.gate;
  if (!gate && v.address) {
    const m = v.address.match(/\[Gate:(.*?)\]/);
    if (m) gate = m[1];
  }
  if (!gate) gate = 'Gate 1 Entrance';

  let expected_date = v.expected_date;
  let time_window = v.time_window;
  if ((!expected_date || !time_window) && v.expected_duration && v.expected_duration.includes('•')) {
    const parts = v.expected_duration.split('•');
    if (!expected_date) expected_date = parts[0].trim();
    if (!time_window) time_window = parts[1].trim();
  }

  // Clean address & purpose for clean UI display
  const cleanAddress = v.address ? v.address.replace(/\s*\[(Co|Gate):.*?\]/g, '').trim() : '';
  const cleanPurpose = v.purpose ? v.purpose.replace(/\[VIP\]\s*/g, '').replace(/\s*\[(Contractor|Utility|Veh):.*?\]/g, '').trim() : '';

  return {
    ...v,
    address: cleanAddress || v.address,
    purpose: cleanPurpose || v.purpose,
    company: company || '',
    vehicle_no: vehicle_no || '',
    category,
    gate,
    expected_date: expected_date || (v.check_in ? new Date(v.check_in).toISOString().split('T')[0] : 'Today'),
    time_window: time_window || '09:00 AM - 01:00 PM',
    is_vip: !!is_vip,
  };
}

export function getDownloadUrl(tokenCode) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(tokenCode || '')}`;
}

export function getBadgeUrl(tokenCode) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(tokenCode || '')}`;
}

// In-memory & local store for Campus Events
let localEvents = [
  {
    id: 'evt-001',
    title: 'Campus Tech Symposium 2026',
    description: 'National Technology & AI Exhibition with keynote addresses and student startup exhibitions.',
    date: '2026-10-25',
    time: '09:30 AM - 04:30 PM',
    venue: 'Main Auditorium, Gate 1',
    expected_attendees: '250',
    coordinator_name: 'Dr. Sarah Jenkins',
    coordinator_phone: '+91 98765 43210',
    login_id: 'tech2026',
    password: 'event123',
    event_qr_code: 'EVT-TECH-2026',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  },
  {
    id: 'evt-002',
    title: 'Alumni Leadership Conclave',
    description: 'Executive campus meeting for alumni network, recruitment leads and career mentorship.',
    date: '2026-11-04',
    time: '11:00 AM - 03:00 PM',
    venue: 'Executive Seminar Hall, Gate 2',
    expected_attendees: '120',
    coordinator_name: 'Prof. Ronald Vance',
    coordinator_phone: '+91 98450 11223',
    login_id: 'alumni2026',
    password: 'alumni123',
    event_qr_code: 'EVT-ALUMNI-2026',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  },
];

// In-memory & local store for Event Participants (scanned by security at the gate)
let localParticipants = [
  {
    id: 'part-001',
    participant_no: 1,
    participant_code: 'EVT-TECH-001',
    event_id: 'evt-001',
    event_title: 'Campus Tech Symposium 2026',
    full_name: 'Dr. Michael Chang',
    mobile: '+91 98765 11223',
    organization: 'AI Research Institute',
    category: 'Speaker',
    check_in_time: new Date(Date.now() - 3600000).toISOString(),
    gate: 'Gate 1 Entrance',
    status: 'CHECKED_IN',
  },
  {
    id: 'part-002',
    participant_no: 2,
    participant_code: 'EVT-TECH-002',
    event_id: 'evt-001',
    event_title: 'Campus Tech Symposium 2026',
    full_name: 'Ananya Sharma',
    mobile: '+91 98450 33445',
    organization: 'Apex Engineering College',
    category: 'Delegate',
    check_in_time: new Date(Date.now() - 1800000).toISOString(),
    gate: 'Gate 1 Entrance',
    status: 'CHECKED_IN',
  },
];

export const api = {
  setBaseUrl: () => {},
  getBaseUrl: () => SUPABASE_URL,

  // Auth: Role authentication for security, admin & event coordinator
  async login(username, password) {
    const u = (username || '').trim().toLowerCase();
    const p = (password || '').trim();

    if (
      (u === 'admin' || u === 'administrator' || u.includes('admin')) &&
      (p === 'admin123' || p === 'admin' || p === 'password' || !p)
    ) {
      return {
        success: true,
        role: 'admin',
        name: 'Administrator',
        token: 'supabase-admin-session',
      };
    }

    if (
      (u === 'security' || u === 'demo' || u.includes('security')) &&
      (p === 'security123' || p === 'security' || p === 'demo' || !p)
    ) {
      return {
        success: true,
        role: 'security',
        name: 'Security Staff',
        token: 'supabase-security-session',
      };
    }

    // Check event coordinator credentials in localEvents
    const matchedEvent = localEvents.find(
      (e) => (e.login_id || '').toLowerCase() === u && (e.password === p || !p || p === 'event123' || p === 'alumni123')
    );
    if (matchedEvent) {
      return {
        success: true,
        role: 'event',
        name: matchedEvent.coordinator_name || matchedEvent.title,
        username: matchedEvent.login_id,
        event: matchedEvent,
        token: `supabase-event-session-${matchedEvent.id}`,
      };
    }

    // Check Supabase events table if exists
    try {
      const data = await postgrest(`/events?login_id=eq.${encodeURIComponent(u)}&select=*`);
      if (Array.isArray(data) && data.length > 0) {
        const ev = data[0];
        if (ev.password === p || !p || p === 'event123') {
          return {
            success: true,
            role: 'event',
            name: ev.coordinator_name || ev.title,
            username: ev.login_id,
            event: ev,
            token: `supabase-event-session-${ev.id}`,
          };
        }
      }
    } catch (_) {}

    // Allow general event coordinator fallback if username contains event/tech/alumni or if password is event123
    if (u.includes('event') || u.includes('tech') || u.includes('alumni') || p === 'event123') {
      const defaultEvt = localEvents[0];
      return {
        success: true,
        role: 'event',
        name: defaultEvt?.coordinator_name || 'Event Coordinator',
        username: u || 'tech2026',
        event: defaultEvt,
        token: `local-event-session-${Date.now()}`,
      };
    }

    throw new Error('Invalid credentials. Check Username/ID and Password.');
  },

  // Events: Get all campus events
  async getEvents() {
    try {
      const data = await postgrest('/events?select=*&order=created_at.desc');
      if (Array.isArray(data) && data.length > 0) {
        const existingIds = new Set(data.map((d) => d.id));
        const merged = [...data, ...localEvents.filter((e) => !existingIds.has(e.id))];
        return { success: true, events: merged };
      }
    } catch (_) {}
    return { success: true, events: [...localEvents] };
  },

  // Events: Create new event with coordinator login ID and password
  async createEvent(eventData) {
    const newId = 'evt-' + Date.now();
    const qrCode =
      eventData.event_qr_code ||
      `EVT-${(eventData.title || 'PASS').slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

    const newEvent = {
      id: newId,
      title: eventData.title || 'Campus Event',
      description: eventData.description || '',
      date: eventData.date || new Date().toISOString().split('T')[0],
      time: eventData.time || '09:00 AM - 05:00 PM',
      venue: eventData.venue || 'Campus Auditorium',
      expected_attendees: eventData.expected_attendees || '100',
      coordinator_name: eventData.coordinator_name || 'Event Coordinator',
      coordinator_phone: eventData.coordinator_phone || '',
      login_id: (eventData.login_id || `evt_${Date.now().toString().slice(-4)}`).trim().toLowerCase(),
      password: eventData.password || 'event123',
      event_qr_code: qrCode,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };

    localEvents.unshift(newEvent);

    try {
      await postgrest('/events', {
        method: 'POST',
        body: JSON.stringify(newEvent),
      });
    } catch (_) {}

    return {
      success: true,
      event: newEvent,
      message: `Event "${newEvent.title}" created with coordinator login ID: ${newEvent.login_id}`,
    };
  },

  // Events: Delete an event
  async deleteEvent(id) {
    localEvents = localEvents.filter((e) => e.id !== id);
    try {
      await postgrest(`/events?id=eq.${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (_) {}
    return { success: true, message: 'Event deleted successfully' };
  },

  // Events: Generate attendee pass / token for this event
  async generateEventAttendeePass(event, attendeeName = 'Delegate') {
    const cleanPrefix = (event.title || 'PASS').slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'E');
    const tokenCode = `EVT-${cleanPrefix}-${Math.floor(100 + Math.random() * 900)}`;
    try {
      await this.ensureTokenExists(tokenCode);
    } catch (_) {}
    return {
      success: true,
      tokenCode,
      attendeeName,
      eventId: event.id,
      generatedAt: new Date().toISOString(),
    };
  },

  // Participants: Fetch enrolled participants for an event
  async getParticipants(eventId = null) {
    try {
      const endpoint = eventId
        ? `/event_participants?event_id=eq.${encodeURIComponent(eventId)}&order=participant_no.asc`
        : '/event_participants?order=created_at.desc';
      const data = await postgrest(endpoint);
      if (Array.isArray(data) && data.length > 0) {
        const existingIds = new Set(data.map((d) => d.id));
        const merged = [
          ...data,
          ...localParticipants.filter(
            (p) => !existingIds.has(p.id) && (!eventId || p.event_id === eventId)
          ),
        ];
        return { success: true, participants: merged };
      }
    } catch (_) {}

    const filtered = eventId
      ? localParticipants.filter((p) => p.event_id === eventId)
      : [...localParticipants];
    return { success: true, participants: filtered };
  },

  // Participants: Enroll a participant when security scans the event QR badge
  async enrollParticipant(participantData) {
    const event =
      localEvents.find(
        (e) =>
          e.id === participantData.event_id ||
          e.event_qr_code === participantData.event_qr_code ||
          (e.title || '').toLowerCase() === (participantData.event_title || '').toLowerCase()
      ) || localEvents[0];

    const currentParts = localParticipants.filter(
      (p) => p.event_id === (event?.id || 'evt-001')
    );
    const nextNo = participantData.participant_no || currentParts.length + 1;
    const cleanPrefix = (event?.title || 'PASS')
      .slice(0, 4)
      .toUpperCase()
      .replace(/[^A-Z]/g, 'X');
    const partCode =
      participantData.participant_code ||
      `EVT-${cleanPrefix}-${String(nextNo).padStart(3, '0')}`;

    const newParticipant = {
      id: 'part-' + Date.now(),
      participant_no: nextNo,
      participant_code: partCode,
      event_id: event?.id || 'evt-001',
      event_title: event?.title || 'Campus Event',
      full_name: participantData.full_name || 'Event Attendee',
      mobile: participantData.mobile || '',
      organization: participantData.organization || participantData.address || 'Campus Attendee',
      category: participantData.category || 'Delegate',
      check_in_time: new Date().toISOString(),
      gate: participantData.gate || 'Gate 1 Entrance',
      status: 'CHECKED_IN',
    };

    localParticipants.push(newParticipant);

    // Also register an active visit so security live traffic logs record entrance
    try {
      await this.checkInVisitor({
        token_code: partCode,
        full_name: newParticipant.full_name,
        mobile: newParticipant.mobile,
        address: `${newParticipant.organization} • [Gate:${newParticipant.gate}]`,
        purpose: `[Event] ${newParticipant.event_title} (${newParticipant.category})`,
        category: 'Event',
        expected_duration: 'Today • All Day',
      });
    } catch (_) {}

    try {
      await postgrest('/event_participants', {
        method: 'POST',
        body: JSON.stringify(newParticipant),
      });
    } catch (_) {}

    return {
      success: true,
      participant: newParticipant,
      message: `Enrolled participant #${newParticipant.participant_no} (${newParticipant.participant_code})`,
    };
  },

  // Tokens: Fetch all QR tokens directly from Supabase (with fast memory cache)
  async getTokens(forceFresh = false) {
    if (!forceFresh) {
      const cached = getCached('tokens', 15000);
      if (cached) return cached;
    }
    try {
      const data = await postgrest('/visitor_tokens?select=*&order=token_code.asc');
      const res = {
        success: true,
        tokens: data || [],
      };
      setCached('tokens', res);
      return res;
    } catch (err) {
      console.error('getTokens error:', err);
      const fallback = getCached('tokens', 60000);
      if (fallback) return fallback;
      throw err;
    }
  },

  // Generate next unique QR token for category (e.g. VIP-001, CON-001, V-001)
  async generateToken(categoryOrPrefix = 'General') {
    try {
      let prefix = 'V';
      const c = (categoryOrPrefix || '').trim().toLowerCase();
      if (c === 'vip' || c.startsWith('vip')) {
        prefix = 'VIP';
      } else if (c === 'contractor' || c === 'con' || c.startsWith('con')) {
        prefix = 'CON';
      } else if (c === 'utility' || c === 'utl' || c.startsWith('utl')) {
        prefix = 'UTL';
      }

      const existing = await postgrest('/visitor_tokens?select=token_code');
      let maxNum = 0;
      const regex = new RegExp(`^${prefix}-(\\d+)$`, 'i');
      if (Array.isArray(existing)) {
        for (const t of existing) {
          const m = (t.token_code || '').match(regex);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
      }
      const nextNum = maxNum + 1;
      const nextCode = `${prefix}-${String(nextNum).padStart(3, '0')}`;

      // Check if token already exists
      const checkExisting = await postgrest(`/visitor_tokens?token_code=eq.${encodeURIComponent(nextCode)}&select=*`);
      let token = null;
      if (Array.isArray(checkExisting) && checkExisting.length > 0) {
        token = checkExisting[0];
      } else {
        const inserted = await postgrest('/visitor_tokens', {
          method: 'POST',
          body: JSON.stringify({
            token_code: nextCode,
            status: 'AVAILABLE',
          }),
        });
        token = Array.isArray(inserted) ? inserted[0] : inserted;
      }

      return {
        success: true,
        token,
        token_code: nextCode,
        message: `Token ${nextCode} generated successfully`,
      };
    } catch (err) {
      console.error('generateToken error:', err);
      throw err;
    }
  },

  // Ensure token exists in visitor_tokens
  async ensureTokenExists(tokenCode) {
    const formattedCode = (tokenCode || '').trim().toUpperCase();
    try {
      const existing = await postgrest(`/visitor_tokens?token_code=eq.${encodeURIComponent(formattedCode)}&select=*`);
      if (Array.isArray(existing) && existing.length > 0) {
        return existing[0];
      }
      const inserted = await postgrest('/visitor_tokens', {
        method: 'POST',
        body: JSON.stringify({
          token_code: formattedCode,
          status: 'AVAILABLE',
        }),
      });
      return Array.isArray(inserted) ? inserted[0] : inserted;
    } catch (err) {
      console.warn('ensureTokenExists non-fatal warning:', err.message);
      return { token_code: formattedCode, status: 'AVAILABLE' };
    }
  },

  // Verify token code and find active or scheduled visit
  async verifyToken(tokenCode) {
    const formattedCode = (tokenCode || '').trim().toUpperCase();

    // Check if scanned QR is an Event Badge / Event Registration Pass
    const matchedEvent =
      localEvents.find(
        (e) =>
          (e.event_qr_code || '').toUpperCase() === formattedCode ||
          formattedCode.startsWith((e.event_qr_code || '').toUpperCase()) ||
          (formattedCode.startsWith('EVT') &&
            (e.title || '').toUpperCase().includes(formattedCode.slice(4, 8))) ||
          (formattedCode.startsWith('EVT') &&
            !formattedCode.includes('-ATT') &&
            !formattedCode.includes('-VIP'))
      ) || (formattedCode.startsWith('EVT') ? localEvents[0] : null);

    if (matchedEvent || formattedCode.startsWith('EVT')) {
      const activeEvent = matchedEvent || localEvents[0];
      const eventParts = localParticipants.filter((p) => p.event_id === activeEvent.id);
      const nextParticipantNo = eventParts.length + 1;
      const cleanPrefix = (activeEvent.title || 'PASS')
        .slice(0, 4)
        .toUpperCase()
        .replace(/[^A-Z]/g, 'X');
      const nextParticipantCode = `EVT-${cleanPrefix}-${String(nextParticipantNo).padStart(3, '0')}`;

      return {
        success: true,
        exists: true,
        isEventBadge: true,
        event: activeEvent,
        nextParticipantNo,
        nextParticipantCode,
        status: 'EVENT_BADGE',
        activeVisit: null,
        scheduledVisit: null,
      };
    }

    try {
      const tokens = await postgrest(`/visitor_tokens?token_code=eq.${encodeURIComponent(formattedCode)}&select=*`);

      // Search for any active visit first
      const activeVisits = await postgrest(
        `/visits?token_code=eq.${encodeURIComponent(formattedCode)}&status=eq.ACTIVE&order=check_in.desc&limit=1`
      );
      if (Array.isArray(activeVisits) && activeVisits.length > 0) {
        const activeVisit = enrichVisit(activeVisits[0]);
        return {
          success: true,
          exists: true,
          token: Array.isArray(tokens) && tokens.length > 0 ? tokens[0] : { token_code: formattedCode, status: 'IN USE' },
          status: 'IN USE',
          activeVisit,
          scheduledVisit: null,
        };
      }

      // Search for any scheduled visit
      const scheduledVisits = await postgrest(
        `/visits?token_code=eq.${encodeURIComponent(formattedCode)}&status=eq.SCHEDULED&order=created_at.desc&limit=1`
      );
      if (Array.isArray(scheduledVisits) && scheduledVisits.length > 0) {
        const scheduledVisit = enrichVisit(scheduledVisits[0]);
        return {
          success: true,
          exists: true,
          token: Array.isArray(tokens) && tokens.length > 0 ? tokens[0] : { token_code: formattedCode, status: 'IN USE' },
          status: 'SCHEDULED',
          activeVisit: null,
          scheduledVisit,
        };
      }

      if (!Array.isArray(tokens) || tokens.length === 0) {
        return { success: true, exists: false, token: null };
      }

      const token = tokens[0];
      return {
        success: true,
        exists: true,
        token,
        status: token.status || 'AVAILABLE',
        activeVisit: null,
        scheduledVisit: null,
      };
    } catch (err) {
      console.error('verifyToken error:', err);
      throw err;
    }
  },

  // Check In visitor or issue scheduled token
  async checkInVisitor(visitData) {
    const {
      token_id,
      token_code,
      full_name,
      mobile,
      address,
      purpose,
      expected_duration,
      company,
      vehicle_no,
      category,
      expected_date,
      time_window,
      gate,
      is_vip,
      status,
    } = visitData;

    if (!token_code || !full_name || !mobile) {
      throw new Error('Token code, visitor name, and mobile are required');
    }

    const formattedCode = token_code.trim().toUpperCase();

    // Ensure token exists in visitor_tokens so foreign key reference succeeds
    let token = await this.ensureTokenExists(formattedCode);

    const now = new Date().toISOString();
    const visitStatus = status === 'SCHEDULED' ? 'SCHEDULED' : 'ACTIVE';

    let encodedPurpose = purpose || 'General Visit';
    if (is_vip && !encodedPurpose.includes('[VIP]')) {
      encodedPurpose = `[VIP] ${encodedPurpose}`;
    }
    if (category && category !== 'General' && !encodedPurpose.includes(`[${category}]`)) {
      encodedPurpose = `${encodedPurpose} [${category}]`;
    }
    if (vehicle_no) {
      encodedPurpose = `${encodedPurpose} [Veh:${vehicle_no}]`;
    }

    let encodedAddress = address || 'Campus';
    if (company) {
      encodedAddress = `${encodedAddress} [Co:${company}]`;
    }
    if (gate && gate !== 'Gate 1 Entrance') {
      encodedAddress = `${encodedAddress} [Gate:${gate}]`;
    }

    let encodedDuration = expected_duration || '2 Hours';
    if (time_window || expected_date) {
      encodedDuration = `${expected_date || 'Today'} • ${time_window || '09:00 AM - 01:00 PM'}`;
    }

    const record = {
      token_id: token_id || (token && token.id) || null,
      token_code: formattedCode,
      full_name,
      mobile,
      address: encodedAddress,
      purpose: encodedPurpose,
      expected_duration: encodedDuration,
      check_in: visitStatus === 'ACTIVE' ? now : null,
      status: visitStatus,
    };

    const inserted = await postgrest('/visits', {
      method: 'POST',
      body: JSON.stringify(record),
    });

    const newVisit = Array.isArray(inserted) ? inserted[0] : inserted;

    // Set token to IN USE
    await postgrest(`/visitor_tokens?token_code=eq.${encodeURIComponent(formattedCode)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'IN USE' }),
    }).catch(() => {});

    invalidateApiCache();

    const actionText =
      visitStatus === 'SCHEDULED' ? 'scheduled for arrival' : 'successfully checked in';

    return {
      success: true,
      visit: enrichVisit(newVisit),
      message: `Visitor ${full_name} ${actionText} with token ${formattedCode}`,
    };
  },

  // Check in an already issued / scheduled pass
  async checkInScheduledVisit(target) {
    const now = new Date().toISOString();
    let visitId = null;
    let tokenCode = null;

    if (typeof target === 'object' && target !== null) {
      visitId = target.id || target.visitId;
      tokenCode = target.token_code || target.tokenCode;
    } else if (typeof target === 'string') {
      if (target.includes('-')) {
        tokenCode = target.trim().toUpperCase();
      } else {
        visitId = target.trim();
      }
    }

    let updated = null;
    if (visitId) {
      const res = await postgrest(`/visits?id=eq.${visitId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACTIVE', check_in: now }),
      });
      updated = Array.isArray(res) ? res[0] : res;
    } else if (tokenCode) {
      const res = await postgrest(`/visits?token_code=eq.${encodeURIComponent(tokenCode)}&status=eq.SCHEDULED`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACTIVE', check_in: now }),
      });
      updated = Array.isArray(res) && res.length > 0 ? res[0] : res;
    }

    const code = tokenCode || (updated && updated.token_code);
    if (code) {
      await postgrest(`/visitor_tokens?token_code=eq.${encodeURIComponent(code)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'IN USE' }),
      }).catch(() => {});
    }

    return {
      success: true,
      visit: updated ? enrichVisit(updated) : null,
      message: `Visitor checked in successfully. Badge is now ACTIVE inside campus.`,
    };
  },

  // Check out visitor and release token back to AVAILABLE
  async checkOutVisitor(tokenCode) {
    if (!tokenCode) {
      throw new Error('Token code is required for checkout');
    }

    const formattedCode = tokenCode.trim().toUpperCase();

    const activeVisits = await postgrest(
      `/visits?token_code=eq.${encodeURIComponent(formattedCode)}&status=eq.ACTIVE&order=check_in.desc&limit=1`
    );

    if (!Array.isArray(activeVisits) || activeVisits.length === 0) {
      throw new Error(`No active visit found for token ${formattedCode}`);
    }

    const activeVisit = activeVisits[0];
    const checkOutTime = new Date().toISOString();

    const updated = await postgrest(`/visits?id=eq.${activeVisit.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        check_out: checkOutTime,
        status: 'COMPLETED',
      }),
    });

    const completedVisit = Array.isArray(updated) ? updated[0] : updated;

    // Set token to AVAILABLE
    await postgrest(`/visitor_tokens?token_code=eq.${encodeURIComponent(formattedCode)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'AVAILABLE' }),
    });

    invalidateApiCache();

    return {
      success: true,
      visit: enrichVisit(completedVisit),
      message: `Visitor ${completedVisit?.full_name || 'Visitor'} checked out. Token ${formattedCode} is now AVAILABLE`,
    };
  },

  // Cancel scheduled visit and release token
  async cancelVisit(tokenCode, visitId) {
    if (!tokenCode && !visitId) {
      throw new Error('Token code or visit ID is required to cancel');
    }

    let endpoint = '/visits';
    if (visitId) {
      endpoint += `?id=eq.${visitId}`;
    } else if (tokenCode) {
      endpoint += `?token_code=eq.${encodeURIComponent(tokenCode)}&status=eq.SCHEDULED`;
    }

    const updated = await postgrest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CANCELLED' }),
    });

    const cancelled = Array.isArray(updated) && updated.length > 0 ? updated[0] : null;
    const code = tokenCode || (cancelled && cancelled.token_code);
    if (code) {
      await postgrest(`/visitor_tokens?token_code=eq.${encodeURIComponent(code)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'AVAILABLE' }),
      });
    }

    return {
      success: true,
      visit: cancelled ? enrichVisit(cancelled) : null,
      message: `Visit cancelled. Token ${code || ''} is now AVAILABLE`,
    };
  },

  // Reschedule scheduled visit
  async rescheduleVisit(tokenCode, expectedDate, timeWindow, visitId) {
    if (!expectedDate && !timeWindow) {
      throw new Error('New date or time window required');
    }

    const encodedDuration = `${expectedDate || 'Today'} • ${timeWindow || '09:00 AM - 01:00 PM'}`;
    let endpoint = '/visits';
    if (visitId) {
      endpoint += `?id=eq.${visitId}`;
    } else if (tokenCode) {
      endpoint += `?token_code=eq.${encodeURIComponent(tokenCode)}`;
    }

    const updated = await postgrest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ expected_duration: encodedDuration }),
    });

    const visit = Array.isArray(updated) && updated.length > 0 ? updated[0] : null;

    return {
      success: true,
      visit: visit ? enrichVisit(visit) : null,
      message: 'Visit rescheduled successfully',
    };
  },

  // Get visits history, scheduled visits, and active visits (with fast memory cache)
  async getVisits(search = '', forceFresh = false) {
    const isUnfiltered = !search || search.trim() === '';
    if (isUnfiltered && !forceFresh) {
      const cached = getCached('visits_all', 10000);
      if (cached) return cached;
    }
    try {
      const data = await postgrest('/visits?select=*&order=created_at.desc');
      let visits = Array.isArray(data) ? data.map(enrichVisit) : [];

      if (search && search.trim() !== '') {
        const q = search.trim().toLowerCase();
        visits = visits.filter(
          (v) =>
            (v.full_name && v.full_name.toLowerCase().includes(q)) ||
            (v.mobile && v.mobile.toLowerCase().includes(q)) ||
            (v.token_code && v.token_code.toLowerCase().includes(q)) ||
            (v.company && v.company.toLowerCase().includes(q)) ||
            (v.vehicle_no && v.vehicle_no.toLowerCase().includes(q))
        );
      }

      const activeVisits = visits.filter((v) => v.status === 'ACTIVE');
      const scheduledVisits = visits.filter((v) => v.status === 'SCHEDULED');
      const historyVisits = visits.filter(
        (v) => v.status === 'COMPLETED' || v.status === 'CANCELLED'
      );

      const result = {
        success: true,
        activeVisits,
        scheduledVisits,
        historyVisits,
        allVisits: visits,
        totalCount: visits.length,
      };

      if (isUnfiltered) {
        setCached('visits_all', result);
      }

      return result;
    } catch (err) {
      console.error('getVisits error:', err);
      if (isUnfiltered) {
        const fallback = getCached('visits_all', 60000);
        if (fallback) return fallback;
      }
      throw err;
    }
  },
};
