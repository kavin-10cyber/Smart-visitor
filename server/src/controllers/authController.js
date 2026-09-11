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

  return res.status(401).json({
    success: false,
    message: 'Invalid username or password'
  });
};
