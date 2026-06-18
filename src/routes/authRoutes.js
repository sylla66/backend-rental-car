const express = require('express');
const { register, login, me } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Routes publiques
router.post('/register', register);
router.post('/login', login);

// Route protégée — nécessite un token JWT valide
router.get('/me', protect, me);

module.exports = router;