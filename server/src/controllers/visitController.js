const db = require('../config/db');

// Check in visitor or issue scheduled token
exports.checkIn = async (req, res) => {
  try {
    const {
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
      status
    } = req.body;

    if (!token_code || !full_name || !mobile) {
      return res.status(400).json({ success: false, message: 'Token code, visitor name, and mobile are required' });
    }

    const formattedCode = token_code.trim().toUpperCase();
    const token = await db.getTokenByCode(formattedCode);

    if (!token) {
      return res.status(404).json({ success: false, message: `Invalid Token ID ${formattedCode}` });
    }

    if (token.status === 'IN USE') {
      return res.status(400).json({ success: false, message: `Token ${formattedCode} is currently IN USE` });
    }

    const visitStatus = status === 'SCHEDULED' ? 'SCHEDULED' : 'ACTIVE';

    const visit = await db.createVisit({
      token_id: token.id,
      token_code: formattedCode,
      full_name,
      mobile,
      address: address || 'Campus',
      purpose: purpose || 'General Visit',
      expected_duration: expected_duration || '2 Hours',
      company,
      vehicle_no,
      category: category || (is_vip ? 'VIP' : 'General'),
      expected_date,
      time_window,
      gate: gate || 'Gate 1 Entrance',
      is_vip: !!is_vip,
      status: visitStatus
    });

    const actionText = visitStatus === 'SCHEDULED' ? 'scheduled for arrival' : 'successfully checked in';

    res.json({
      success: true,
      visit,
      message: `Visitor ${full_name} ${actionText} with token ${formattedCode}`
    });
  } catch (err) {
    console.error('Error in checkIn / issue token:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Cancel scheduled visit & release token
exports.cancelVisit = async (req, res) => {
  try {
    const { token_code, visit_id } = req.body;
    if (!token_code && !visit_id) {
      return res.status(400).json({ success: false, message: 'Token code or visit ID is required to cancel' });
    }

    const cancelled = await db.cancelVisit(visit_id, token_code);
    res.json({
      success: true,
      visit: cancelled,
      message: `Visit cancelled. Token ${token_code || (cancelled && cancelled.token_code)} is now AVAILABLE`
    });
  } catch (err) {
    console.error('Error cancelling visit:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Reschedule scheduled visit
exports.rescheduleVisit = async (req, res) => {
  try {
    const { token_code, visit_id, expected_date, time_window } = req.body;
    if (!expected_date && !time_window) {
      return res.status(400).json({ success: false, message: 'New date or time window required' });
    }

    const rescheduled = await db.rescheduleVisit(visit_id, token_code, { expected_date, time_window });
    res.json({
      success: true,
      visit: rescheduled,
      message: 'Visit rescheduled successfully'
    });
  } catch (err) {
    console.error('Error rescheduling visit:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Check out visitor
exports.checkOut = async (req, res) => {
  try {
    const { token_code } = req.body;

    if (!token_code) {
      return res.status(400).json({ success: false, message: 'Token code is required for checkout' });
    }

    const formattedCode = token_code.trim().toUpperCase();
    const activeVisit = await db.getActiveVisitByToken(formattedCode);

    if (!activeVisit) {
      return res.status(404).json({ success: false, message: `No active visit found for token ${formattedCode}` });
    }

    const completedVisit = await db.completeVisit(activeVisit.id, formattedCode);

    res.json({
      success: true,
      visit: completedVisit,
      message: `Visitor ${completedVisit.full_name} checked out. Token ${formattedCode} is now AVAILABLE`
    });
  } catch (err) {
    console.error('Error checking out visitor:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get visits history, scheduled visits & active visits
exports.getVisits = async (req, res) => {
  try {
    const search = req.query.search || '';
    const allVisits = await db.getVisits(search);

    const activeVisits = allVisits.filter(v => v.status === 'ACTIVE');
    const scheduledVisits = allVisits.filter(v => v.status === 'SCHEDULED');
    const historyVisits = allVisits.filter(v => v.status === 'COMPLETED' || v.status === 'CANCELLED');

    res.json({
      success: true,
      activeVisits,
      scheduledVisits,
      historyVisits,
      allVisits,
      totalCount: allVisits.length
    });
  } catch (err) {
    console.error('Error fetching visits:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
