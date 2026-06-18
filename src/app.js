const express = require('express');
const cors = require('cors');

const app = express();

// Middlewares globaux
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
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

// Routes métier — on les décommente au fur et à mesure
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/vehicles', require('./routes/vehicleRoutes'));
// app.use('/api/bookings', require('./routes/bookingRoutes'));

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