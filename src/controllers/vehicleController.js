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

// ─── GET /api/vehicles (public, avec filtres, recherche, tri, pagination) ────
const getVehicles = async (req, res, next) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      isForRent,
      isForSale,
      status,
      search,
      sort,
      page,
      limit,
    } = req.query;

    // 1. Filtres exacts — identiques à avant
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

    // 2. Recherche texte — marque OU modèle contient le terme cherché
    //    $options 'i' = insensible à la casse ("toyota" matche "Toyota")
    if (search) {
      filter.$or = [
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
      ];
    }

    // 3. Tri — whitelist des valeurs acceptées pour éviter d'exposer
    //    n'importe quel champ interne au tri via l'URL
    const sortOptions = {
      'price-asc': { dailyRate: 1 },
      'price-desc': { dailyRate: -1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
    };
    const sortBy = sortOptions[sort] || sortOptions.newest;

    // 4. Pagination — valeurs par défaut sûres si absentes ou invalides
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 12, 1), 50); // cap à 50 max
    const skip = (pageNum - 1) * limitNum;

    // 5. On lance les deux requêtes en parallèle : les résultats de la page
    //    + le compte total (nécessaire pour que le frontend affiche la pagination)
    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter)
        .populate('categoryId', 'name')
        .sort(sortBy)
        .skip(skip)
        .limit(limitNum),
      Vehicle.countDocuments(filter),
    ]);

    return res.status(200).json({
      vehicles,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'category invalide' });
    }
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