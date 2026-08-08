const express = require('express');
const router = express.Router();
const { verifyToken, permit } = require('../middleware/authMiddleware');
const salesController = require('../controllers/salesController');

// Create a new sale (staff or admin)
router.post('/', verifyToken, salesController.createSale);

// Get all sales (admin view)
router.get('/', verifyToken, permit('admin'), salesController.getAllSales);

// Get sales for current staff user
router.get('/my', verifyToken, salesController.getMySales);

module.exports = router;
