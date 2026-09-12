const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');

router.get('/', tokenController.getTokens);
router.post('/generate', tokenController.generateToken);
router.get('/:code/download', tokenController.downloadTokenQR);
router.get('/:code/badge', tokenController.viewPrintableBadge);
router.get('/:code', tokenController.verifyToken);

module.exports = router;
