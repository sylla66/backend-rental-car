'use strict';

const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const {
  createSaleOrder,
  getSaleOrders,
  getSaleOrderById,
  cancelSaleOrder,
  updateSaleOrderStatus,
} = require('../controllers/saleOrderController');

// Toutes les routes nécessitent d'être connecté
router.use(protect);

// POST   /api/sale-orders          — créer une commande + PaymentIntent
router.post('/', createSaleOrder);

// GET    /api/sale-orders          — liste (admin: tout, user: les siennes)
router.get('/', getSaleOrders);

// GET    /api/sale-orders/:id      — détail
router.get('/:id', getSaleOrderById);

// PATCH  /api/sale-orders/:id/cancel   — annuler (buyer ou admin)
router.patch('/:id/cancel', cancelSaleOrder);

// PATCH  /api/sale-orders/:id/status   — changer statut (admin seulement)
router.patch('/:id/status', isAdmin, updateSaleOrderStatus);

module.exports = router;