const db = require('../config/db');

// Check in visitor
exports.checkIn = async (req, res) => {
  try {
    const { token_code, full_name, mobile, address, purpose, expected_duration } = req.body;

    if (!token_code || !full_name || !mobile || !address || !purpose || !expected_duration) {
      return res.status(400).json({ success: false, message: 'All visitor fields are required' });
    }

    const formattedCode = token_code.trim().toUpperCase();
    const token = await db.getTokenByCode(formattedCode);

    if (!token) {
      return res.status(404).json({ success: false, message: `Invalid Token ID ${formattedCode}` });
    }

    if (token.status === 'IN USE') {
      return res.status(400).json({ success: false, message: `Token ${formattedCode} is currently IN USE` });
    }

    const visit = await db.createVisit({
      token_id: token.id,
      token_code: formattedCode,
      full_name,
      mobile,
      address,
      purpose,
      expected_duration
    });

    res.json({
      success: true,
      visit,
      message: `Visitor ${full_name} successfully checked in with token ${formattedCode}`
    });
  } catch (err) {
    console.error('Error checking in visitor:', err);
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

// Get visits history & active visits
exports.getVisits = async (req, res) => {
  try {
    const search = req.query.search || '';
    const allVisits = await db.getVisits(search);

    const activeVisits = allVisits.filter(v => v.status === 'ACTIVE');
    const historyVisits = allVisits.filter(v => v.status === 'COMPLETED');

    res.json({
      success: true,
      activeVisits,
      historyVisits,
      totalCount: allVisits.length
    });
  } catch (err) {
    console.error('Error fetching visits:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
