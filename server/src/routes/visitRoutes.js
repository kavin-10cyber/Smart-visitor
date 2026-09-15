const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visitController');

router.post('/check-in', visitController.checkIn);
router.post('/check-out', visitController.checkOut);
router.post('/cancel', visitController.cancelVisit);
router.post('/reschedule', visitController.rescheduleVisit);
router.get('/', visitController.getVisits);

module.exports = router;
