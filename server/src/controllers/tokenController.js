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

// Download direct high-resolution PNG of the QR Code
exports.downloadTokenQR = async (req, res) => {
  try {
    const QRCode = require('qrcode');
    const code = req.params.code.trim().toUpperCase();

    const buffer = await QRCode.toBuffer(code, {
      type: 'png',
      width: 600,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${code}-qrcode.png"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Error downloading QR code:', err);
    res.status(500).json({ success: false, message: 'Failed to generate QR image' });
  }
};

// View and print complete visitor pass badge
exports.viewPrintableBadge = async (req, res) => {
  try {
    const code = req.params.code.trim().toUpperCase();
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
    .btn-download { background: #0f172a; color: white; }
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
    <img src="/api/tokens/${code}/download" class="qr-img" alt="QR Code ${code}" />
    <div><span class="badge-status">REUSABLE BADGE</span></div>
    <div class="instructions">
      Please wear this pass at all times inside campus.<br/>
      Return badge to security gate upon departure.
    </div>
    <div class="actions">
      <button class="btn btn-print" onclick="window.print()">🖨️ Print Badge</button>
      <a href="/api/tokens/${code}/download" class="btn btn-download">📥 Download PNG</a>
    </div>
  </div>
</body>
</html>`;
    return res.send(html);
  } catch (err) {
    console.error('Error viewing badge:', err);
    res.status(500).json({ success: false, message: 'Failed to generate printable badge' });
  }
};

