'use strict';

const { SaleOrder, Vehicle, Payment } = require('../models');
const { getStripe } = require('../utils/stripe');

// Taux de conversion unique : ~600 XOF = 1 USD (identique à paymentController)
const xofToUsdCents = (xof) => Math.round((xof / 600) * 100);

// ─── POST /api/sale-orders ───────────────────────────────────────────────────
const createSaleOrder = async (req, res, next) => {
  try {
    const { vehicleId } = req.body;

    if (!vehicleId) {
      return res.status(400).json({ error: 'vehicleId est requis.' });
    }

    const vehicle = await Vehicle.findById(vehicleId).populate('category');
    if (!vehicle) {
      return res.status(404).json({ error: 'Véhicule introuvable.' });
    }
    if (!vehicle.isAvailableForSale) {
      return res.status(400).json({ error: "Ce véhicule n'est pas disponible à la vente." });
    }
    if (vehicle.isSold) {
      return res.status(400).json({ error: 'Ce véhicule a déjà été vendu.' });
    }
    if (!vehicle.salePrice || vehicle.salePrice <= 0) {
      return res.status(400).json({ error: 'Prix de vente invalide pour ce véhicule.' });
    }

    const existingOrder = await SaleOrder.findOne({
      vehicle: vehicleId,
      status: { $in: ['pending', 'paid'] },
    });
    if (existingOrder) {
      return res.status(400).json({ error: 'Une commande est déjà en cours pour ce véhicule.' });
    }

    // Créer la SaleOrder
    const saleOrder = await SaleOrder.create({
      buyer: req.user.id,
      vehicle: vehicleId,
      totalPrice: vehicle.salePrice,
      status: 'pending',
    });

    // PaymentIntent Stripe
    const amountInUsdCents = xofToUsdCents(vehicle.salePrice);

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: amountInUsdCents,
      currency: 'usd',
      metadata: {
        saleOrderId: saleOrder._id.toString(),
        vehicleId: vehicleId.toString(),
        buyerId: req.user.id.toString(),
      },
    });

    // Payment lié — type: 'sale' conforme à l'enum du schéma Payment
    await Payment.create({
      type: 'sale',                         // ← 'sale' (pas 'sale_order')
      referenceId: saleOrder._id,
      referenceModel: 'SaleOrder',
      amount: amountInUsdCents / 100,       // en USD, même unité que les bookings
      provider: 'stripe',
      currency: 'USD',
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
    });

    saleOrder.stripePaymentIntentId = paymentIntent.id;
    await saleOrder.save();

    return res.status(201).json({
      saleOrder,
      clientSecret: paymentIntent.client_secret,
      amount: amountInUsdCents / 100,
      currency: 'usd',
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/sale-orders ────────────────────────────────────────────────────
const getSaleOrders = async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { buyer: req.user.id };

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      SaleOrder.find(filter)
        .populate('buyer', 'fullName email')
        .populate({ path: 'vehicle', populate: { path: 'category', select: 'name' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SaleOrder.countDocuments(filter),
    ]);

    return res.json({
      total,
      page,
      pages: Math.ceil(total / limit),
      orders,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/sale-orders/:id ────────────────────────────────────────────────
const getSaleOrderById = async (req, res, next) => {
  try {
    const order = await SaleOrder.findById(req.params.id)
      .populate('buyer', 'fullName email')
      .populate({ path: 'vehicle', populate: { path: 'category', select: 'name' } });

    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable.' });
    }

    if (req.user.role !== 'admin' && order.buyer._id.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    // Attacher le payment à la réponse
    const payment = await Payment.findOne({
      referenceId: order._id,
      referenceModel: 'SaleOrder',
    });

    const result = order.toObject();
    result.payment = payment;

    return res.json(result);
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/sale-orders/:id/cancel ──────────────────────────────────────
const cancelSaleOrder = async (req, res, next) => {
  try {
    const order = await SaleOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable.' });
    }

    const isBuyer = order.buyer.toString() === req.user.id.toString();
    if (!isBuyer && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        error: `Impossible d'annuler une commande avec le statut "${order.status}".`,
      });
    }

    if (order.stripePaymentIntentId) {
      await getStripe().paymentIntents.cancel(order.stripePaymentIntentId).catch(() => {});
    }

    order.status = 'cancelled';
    await order.save();

    await Payment.findOneAndUpdate(
      { referenceId: order._id, referenceModel: 'SaleOrder' },
      { status: 'failed' }   // 'failed' est dans l'enum du schéma Payment
    );

    return res.json({ message: 'Commande annulée.', order });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/sale-orders/:id/status (admin) ──────────────────────────────
const updateSaleOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Statut invalide. Valeurs acceptées : ${allowed.join(', ')}`,
      });
    }

    const order = await SaleOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable.' });
    }

    if (status === 'delivered') {
      await Vehicle.findByIdAndUpdate(order.vehicle, {
        isSold: true,
        isAvailableForSale: false,
      });
    }

    order.status = status;
    await order.save();

    return res.json({ message: 'Statut mis à jour.', order });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSaleOrder,
  getSaleOrders,
  getSaleOrderById,
  cancelSaleOrder,
  updateSaleOrderStatus,
};