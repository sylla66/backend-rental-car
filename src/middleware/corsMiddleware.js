// src/middlewares/corsMiddleware.js
const cors = require('cors');

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Liste des origines autorisées
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .filter(origin => origin.trim())
  .map(origin => origin.trim());

// Ajouter FRONTEND_URL si présent
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

//console.log('📋 Origines CORS autorisées:', allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    
    if (isDevelopment || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS bloqué: ${origin}`);
      callback(new Error(`CORS: ${origin} non autorisé`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400
};

module.exports = cors(corsOptions);