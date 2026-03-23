// Dashboard Routes
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware } = require('../middleware/auth');

// All protected routes
router.use(authMiddleware);

// Get dashboard statistics
router.get('/stats', dashboardController.getDashboardStats);

// Get daily report
router.get('/report/daily', dashboardController.getDailyReport);

// Get monthly report
router.get('/report/monthly', dashboardController.getMonthlyReport);

module.exports = router;
