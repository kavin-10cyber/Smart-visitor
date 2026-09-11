const express = require('express');
const router = express.Router();

const db = require('../config/db');
const authRoutes = require('./authRoutes');
const tokenRoutes = require('./tokenRoutes');
const visitRoutes = require('./visitRoutes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Smart Campus Visitor Management System',
    timestamp: new Date().toISOString(),
    usingSupabase: db.isUsingSupabase
  });
});

// Mount modular sub-routes
router.use('/auth', authRoutes);
router.use('/tokens', tokenRoutes);
router.use('/visits', visitRoutes);

module.exports = router;
