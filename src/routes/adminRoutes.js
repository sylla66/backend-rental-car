'use strict';

const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { getStats } = require('../controllers/adminController');

router.use(protect, isAdmin);

// GET /api/admin/stats
router.get('/stats', getStats);

module.exports = router;