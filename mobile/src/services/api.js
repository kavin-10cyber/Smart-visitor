import { supabase } from './supabaseClient.js';
import { SUPABASE_URL } from '../constants/config.js';

// Helper to enrich visits with structured metadata tags
function enrichVisit(v) {
  if (!v) return v;
  const is_vip = v.is_vip !== undefined ? v.is_vip : !!(v.purpose && v.purpose.includes('[VIP]'));

  let category = v.category;
  if (!category) {
    if (is_vip) category = 'VIP';
    else if (
      v.purpose &&
      (v.purpose.includes('[Contractor]') ||
        v.purpose.toLowerCase().includes('contract') ||
        v.purpose.toLowerCase().includes('atm'))
    )
      category = 'Contractor';
    else if (
      v.purpose &&
      (v.purpose.includes('[Utility]') ||
        v.purpose.toLowerCase().includes('utility') ||
        v.purpose.toLowerCase().includes('maintenance'))
    )
      category = 'Utility';
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
  const cleanPurpose = v.purpose
    ? v.purpose.replace(/\[VIP\]\s*/g, '').replace(/\s*\[(Contractor|Utility|Veh):.*?\]/g, '').trim()
    : '';

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

export function setApiBaseUrl(url) {
  // Retained for backwards-compatibility with settings UI
  console.log('Direct Supabase cloud connected:', SUPABASE_URL);
}

export function getApiBaseUrl() {
  return SUPABASE_URL;
}

export function getDownloadUrl(tokenCode) {
  const code = encodeURIComponent((tokenCode || '').trim().toUpperCase());
  return `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${code}`;
}

export function getBadgeUrl(tokenCode) {
  const code = (tokenCode || '').trim().toUpperCase();
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(code)}`;
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Badge - ${code}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .card { background: white; padding: 32px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); text-align: center; max-width: 360px; width: 88%; border: 2px solid #e2e8f0; }
    .org { font-size: 13px; font-weight: 800; color: #64748b; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
    .title { font-size: 22px; font-weight: 900; color: #0f172a; margin-bottom: 12px; }
    .qr-img { width: 220px; height: 220px; border-radius: 12px; border: 2px solid #e2e8f0; padding: 8px; margin: 12px auto; display: block; }
    .token-code { font-size: 32px; font-weight: 900; color: #2563eb; letter-spacing: 2px; margin: 8px 0; }
    .badge-status { display: inline-block; padding: 6px 18px; border-radius: 20px; font-size: 13px; font-weight: 800; background: #dcfce7; color: #166534; margin-bottom: 16px; }
    .instructions { font-size: 12px; color: #64748b; margin-top: 14px; line-height: 1.6; border-top: 1px dashed #cbd5e1; padding-top: 14px; }
    .actions { margin-top: 24px; display: flex; gap: 12px; justify-content: center; }
    .btn { padding: 12px 20px; border-radius: 10px; border: none; font-weight: 700; font-size: 14px; cursor: pointer; text-decoration: none; display: inline-block; }
    .btn-print { background: #2563eb; color: white; }
    @media print {
      body { background: white; }
      .actions { display: none; }
      .card { box-shadow: none; border: 2px solid #000; width: 100%; max-width: 400px; }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="org">Smart Campus</div>
    <div class="title">VISITOR PASS BADGE</div>
    <div class="token-code">${code}</div>
    <img src="${qrUrl}" class="qr-img" alt="QR Code ${code}" />
    <div><span class="badge-status">REUSABLE BADGE</span></div>
    <div class="instructions">
      Please wear this pass at all times inside campus.<br/>
      Return badge to security gate upon departure.
    </div>
    <div class="actions">
      <button class="btn btn-print" onclick="window.print()">🖨️ Print Badge</button>
    </div>
  </div>
</body>
</html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

export const api = {
  setBaseUrl: setApiBaseUrl,
  getBaseUrl: getApiBaseUrl,

  // Auth: Instant client authentication for Admin and Security
  async login(username, password) {
    const u = (username || '').trim().toLowerCase();
    const p = (password || '').trim();

    if (u === 'admin' && p === 'admin123') {
      return {
        success: true,
        role: 'admin',
        name: 'System Admin',
        token: 'supabase-admin-session',
      };
    }

    if (u === 'security' && p === 'security123') {
      return {
        success: true,
        role: 'security',
        name: 'Security Officer',
        token: 'supabase-security-session',
      };
    }

    throw new Error('Invalid username or password');
  },

  // Tokens: Fetch all QR tokens from Supabase directly
  async getTokens() {
    const { data, error } = await supabase
      .from('visitor_tokens')
      .select('*')
      .order('token_code', { ascending: true });

    if (error) {
      console.error('Supabase getTokens error:', error);
      throw new Error(error.message || 'Failed to fetch tokens');
    }

    return {
      success: true,
      tokens: data || [],
    };
  },

  // Generate next unique QR token in sequence (e.g., V-001, V-002, ...)
  async generateToken() {
    const { data: tokens, error: fetchErr } = await supabase
      .from('visitor_tokens')
      .select('token_code');

    if (fetchErr) {
      console.error('Supabase fetch tokens error:', fetchErr);
      throw new Error(fetchErr.message || 'Failed to check tokens');
    }

    let maxNumber = 0;
    (tokens || []).forEach((t) => {
      const match = (t.token_code || '').match(/^V-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const nextNumber = maxNumber + 1;
    const nextCode = `V-${String(nextNumber).padStart(3, '0')}`;

    const { data: newToken, error: insertErr } = await supabase
      .from('visitor_tokens')
      .insert([{ token_code: nextCode, status: 'AVAILABLE' }])
      .select()
      .single();

    if (insertErr) {
      console.error('Supabase insert token error:', insertErr);
      throw new Error(insertErr.message || 'Failed to create token');
    }

    return {
      success: true,
      token: newToken,
      message: `Generated QR Token ${nextCode}`,
    };
  },

  // Verify token code and find whether an active visit is linked to it
  async verifyToken(tokenCode) {
    const code = (tokenCode || '').trim().toUpperCase();

    const { data: token, error } = await supabase
      .from('visitor_tokens')
      .select('*')
      .eq('token_code', code)
      .maybeSingle();

    if (error) {
      console.error('Supabase verifyToken error:', error);
      throw new Error(error.message || 'Failed to verify token');
    }

    if (!token) {
      return {
        success: true,
        exists: false,
        tokenCode: code,
        message: 'Token does not exist',
      };
    }

    if (token.status === 'IN USE') {
      const { data: activeVisits, error: visitErr } = await supabase
        .from('visits')
        .select('*')
        .eq('token_code', token.token_code)
        .eq('status', 'ACTIVE')
        .order('check_in', { ascending: false })
        .limit(1);

      if (visitErr) {
        console.error('Supabase getActiveVisit error:', visitErr);
      }

      const activeVisit =
        activeVisits && activeVisits.length > 0 ? enrichVisit(activeVisits[0]) : null;

      return {
        success: true,
        exists: true,
        token,
        status: 'IN USE',
        activeVisit,
      };
    }

    return {
      success: true,
      exists: true,
      token,
      status: 'AVAILABLE',
    };
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

    // Verify token existence
    const { data: token, error: tokenErr } = await supabase
      .from('visitor_tokens')
      .select('*')
      .eq('token_code', formattedCode)
      .maybeSingle();

    if (tokenErr || !token) {
      throw new Error(`Invalid Token ID ${formattedCode}`);
    }

    if (token.status === 'IN USE') {
      throw new Error(`Token ${formattedCode} is currently IN USE`);
    }

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
      token_id: token_id || token.id || null,
      token_code: formattedCode,
      full_name,
      mobile,
      address: encodedAddress,
      purpose: encodedPurpose,
      expected_duration: encodedDuration,
      check_in: visitStatus === 'ACTIVE' ? now : null,
      status: visitStatus,
    };

    const { data: newVisit, error: insertErr } = await supabase
      .from('visits')
      .insert([record])
      .select()
      .single();

    if (insertErr) {
      console.error('Supabase check-in error:', insertErr);
      throw new Error(insertErr.message || 'Failed to record check-in');
    }

    // Set token to IN USE
    await supabase
      .from('visitor_tokens')
      .update({ status: 'IN USE' })
      .eq('token_code', formattedCode);

    const actionText =
      visitStatus === 'SCHEDULED' ? 'scheduled for arrival' : 'successfully checked in';

    return {
      success: true,
      visit: enrichVisit(newVisit),
      message: `Visitor ${full_name} ${actionText} with token ${formattedCode}`,
    };
  },

  // Check out visitor and release token
  async checkOutVisitor(tokenCode) {
    if (!tokenCode) {
      throw new Error('Token code is required for checkout');
    }

    const formattedCode = tokenCode.trim().toUpperCase();

    const { data: activeVisits, error: visitErr } = await supabase
      .from('visits')
      .select('*')
      .eq('token_code', formattedCode)
      .eq('status', 'ACTIVE')
      .order('check_in', { ascending: false })
      .limit(1);

    if (visitErr) {
      throw new Error(visitErr.message || 'Failed to search active visit');
    }

    if (!activeVisits || activeVisits.length === 0) {
      throw new Error(`No active visit found for token ${formattedCode}`);
    }

    const activeVisit = activeVisits[0];
    const checkOutTime = new Date().toISOString();

    const { data: completedVisit, error: updateErr } = await supabase
      .from('visits')
      .update({
        check_out: checkOutTime,
        status: 'COMPLETED',
      })
      .eq('id', activeVisit.id)
      .select()
      .single();

    if (updateErr) {
      throw new Error(updateErr.message || 'Failed to update checkout');
    }

    // Set token to AVAILABLE
    await supabase
      .from('visitor_tokens')
      .update({ status: 'AVAILABLE' })
      .eq('token_code', formattedCode);

    return {
      success: true,
      visit: enrichVisit(completedVisit),
      message: `Visitor ${completedVisit.full_name} checked out. Token ${formattedCode} is now AVAILABLE`,
    };
  },

  // Cancel scheduled visit and release token
  async cancelVisit(tokenCode, visitId) {
    if (!tokenCode && !visitId) {
      throw new Error('Token code or visit ID is required to cancel');
    }

    let query = supabase.from('visits').update({ status: 'CANCELLED' });
    if (visitId) {
      query = query.eq('id', visitId);
    } else if (tokenCode) {
      query = query.eq('token_code', tokenCode).eq('status', 'SCHEDULED');
    }

    const { data, error } = await query.select();
    if (error) {
      throw new Error(error.message || 'Failed to cancel visit');
    }

    const cancelled = data && data.length > 0 ? data[0] : null;
    const code = tokenCode || (cancelled && cancelled.token_code);
    if (code) {
      await supabase
        .from('visitor_tokens')
        .update({ status: 'AVAILABLE' })
        .eq('token_code', code);
    }

    return {
      success: true,
      visit: cancelled ? enrichVisit(cancelled) : null,
      message: `Visit cancelled. Token ${code || ''} is now AVAILABLE`,
    };
  },

  // Reschedule visit
  async rescheduleVisit(tokenCode, expectedDate, timeWindow, visitId) {
    if (!expectedDate && !timeWindow) {
      throw new Error('New date or time window required');
    }

    const encodedDuration = `${expectedDate || 'Today'} • ${timeWindow || '09:00 AM - 01:00 PM'}`;
    let query = supabase.from('visits').update({ expected_duration: encodedDuration });

    if (visitId) {
      query = query.eq('id', visitId);
    } else if (tokenCode) {
      query = query.eq('token_code', tokenCode);
    }

    const { data, error } = await query.select();
    if (error) {
      throw new Error(error.message || 'Failed to reschedule visit');
    }

    const updated = data && data.length > 0 ? data[0] : null;

    return {
      success: true,
      visit: updated ? enrichVisit(updated) : null,
      message: 'Visit rescheduled successfully',
    };
  },

  // Get visits history, scheduled visits, and active visits
  async getVisits(search = '') {
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase getVisits error:', error);
      throw new Error(error.message || 'Failed to fetch visits');
    }

    let visits = (data || []).map(enrichVisit);

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

    return {
      success: true,
      activeVisits,
      scheduledVisits,
      historyVisits,
      allVisits: visits,
      totalCount: visits.length,
    };
  },
};
