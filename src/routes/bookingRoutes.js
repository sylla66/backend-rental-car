const express = require('express');
const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
} = require('../controllers/bookingController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Toutes les routes de réservation nécessitent d'être connecté
router.use(protect);

// ─── Routes admin (déclarées avant /:id pour éviter le conflit de pattern) ───
router.get('/admin/all', isAdmin, getAllBookings);

// ─── Routes utilisateur connecté ─────────────────────────────────────────────
router.post('/', createBooking);
router.get('/', getMyBookings);
router.get('/:id', getBookingById);
router.patch('/:id/cancel', cancelBooking);

module.exports = router;
