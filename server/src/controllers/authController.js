// Authentication Controller

exports.login = (req, res) => {
  const { username, password } = req.body;

  if (username === 'admin' && password === 'admin123') {
    return res.json({
      success: true,
      role: 'admin',
      name: 'System Admin',
      token: 'demo-admin-token'
    });
  }

  if (username === 'security' && password === 'security123') {
    return res.json({
      success: true,
      role: 'security',
      name: 'Security Officer',
      token: 'demo-security-token'
    });
  }

  if (
    (username === 'event' || username.toLowerCase().includes('event') || username.toLowerCase().includes('tech') || username.toLowerCase().startsWith('evt')) &&
    (password === 'event123' || password === 'admin123')
  ) {
    return res.json({
      success: true,
      role: 'event',
      name: 'Event Coordinator',
      token: 'demo-event-token'
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid username or password'
  });
};
