const Vehicle = require('../models/Vehicle');

// ─── POST /api/vehicles (admin) ──────────────────────────────────────────────
const createVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.create(req.body);
    return res.status(201).json({ vehicle });
  } catch (err) {
    // Erreurs de validation Mongoose (ex: champ requis manquant) → 400 plutôt que 500
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};

// ─── GET /api/vehicles (public, avec filtres) ────────────────────────────────
const getVehicles = async (req, res, next) => {
  try {
    const { category, minPrice, maxPrice, isForRent, isForSale, status } = req.query;

    // On construit le filtre dynamiquement selon les query params présents
    const filter = {};

    if (category) filter.categoryId = category;
    if (isForRent !== undefined) filter.isForRent = isForRent === 'true';
    if (isForSale !== undefined) filter.isForSale = isForSale === 'true';
    if (status) filter.status = status;

    if (minPrice || maxPrice) {
      filter.dailyRate = {};
      if (minPrice) filter.dailyRate.$gte = Number(minPrice);
      if (maxPrice) filter.dailyRate.$lte = Number(maxPrice);
    }

    const vehicles = await Vehicle.find(filter).populate('categoryId', 'name');

    return res.status(200).json({ count: vehicles.length, vehicles });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/vehicles/:id (public) ──────────────────────────────────────────
const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate('categoryId', 'name');

    if (!vehicle) {
      return res.status(404).json({ error: 'Véhicule introuvable' });
    }

    return res.status(200).json({ vehicle });
  } catch (err) {
    // ID mal formé (pas un ObjectId valide) → 400 plutôt que 500
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'ID véhicule invalide' });
    }
    next(err);
  }
};

// ─── PUT /api/vehicles/:id (admin) ───────────────────────────────────────────
const updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // retourne le document après modification, pas avant
      runValidators: true, // réapplique les règles du schéma (ex: enum, required)
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Véhicule introuvable' });
    }

    return res.status(200).json({ vehicle });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'ID véhicule invalide' });
    }
    next(err);
  }
};

// ─── DELETE /api/vehicles/:id (admin) ────────────────────────────────────────
const deleteVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ error: 'Véhicule introuvable' });
    }

    return res.status(200).json({ message: 'Véhicule supprimé avec succès' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'ID véhicule invalide' });
    }
    next(err);
  }
};

module.exports = {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
};