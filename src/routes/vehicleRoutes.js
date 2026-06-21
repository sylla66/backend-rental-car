const express = require('express');
const {
  createVehicle,
  getVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} = require('../controllers/vehicleController');
const { protect, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// ─── Routes publiques ─────────────────────────────────────────────────────────
router.get('/', getVehicles);
router.get('/:id', getVehicleById);

// ─── Routes admin (protect d'abord, puis isAdmin) ────────────────────────────
router.post('/', protect, isAdmin, createVehicle);
router.put('/:id', protect, isAdmin, updateVehicle);
router.delete('/:id', protect, isAdmin, deleteVehicle);

module.exports = router;
