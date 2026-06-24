const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');

const demoVehicles = [
  {
    _id: 'demo-bmw-i7',
    name: 'BMW i7 xDrive60',
    brand: 'BMW',
    model: 'i7 xDrive60',
    year: 2024,
    dailyRate: 65000,
    images: [
      'https://images.unsplash.com/photo-1553440569-bcc63803a83d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'Berline électrique premium avec un intérieur luxueux et une autonomie longue distance.',
    isAvailable: true,
    licensePlate: 'AB-102-CD',
    mileage: 1200,
    fuelType: 'electrique',
    transmission: 'automatique',
    salePrice: 26500000,
    isAvailableForSale: true,
    isSold: false,
    category: { _id: 'demo-category-suv', name: 'Électrique' },
  },
  {
    _id: 'demo-mercedes-gle',
    name: 'Mercedes-Benz GLE 450',
    brand: 'Mercedes-Benz',
    model: 'GLE 450',
    year: 2023,
    dailyRate: 48000,
    images: [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'SUV élégant et spacieux, parfait pour les trajets urbains et les escapades.',
    isAvailable: true,
    licensePlate: 'CD-203-EF',
    mileage: 8600,
    fuelType: 'hybride',
    transmission: 'automatique',
    salePrice: 18900000,
    isAvailableForSale: true,
    isSold: false,
    category: { _id: 'demo-category-suv', name: 'SUV' },
  },
  {
    _id: 'demo-porsche-911',
    name: 'Porsche 911 Carrera',
    brand: 'Porsche',
    model: '911 Carrera',
    year: 2022,
    dailyRate: 95000,
    images: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1400&q=80',
      'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1400&q=80',
    ],
    description: 'Sportive de prestige, dynamique et ultra soignée pour une expérience unique.',
    isAvailable: true,
    licensePlate: 'GH-304-IJ',
    mileage: 5400,
    fuelType: 'essence',
    transmission: 'automatique',
    salePrice: 32000000,
    isAvailableForSale: true,
    isSold: false,
    category: { _id: 'demo-category-sport', name: 'Sport' },
  },
];

const getDemoVehicles = ({ search, minPrice, maxPrice, sort, page, limit }) => {
  let vehicles = [...demoVehicles];

  if (search) {
    const term = search.toLowerCase();
    vehicles = vehicles.filter((vehicle) => {
      const haystack = `${vehicle.brand} ${vehicle.model} ${vehicle.description}`.toLowerCase();
      return haystack.includes(term);
    });
  }

  if (minPrice || maxPrice) {
    vehicles = vehicles.filter((vehicle) => {
      const matchesMin = minPrice ? vehicle.dailyRate >= Number(minPrice) : true;
      const matchesMax = maxPrice ? vehicle.dailyRate <= Number(maxPrice) : true;
      return matchesMin && matchesMax;
    });
  }

  if (sort === 'price-desc') {
    vehicles.sort((a, b) => b.dailyRate - a.dailyRate);
  } else if (sort === 'price-asc') {
    vehicles.sort((a, b) => a.dailyRate - b.dailyRate);
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 12, 1), 50);
  const skip = (pageNum - 1) * limitNum;
  const paginatedVehicles = vehicles.slice(skip, skip + limitNum);

  return {
    vehicles: paginatedVehicles,
    pagination: {
      total: vehicles.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(vehicles.length / limitNum),
    },
  };
};

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

    if (mongoose.connection.readyState !== 1) {
      const fallback = getDemoVehicles({ search, minPrice, maxPrice, sort, page, limit });
      return res.status(200).json(fallback);
    }

    // 1. Filtres exacts — identiques à avant
    const filter = {};

    if (category) filter.category = category;
    if (isForRent !== undefined) filter.isAvailable = isForRent === 'true';
    if (isForSale !== undefined) filter.isAvailableForSale = isForSale === 'true';
    if (status) filter.isAvailable = status === 'available';

    if (minPrice || maxPrice) {
      filter.dailyRate = {};
      if (minPrice) filter.dailyRate.$gte = Number(minPrice);
      if (maxPrice) filter.dailyRate.$lte = Number(maxPrice);
    }

    if (search) {
      filter.$or = [
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions = {
      'price-asc': { dailyRate: 1 },
      'price-desc': { dailyRate: -1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
    };
    const sortBy = sortOptions[sort] || sortOptions.newest;

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 12, 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const [vehicles, total] = await Promise.all([
      Vehicle.find(filter)
        .populate('category', 'name')
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

    const fallback = getDemoVehicles(req.query);
    return res.status(200).json(fallback);
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