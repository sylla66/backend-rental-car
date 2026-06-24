const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');

// ─── Utilitaire : calcule le nombre de jours entre deux dates ───────────────
const getDaysBetween = (start, end) => {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((new Date(end) - new Date(start)) / msPerDay);
};

// ─── Utilitaire : vérifie si un véhicule est dispo sur une période donnée ───
// Deux réservations se chevauchent si : startA < endB ET endA > startB
// On ignore les réservations "cancelled" — elles ne bloquent rien.
const hasOverlappingBooking = async (vehicleId, startDate, endDate, excludeBookingId = null) => {
  const query = {
    vehicleId,
    status: { $in: ['pending', 'confirmed'] },
    startDate: { $lt: endDate },
    endDate: { $gt: startDate },
  };

  // Utile pour PATCH/update plus tard : exclure la réservation qu'on modifie
  // elle-même de la vérification de chevauchement
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflict = await Booking.findOne(query);
  return !!conflict;
};

// ─── POST /api/bookings (utilisateur connecté) ───────────────────────────────
const createBooking = async (req, res, next) => {
  try {
    const { vehicleId, startDate, endDate } = req.body;

    if (!vehicleId || !startDate || !endDate) {
      return res.status(400).json({ error: 'vehicleId, startDate et endDate sont requis' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({ error: 'La date de fin doit être après la date de début' });
    }

    // On refuse les réservations dans le passé
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) {
      return res.status(400).json({ error: 'La date de début ne peut pas être dans le passé' });
    }

    // 1. Le véhicule existe-t-il et est-il proposé à la location ?
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ error: 'Véhicule introuvable' });
    }
    // ✅ Après
    if (!vehicle.isAvailable) {
      return res.status(400).json({ error: "Ce véhicule n'est pas disponible à la location." });
    }
    if (vehicle.isSold) {
      return res.status(400).json({ error: 'Ce véhicule a été vendu et ne peut plus être loué.' });
    }

    // 2. Vérifier qu'aucune réservation existante ne chevauche ces dates
    const isOverlapping = await hasOverlappingBooking(vehicleId, start, end);
    if (isOverlapping) {
      return res.status(409).json({ error: 'Ce véhicule est déjà réservé sur cette période' });
    }

    // 3. Calculer le prix total — nombre de jours × tarif journalier
    const days = getDaysBetween(start, end);
    const totalPrice = days * vehicle.dailyRate;

    // 4. Créer la réservation
    const booking = await Booking.create({
      userId: req.user.id,
      vehicleId,
      startDate: start,
      endDate: end,
      totalPrice,
      status: 'pending', // passera à "confirmed" après paiement (étape suivante)
    });

    return res.status(201).json({ booking, days, dailyRate: vehicle.dailyRate });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'vehicleId invalide' });
    }
    next(err);
  }
};

// ─── GET /api/bookings (mes réservations) ────────────────────────────────────
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate('vehicleId', 'brand model dailyRate images')
      .sort({ createdAt: -1 });

    return res.status(200).json({ bookings });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/bookings/:id (détail) ──────────────────────────────────────────
const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(
      'vehicleId',
      'brand model dailyRate images'
    );

    if (!booking) {
      return res.status(404).json({ error: 'Réservation introuvable' });
    }

    // Sécurité : un client ne peut voir QUE ses propres réservations.
    // Un admin peut tout voir.
    const isOwner = booking.userId.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    return res.status(200).json({ booking });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'ID réservation invalide' });
    }
    next(err);
  }
};

// ─── PATCH /api/bookings/:id/cancel ──────────────────────────────────────────
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Réservation introuvable' });
    }

    const isOwner = booking.userId.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Cette réservation est déjà annulée' });
    }
    if (booking.status === 'completed') {
      return res.status(400).json({ error: 'Impossible d\'annuler une réservation terminée' });
    }

    booking.status = 'cancelled';
    await booking.save();

    return res.status(200).json({ message: 'Réservation annulée', booking });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'ID réservation invalide' });
    }
    next(err);
  }
};

// ─── GET /api/bookings/admin/all (admin) ─────────────────────────────────────
const getAllBookings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const bookings = await Booking.find(filter)
      .populate('userId', 'fullName email')
      .populate('vehicleId', 'brand model')
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: bookings.length, bookings });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
};