// Payment Routes
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware, authorizeRole } = require('../middleware/auth');

// All protected routes
router.use(authMiddleware);

// Get all payments
router.get('/', paymentController.getAllPayments);

// Get payment summary
router.get('/summary', paymentController.getPaymentSummary);

// Get payment by ID
router.get('/:id', paymentController.getPaymentById);

// Record new payment (Accountant only)
router.post('/', authorizeRole(['admin', 'accountant']), paymentController.recordPayment);

// Update payment (Accountant only)
router.put('/:id', authorizeRole(['admin', 'accountant']), paymentController.updatePayment);

// Generate invoice
router.get('/:student_id/invoice/:fee_id', paymentController.generateInvoice);

// Delete payment (Admin only)
router.delete('/:id', authorizeRole(['admin']), paymentController.deletePayment);

module.exports = router;
