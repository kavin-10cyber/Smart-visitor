const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

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
      return data && data.length > 0 ? data[0] : null;
    } else {
      return localDb.visits.find(v => v.token_code.toLowerCase() === tokenCode.toLowerCase() && v.status === 'ACTIVE') || null;
    }
  },

  // Create check-in visit record
  async createVisit(visitData) {
    const { token_id, token_code, full_name, mobile, address, purpose, expected_duration } = visitData;
    const now = new Date().toISOString();

    if (isUsingSupabase) {
      const { data, error } = await supabase
        .from('visits')
        .insert([{
          token_id: token_id || null,
          token_code,
          full_name,
          mobile,
          address,
          purpose,
          expected_duration,
          check_in: now,
          status: 'ACTIVE'
        }])
        .select()
        .single();
      if (error) throw error;
      
      // Update token status to IN USE
      await this.updateTokenStatus(token_code, 'IN USE');
      return data;
    } else {
      const newVisit = {
        id: String(Date.now()),
        token_id: token_id || null,
        token_code,
        full_name,
        mobile,
        address,
        purpose,
        expected_duration,
        check_in: now,
        check_out: null,
        status: 'ACTIVE',
        created_at: now
      };
      localDb.visits.push(newVisit);
      await this.updateTokenStatus(token_code, 'IN USE');
      saveLocalData();
      return newVisit;
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

      // Update token status to AVAILABLE
      await this.updateTokenStatus(tokenCode, 'AVAILABLE');
      return data;
    } else {
      const visit = localDb.visits.find(v => v.id === visitId);
      if (visit) {
        visit.check_out = checkOutTime;
        visit.status = 'COMPLETED';
      }
      await this.updateTokenStatus(tokenCode, 'AVAILABLE');
      saveLocalData();
      return visit;
    }
  },

  // Get all visits (current active and completed history)
  async getVisits(searchQuery = '') {
    let visits = [];
    if (isUsingSupabase) {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .order('check_in', { ascending: false });
      if (error) throw error;
      visits = data || [];
    } else {
      visits = [...localDb.visits].sort((a, b) => new Date(b.check_in) - new Date(a.check_in));
    }

    if (searchQuery && searchQuery.trim() !== '') {
      const q = searchQuery.trim().toLowerCase();
      visits = visits.filter(v =>
        (v.full_name && v.full_name.toLowerCase().includes(q)) ||
        (v.mobile && v.mobile.toLowerCase().includes(q)) ||
        (v.token_code && v.token_code.toLowerCase().includes(q))
      );
    }

    return visits;
  }
};

module.exports = db;
