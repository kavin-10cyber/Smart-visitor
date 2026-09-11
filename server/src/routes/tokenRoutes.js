const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');

router.get('/', tokenController.getTokens);
router.post('/generate', tokenController.generateToken);
router.get('/:code', tokenController.verifyToken);

module.exports = router;
