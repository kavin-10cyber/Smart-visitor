const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

let supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (process.env.SUPABASE_ANON_KEY || '').trim();

let supabase = null;
let isUsingSupabase = false;

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    isUsingSupabase = true;
    console.log('✅ Connected to Supabase PostgreSQL Database');
  } catch (err) {
    console.warn('⚠️ Could not initialize Supabase client:', err.message);
  }
}

if (!isUsingSupabase) {
  console.log('ℹ️ Running backend with built-in persistent storage fallback (No Supabase keys configured).');
}

// Data persistence file path for zero-config fallback mode
const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'local_db.json');

function loadLocalData() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading local db file:', e);
    }
  }
  return {
    visitor_tokens: [
      { id: '1', token_code: 'V-001', status: 'AVAILABLE', created_at: new Date().toISOString() },
      { id: '2', token_code: 'V-002', status: 'AVAILABLE', created_at: new Date().toISOString() }
    ],
    visits: []
  };
}

let localDb = loadLocalData();

function saveLocalData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(localDb, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing local db file:', e);
  }
}

// Helper to enrich visits with structured metadata
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
    is_vip: !!is_vip
  };
}

// Database helper methods abstraction
const db = {
  isUsingSupabase,

  // Get all tokens
  async getTokens() {
    if (isUsingSupabase) {
      const { data, error } = await supabase
        .from('visitor_tokens')
        .select('*')
        .order('token_code', { ascending: true });
      if (error) throw error;
      return data || [];
    } else {
      return [...localDb.visitor_tokens].sort((a, b) => a.token_code.localeCompare(b.token_code));
    }
  },

  // Lookup token by code
  async getTokenByCode(tokenCode) {
    if (isUsingSupabase) {
      const { data, error } = await supabase
        .from('visitor_tokens')
        .select('*')
        .eq('token_code', tokenCode)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } else {
      return localDb.visitor_tokens.find(t => t.token_code.toLowerCase() === tokenCode.toLowerCase()) || null;
    }
  },

  // Create new token
  async createToken(tokenCode) {
    if (isUsingSupabase) {
      const { data, error } = await supabase
        .from('visitor_tokens')
        .insert([{ token_code: tokenCode, status: 'AVAILABLE' }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const newToken = {
        id: String(Date.now()),
        token_code: tokenCode,
        status: 'AVAILABLE',
        created_at: new Date().toISOString()
      };
      localDb.visitor_tokens.push(newToken);
      saveLocalData();
      return newToken;
    }
  },

  // Update token status
  async updateTokenStatus(tokenCode, status) {
    if (isUsingSupabase) {
      const { data, error } = await supabase
        .from('visitor_tokens')
        .update({ status })
        .eq('token_code', tokenCode)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const token = localDb.visitor_tokens.find(t => t.token_code.toLowerCase() === tokenCode.toLowerCase());
      if (token) {
        token.status = status;
        saveLocalData();
      }
      return token;
    }
  },

  // Get active visit for a token
  async getActiveVisitByToken(tokenCode) {
    if (isUsingSupabase) {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('token_code', tokenCode)
        .eq('status', 'ACTIVE')
        .order('check_in', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data && data.length > 0 ? enrichVisit(data[0]) : null;
    } else {
      const v = localDb.visits.find(v => v.token_code.toLowerCase() === tokenCode.toLowerCase() && v.status === 'ACTIVE');
      return v ? enrichVisit(v) : null;
    }
  },

  // Create check-in or scheduled visit record
  async createVisit(visitData) {
    const {
      token_id, token_code, full_name, mobile, address, purpose, expected_duration,
      company, vehicle_no, category, expected_date, time_window, gate, is_vip, status
    } = visitData;
    const now = new Date().toISOString();
    const visitStatus = status || 'ACTIVE';

    let existingToken = await this.getTokenByCode(token_code);
    if (!existingToken) {
      existingToken = await this.createToken(token_code);
    }

    if (isUsingSupabase) {
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
        token_id: token_id || null,
        token_code,
        full_name,
        mobile,
        address: encodedAddress,
        purpose: encodedPurpose,
        expected_duration: encodedDuration,
        check_in: visitStatus === 'ACTIVE' ? now : null,
        status: visitStatus
      };

      const { data, error } = await supabase
        .from('visits')
        .insert([record])
        .select()
        .single();
      if (error) throw error;

      await this.updateTokenStatus(token_code, 'IN USE');
      return enrichVisit(data);
    } else {
      const newVisit = {
        id: String(Date.now()),
        token_id: token_id || null,
        token_code,
        full_name,
        mobile,
        address: address || 'Campus',
        purpose: purpose || 'General Visit',
        expected_duration: expected_duration || '2 Hours',
        company: company || '',
        vehicle_no: vehicle_no || '',
        category: category || 'General',
        expected_date: expected_date || new Date().toISOString().split('T')[0],
        time_window: time_window || '09:00 AM - 01:00 PM',
        gate: gate || 'Gate 1 Entrance',
        is_vip: !!is_vip,
        check_in: visitStatus === 'ACTIVE' ? now : null,
        check_out: null,
        status: visitStatus,
        created_at: now
      };
      localDb.visits.push(newVisit);
      await this.updateTokenStatus(token_code, 'IN USE');
      saveLocalData();
      return enrichVisit(newVisit);
    }
  },

  // Cancel scheduled visit and release token
  async cancelVisit(visitId, tokenCode) {
    if (isUsingSupabase) {
      let query = supabase.from('visits').update({ status: 'CANCELLED' });
      if (visitId) query = query.eq('id', visitId);
      else if (tokenCode) query = query.eq('token_code', tokenCode).eq('status', 'SCHEDULED');
      const { data, error } = await query.select();
      if (error) throw error;
      const cancelled = data && data.length > 0 ? data[0] : null;
      const code = tokenCode || (cancelled && cancelled.token_code);
      if (code) await this.updateTokenStatus(code, 'AVAILABLE');
      return cancelled ? enrichVisit(cancelled) : null;
    } else {
      const visit = localDb.visits.find(v => (visitId && v.id === String(visitId)) || (tokenCode && v.token_code.toLowerCase() === tokenCode.toLowerCase() && v.status === 'SCHEDULED'));
      if (visit) {
        visit.status = 'CANCELLED';
      }
      const code = tokenCode || (visit && visit.token_code);
      if (code) await this.updateTokenStatus(code, 'AVAILABLE');
      saveLocalData();
      return visit ? enrichVisit(visit) : null;
    }
  },

  // Reschedule visit (update date / time window)
  async rescheduleVisit(visitId, tokenCode, { expected_date, time_window }) {
    const encodedDuration = `${expected_date || 'Today'} • ${time_window || '09:00 AM - 01:00 PM'}`;
    if (isUsingSupabase) {
      let query = supabase.from('visits').update({ expected_duration: encodedDuration });
      if (visitId) query = query.eq('id', visitId);
      else if (tokenCode) query = query.eq('token_code', tokenCode);
      const { data, error } = await query.select();
      if (error) throw error;
      const updated = data && data.length > 0 ? data[0] : null;
      return updated ? enrichVisit(updated) : null;
    } else {
      const visit = localDb.visits.find(v => (visitId && v.id === String(visitId)) || (tokenCode && v.token_code.toLowerCase() === tokenCode.toLowerCase()));
      if (visit) {
        visit.expected_duration = encodedDuration;
        if (expected_date) visit.expected_date = expected_date;
        if (time_window) visit.time_window = time_window;
      }
      saveLocalData();
      return visit ? enrichVisit(visit) : null;
    }
  },

  // Check in scheduled visit
  async checkInScheduledVisit(visitId, tokenCode) {
    const checkInTime = new Date().toISOString();
    if (isUsingSupabase) {
      let query = supabase.from('visits').update({ status: 'ACTIVE', check_in: checkInTime });
      if (visitId) query = query.eq('id', visitId);
      else if (tokenCode) query = query.eq('token_code', tokenCode).eq('status', 'SCHEDULED');
      const { data, error } = await query.select();
      if (error) throw error;
      const checkedIn = data && data.length > 0 ? data[0] : null;
      const code = tokenCode || (checkedIn && checkedIn.token_code);
      if (code) await this.updateTokenStatus(code, 'IN USE');
      return checkedIn ? enrichVisit(checkedIn) : null;
    } else {
      const visit = localDb.visits.find(v => (visitId && v.id === String(visitId)) || (tokenCode && v.token_code.toLowerCase() === tokenCode.toLowerCase() && v.status === 'SCHEDULED'));
      if (visit) {
        visit.status = 'ACTIVE';
        visit.check_in = checkInTime;
      }
      const code = tokenCode || (visit && visit.token_code);
      if (code) await this.updateTokenStatus(code, 'IN USE');
      saveLocalData();
      return visit ? enrichVisit(visit) : null;
    }
  },

  // Complete visit (Check out)
  async completeVisit(visitId, tokenCode) {
    const checkOutTime = new Date().toISOString();

    if (isUsingSupabase) {
      const { data, error } = await supabase
        .from('visits')
        .update({
          check_out: checkOutTime,
          status: 'COMPLETED'
        })
        .eq('id', visitId)
        .select()
        .single();
      if (error) throw error;

      await this.updateTokenStatus(tokenCode, 'AVAILABLE');
      return enrichVisit(data);
    } else {
      const visit = localDb.visits.find(v => v.id === visitId);
      if (visit) {
        visit.check_out = checkOutTime;
        visit.status = 'COMPLETED';
      }
      await this.updateTokenStatus(tokenCode, 'AVAILABLE');
      saveLocalData();
      return visit ? enrichVisit(visit) : null;
    }
  },

  // Get all visits (current active, scheduled, and completed history)
  async getVisits(searchQuery = '') {
    let visits = [];
    if (isUsingSupabase) {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      visits = (data || []).map(enrichVisit);
    } else {
      visits = [...localDb.visits].sort((a, b) => new Date(b.created_at || b.check_in) - new Date(a.created_at || a.check_in)).map(enrichVisit);
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      visits = visits.filter(v =>
        (v.full_name && v.full_name.toLowerCase().includes(q)) ||
        (v.mobile && v.mobile.toLowerCase().includes(q)) ||
        (v.token_code && v.token_code.toLowerCase().includes(q)) ||
        (v.company && v.company.toLowerCase().includes(q)) ||
        (v.vehicle_no && v.vehicle_no.toLowerCase().includes(q))
      );
    }

    return visits;
  }
};

module.exports = db;
