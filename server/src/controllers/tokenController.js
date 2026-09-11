const db = require('../config/db');

// Get all badge tokens
exports.getTokens = async (req, res) => {
  try {
    const tokens = await db.getTokens();
    res.json({ success: true, tokens });
  } catch (err) {
    console.error('Error fetching tokens:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Generate next unique QR token (e.g., V-001, V-002)
exports.generateToken = async (req, res) => {
  try {
    const tokens = await db.getTokens();

    let maxNumber = 0;
    tokens.forEach(t => {
      const match = t.token_code.match(/^V-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });

    const nextNumber = maxNumber + 1;
    const nextCode = `V-${String(nextNumber).padStart(3, '0')}`;

    const existing = await db.getTokenByCode(nextCode);
    if (existing) {
      return res.status(400).json({ success: false, message: `Token ${nextCode} already exists` });
    }

    const newDbToken = await db.createToken(nextCode);
    res.json({
      success: true,
      token: newDbToken,
      message: `Generated QR Token ${nextCode}`
    });
  } catch (err) {
    console.error('Error generating token:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Scan and verify token status
exports.verifyToken = async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const token = await db.getTokenByCode(code);

    if (!token) {
      return res.json({
        success: true,
        exists: false,
        tokenCode: code,
        message: 'Token does not exist'
      });
    }

    if (token.status === 'IN USE') {
      const activeVisit = await db.getActiveVisitByToken(token.token_code);
      return res.json({
        success: true,
        exists: true,
        token,
        status: 'IN USE',
        activeVisit
      });
    }

    return res.json({
      success: true,
      exists: true,
      token,
      status: 'AVAILABLE'
    });
  } catch (err) {
    console.error('Error verifying token:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
