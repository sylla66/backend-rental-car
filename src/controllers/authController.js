const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Utilitaire : génère un token JWT ────────────────────────────────────────
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { fullName, email, password, phone } = req.body;

    // 1. Validation manuelle des champs requis
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'fullName, email et password sont requis' });
    }

    // 2. Vérifier que l'email n'est pas déjà utilisé
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 4 caractères' });
    }

    // 3. Hasher le mot de passe (10 rounds = bon équilibre sécurité/performance)
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Créer l'utilisateur en base
    const user = await User.create({
      fullName,
      email,
      passwordHash,
      phone,
    });

    // 5. Générer le token et répondre
    // Le modèle User supprime passwordHash via toJSON() — pas de fuite
    const token = generateToken(user);

    return res.status(201).json({
      message: 'Compte créé avec succès',
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'email et password sont requis' });
    }

    // 2. Chercher l'utilisateur — on force select('+passwordHash') car
    //    le champ est select:false dans le modèle
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      // Message volontairement vague : ne pas révéler si l'email existe
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // 3. Comparer le mot de passe avec le hash stocké
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // 4. Générer le token et répondre
    const token = generateToken(user);

    return res.status(200).json({
      message: 'Connexion réussie',
      token,
      user, // passwordHash retiré automatiquement par toJSON()
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/auth/me (route protégée) ───────────────────────────────────────
const me = async (req, res, next) => {
  try {
    // req.user est injecté par authMiddleware — contient { id, role }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    return res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
