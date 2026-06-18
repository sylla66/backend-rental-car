const jwt = require('jsonwebtoken');

// ─── Protège une route : vérifie que le token JWT est valide ────────────────
const protect = (req, res, next) => {
  try {
    // 1. Récupérer le header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Aucun token fourni' });
    }

    // 2. Extraire le token (après "Bearer ")
    const token = authHeader.split(' ')[1];

    // 3. Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Injecter les infos décodées dans req.user pour les controllers suivants
    req.user = decoded; // { id, role, iat, exp }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré, veuillez vous reconnecter' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalide' });
    }
    return res.status(401).json({ error: 'Authentification échouée' });
  }
};

// ─── Restreint une route aux admins uniquement ───────────────────────────────
// S'utilise APRÈS protect, car il a besoin de req.user déjà rempli
const isAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
  }
  next();
};

module.exports = { protect, isAdmin };
