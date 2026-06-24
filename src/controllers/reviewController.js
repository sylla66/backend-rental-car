'use strict';

const { Review, Booking, SaleOrder, Vehicle } = require('../models');

// ─── Vérifie que le user a bien utilisé ce véhicule (location OU achat) ──────
const hasUsedVehicle = async (userId, vehicleId) => {
  const [booking, saleOrder] = await Promise.all([
    Booking.findOne({
      userId,
      vehicleId,
      status: 'confirmed',
    }),
    SaleOrder.findOne({
      buyer: userId,
      vehicle: vehicleId,
      status: { $in: ['paid', 'shipped', 'delivered'] },
    }),
  ]);
  return !!(booking || saleOrder);
};

// ─── POST /api/reviews ────────────────────────────────────────────────────────
const createReview = async (req, res, next) => {
  try {
    const { vehicleId, rating, comment } = req.body;

    if (!vehicleId || !rating) {
      return res.status(400).json({ error: 'vehicleId et rating sont requis.' });
    }

    // 1. Vérifier que le véhicule existe
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Véhicule introuvable.' });
    }

    // 2. Vérifier que le user a loué ou acheté ce véhicule
    const allowed = await hasUsedVehicle(req.user.id, vehicleId);
    if (!allowed) {
      return res.status(403).json({
        error: "Vous devez avoir loué ou acheté ce véhicule pour laisser un avis.",
      });
    }

    // 3. Créer l'avis (l'index unique bloque un 2e avis automatiquement)
    const review = await Review.create({
      userId: req.user.id,
      vehicleId,
      rating,
      comment,
    });

    await review.populate('userId', 'fullName');

    return res.status(201).json({ review });
  } catch (err) {
    // Index unique violé → duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Vous avez déjà laissé un avis pour ce véhicule.' });
    }
    next(err);
  }
};

// ─── GET /api/reviews/vehicle/:vehicleId ─────────────────────────────────────
const getReviewsByVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Véhicule introuvable.' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ vehicleId })
        .populate('userId', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ vehicleId }),
    ]);

    // Calcul de la note moyenne
    const avgResult = await Review.aggregate([
      { $match: { vehicleId: vehicle._id } },
      { $group: { _id: null, avgRating: { $avg: '$rating' } } },
    ]);
    const avgRating = avgResult[0]?.avgRating
      ? Math.round(avgResult[0].avgRating * 10) / 10
      : null;

    return res.json({ total, page, pages: Math.ceil(total / limit), avgRating, reviews });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reviews/me ──────────────────────────────────────────────────────
// Les avis du user connecté
const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ userId: req.user.id })
      .populate('vehicleId', 'name brand model')
      .sort({ createdAt: -1 });

    return res.json({ total: reviews.length, reviews });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/reviews/:id ───────────────────────────────────────────────────
const updateReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    if (!rating && comment === undefined) {
      return res.status(400).json({ error: 'rating ou comment requis pour la mise à jour.' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Avis introuvable.' });
    }

    if (review.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres avis.' });
    }

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    await review.save();

    await review.populate('userId', 'fullName');

    return res.json({ review });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/reviews/:id ──────────────────────────────────────────────────
const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Avis introuvable.' });
    }

    const isAuthor = review.userId.toString() === req.user.id;
    if (!isAuthor && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    await review.deleteOne();

    return res.json({ message: 'Avis supprimé.' });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reviews (admin) ─────────────────────────────────────────────────
const getAllReviews = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find()
        .populate('userId', 'fullName email')
        .populate('vehicleId', 'name brand model')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(),
    ]);

    return res.json({ total, page, pages: Math.ceil(total / limit), reviews });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createReview,
  getReviewsByVehicle,
  getMyReviews,
  updateReview,
  deleteReview,
  getAllReviews,
};