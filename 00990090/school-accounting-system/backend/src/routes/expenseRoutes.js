// Expense Routes
const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authMiddleware, authorizeRole } = require('../middleware/auth');

// All protected routes
router.use(authMiddleware);

// Get all expenses
router.get('/', expenseController.getAllExpenses);

// Get expense summary
router.get('/summary', expenseController.getExpenseSummary);

// Get expense categories
router.get('/categories', expenseController.getExpenseCategories);

// Get expense by ID
router.get('/:id', expenseController.getExpenseById);

// Create new expense (Accountant only)
router.post('/', authorizeRole(['admin', 'accountant']), expenseController.createExpense);

// Update expense (Accountant only)
router.put('/:id', authorizeRole(['admin', 'accountant']), expenseController.updateExpense);

// Approve expense (Admin only)
router.put('/:id/approve', authorizeRole(['admin']), expenseController.approveExpense);

// Delete expense (Admin only)
router.delete('/:id', authorizeRole(['admin']), expenseController.deleteExpense);

module.exports = router;
