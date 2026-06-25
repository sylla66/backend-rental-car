// src/middlewares/corsMiddleware.js
const cors = require('cors');

const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

// Liste des origines autorisées
// ✅ Après — déduplication avec Set
const allowedOrigins = [...new Set([
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
  process.env.FRONTEND_URL,
].filter(Boolean))];

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