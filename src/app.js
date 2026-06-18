const express = require('express');
const mongoose = require('mongoose');

const app = express();

app.use(express.json());

// Connexion à MongoDB - Utiliser DATABASE_URL comme dans votre .env
const MONGODB_URI = process.env.DATABASE_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/car_rental';

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('✅ Connecté à MongoDB avec succès');
  console.log(`📦 Base de données: ${mongoose.connection.db.databaseName}`);
  console.log(`🔗 URI: ${MONGODB_URI.replace(/password[^@]*@/, 'password:****@')}`); // Cache le mot de passe
})
.catch((error) => {
  console.error('❌ Erreur de connexion à MongoDB:', error.message);
  // Ne pas arrêter le serveur en local pour permettre le débogage
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handlers pour les événements MongoDB
mongoose.connection.on('error', (error) => {
  console.error('❌ Erreur MongoDB:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB déconnecté');
});

// Routes
app.get('/', (req, res) => {
  res.send('Car Rental Backend');
});

app.get('/health', (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok',
    database: dbStatus,
    readyState: mongoose.connection.readyState // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
  });
});

// Endpoint pour tester la connexion DB
app.get('/test-db', async (_req, res) => {
  try {
    // Vérifier si la connexion est établie
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: 'Database not connected',
        state: mongoose.connection.readyState
      });
    }
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    res.json({
      status: 'connected',
      database: db.databaseName,
      collections: collections.map(c => c.name),
      readyState: mongoose.connection.readyState
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database connection error',
      message: error.message
    });
  }
});

module.exports = app;