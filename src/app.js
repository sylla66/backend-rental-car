const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares globaux
const corsMiddleware = require('./middleware/corsMiddleware');
app.use(corsMiddleware);

// ⚠️ Le webhook Stripe DOIT être déclaré AVANT express.json().
// Stripe a besoin du corps brut (non parsé) pour vérifier sa signature
// cryptographique — express.raw() préserve ce corps tel quel, contrairement
// à express.json() qui le transforme en objet JS et casse la vérification.
const { handleStripeWebhook } = require('./controllers/paymentController');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());

// Routes de base
app.get('/', (_req, res) => {
  res.send('Car Rental Backend');
});

app.get('/health', (_req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', database: dbStatus });
});

// Routes métier — branchées ici au fur et à mesure qu'on les construit
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/vehicles', require('./routes/vehicleRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/sale-orders', require('./routes/saleOrderRoutes'));

app.use('/api/reviews', require('./routes/reviewRoutes'));

// 404 handler — doit être après toutes les routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Error handler global — doit être le dernier middleware
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur serveur',
  });
});

module.exports = app;