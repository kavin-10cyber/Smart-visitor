const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visitController');

router.post('/check-in', visitController.checkIn);
router.post('/check-out', visitController.checkOut);
router.get('/', visitController.getVisits);

module.exports = router;
