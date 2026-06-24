'use strict';

const { Booking, Payment, SaleOrder, Vehicle } = require('../models');
const { getStripe } = require('../utils/stripe');

// Taux de conversion unique : ~600 XOF = 1 USD
// Même valeur utilisée dans tous les controllers
const xofToUsdCents = (xof) => Math.round((xof / 600) * 100);

// ─── POST /api/payments/create-intent ────────────────────────────────────────
const createPaymentIntent = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId est requis' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Réservation introuvable' });
    }

    const isOwner = booking.userId.toString() === req.user.id;
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        error: `Cette réservation ne peut pas être payée (statut: ${booking.status})`,
      });
    }

    const existingPaid = await Payment.findOne({
      referenceId: booking._id,
      referenceModel: 'Booking',
      status: 'paid',
    });
    if (existingPaid) {
      return res.status(409).json({ error: 'Cette réservation a déjà été payée' });
    }

    const amountInUsdCents = xofToUsdCents(booking.totalPrice);

    const paymentIntent = await getStripe().paymentIntents.create({
      amount: amountInUsdCents,
      currency: 'usd',
      metadata: {
        bookingId: booking._id.toString(),
        userId: req.user.id,
      },
    });

    let payment = await Payment.findOne({
      referenceId: booking._id,
      referenceModel: 'Booking',
    });

    if (payment) {
      payment.amount = amountInUsdCents / 100;
      payment.status = 'pending';
      payment.stripePaymentIntentId = paymentIntent.id;
      await payment.save();
    } else {
      payment = await Payment.create({
        type: 'booking',
        referenceId: booking._id,
        referenceModel: 'Booking',
        amount: amountInUsdCents / 100,
        provider: 'stripe',
        status: 'pending',
        stripePaymentIntentId: paymentIntent.id,
      });
    }

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: amountInUsdCents / 100,
      currency: 'usd',
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/webhook ──────────────────────────────────────────────
// Déclaré AVANT express.json() dans app.js (corps brut requis pour la signature)
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature invalide:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;

      const payment = await Payment.findOne({ stripePaymentIntentId: pi.id });

      if (payment && payment.status !== 'paid') {
        payment.status = 'paid';
        payment.paidAt = new Date();
        await payment.save();

        if (payment.referenceModel === 'Booking') {
          await Booking.findByIdAndUpdate(payment.referenceId, { status: 'confirmed' });
        }

        if (payment.referenceModel === 'SaleOrder') {
          const order = await SaleOrder.findById(payment.referenceId);
          if (order && order.status === 'pending') {
            order.status = 'paid';
            await order.save();
            // Bloquer d'autres commandes sur ce véhicule (vendu sous réserve)
            await Vehicle.findByIdAndUpdate(order.vehicle, { isAvailableForSale: false });
          }
        }
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: event.data.object.id },
        { status: 'failed' }
      );
    }
  } catch (err) {
    console.error('Erreur traitement webhook:', err.message);
    return res.status(500).send('Erreur interne');
  }

  return res.status(200).json({ received: true });
};

// ─── GET /api/payments/:bookingId/status ─────────────────────────────────────
const getPaymentStatus = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      referenceId: req.params.bookingId,
      referenceModel: 'Booking',
    });

    if (!payment) {
      return res.status(404).json({ error: 'Aucun paiement trouvé pour cette réservation' });
    }

    return res.status(200).json({ payment });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPaymentIntent,
  handleStripeWebhook,
  getPaymentStatus,
};