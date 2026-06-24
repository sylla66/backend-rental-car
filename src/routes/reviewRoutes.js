'use strict';

const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const {
  createReview,
  getReviewsByVehicle,
  getMyReviews,
  updateReview,
  deleteReview,
  getAllReviews,
} = require('../controllers/reviewController');

// ── Routes publiques ──────────────────────────────────────────────────────────
// GET  /api/reviews/vehicle/:vehicleId  — avis d'un véhicule (public)
router.get('/vehicle/:vehicleId', getReviewsByVehicle);

// ── Routes authentifiées ──────────────────────────────────────────────────────
router.use(protect);

// POST /api/reviews                     — créer un avis
router.post('/', createReview);

// GET  /api/reviews/me                  — mes avis
router.get('/me', getMyReviews);

// PATCH /api/reviews/:id                — modifier son avis
router.patch('/:id', updateReview);

// DELETE /api/reviews/:id               — supprimer (auteur ou admin)
router.delete('/:id', deleteReview);

// ── Routes admin ──────────────────────────────────────────────────────────────
// GET  /api/reviews                     — tous les avis
router.get('/', isAdmin, getAllReviews);

module.exports = router;