const express = require('express');
const { createPaymentIntent, getPaymentStatus } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Note : la route /webhook n'est PAS ici — elle est déclarée séparément
// dans app.js, avant express.json(), car elle a besoin du corps brut.

router.post('/create-intent', protect, createPaymentIntent);
router.get('/:bookingId/status', protect, getPaymentStatus);

module.exports = router;