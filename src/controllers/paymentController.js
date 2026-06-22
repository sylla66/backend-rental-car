const Stripe = require('stripe');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

let stripe;
const getStripe = () => {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required to initialize Stripe');
    }
    stripe = Stripe(secretKey);
  }
  return stripe;
};

// ─── POST /api/payments/create-intent ────────────────────────────────────────
// Crée une intention de paiement Stripe pour une réservation existante.
// Le frontend utilisera le client_secret retourné avec Stripe Elements
// pour afficher le formulaire de carte et finaliser le paiement.
const createPaymentIntent = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId est requis' });
    }

    // 1. Récupérer la réservation et vérifier qu'elle appartient bien au user
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

    // 2. Empêcher de payer deux fois la même réservation : si un Payment
    //    "paid" existe déjà pour ce booking, on bloque ici.
    const existingPaid = await Payment.findOne({
      referenceId: booking._id,
      referenceModel: 'Booking',
      status: 'paid',
    });
    if (existingPaid) {
      return res.status(409).json({ error: 'Cette réservation a déjà été payée' });
    }

    // 3. Stripe attend le montant en "plus petite unité" de la devise.
    //    En USD/EUR : centimes (1 USD = 100). On convertit le XOF du
    //    totalPrice vers USD pour la démo Stripe (taux fixe simplifié ici ;
    //    en vrai projet on utiliserait un taux de change à jour).
    const amountInUsdCents = Math.round(booking.totalPrice / 600 * 100); // ~600 XOF = 1 USD

    // 4. Créer le PaymentIntent côté Stripe
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: amountInUsdCents,
      currency: 'usd',
      metadata: {
        bookingId: booking._id.toString(),
        userId: req.user.id,
      },
    });

    // 5. Créer (ou mettre à jour) notre enregistrement Payment local en "pending"
    //    On le crée maintenant pour avoir une trace, même si le paiement
    //    n'est pas encore confirmé — le webhook le passera à "paid".
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

// ─── POST /api/payments/webhook (appelé par Stripe, PAS par le frontend) ────
// Stripe envoie cet événement de manière asynchrone, indépendamment de la
// requête du navigateur du client. C'est la SEULE source de vérité fiable
// pour savoir si un paiement a réellement abouti.
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Vérifie que l'événement vient bien de Stripe (signature cryptographique)
    // et pas d'un attaquant qui simulerait un faux paiement réussi.
    event = getStripe().webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature invalide:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;

    try {
      const payment = await Payment.findOne({
        stripePaymentIntentId: paymentIntent.id,
      });

      if (payment && payment.status !== 'paid') {
        payment.status = 'paid';
        payment.paidAt = new Date();
        await payment.save();

        // On confirme aussi la réservation associée
        await Booking.findByIdAndUpdate(payment.referenceId, { status: 'confirmed' });
      }
    } catch (err) {
      console.error('Erreur traitement webhook:', err.message);
      return res.status(500).send('Erreur interne');
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      { status: 'failed' }
    );
  }

  // Toujours répondre 200 à Stripe pour accuser réception, sinon il réessaiera
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