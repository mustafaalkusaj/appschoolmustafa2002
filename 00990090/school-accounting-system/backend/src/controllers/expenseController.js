// Expense Controller
// Handles expense and revenue tracking

const ExpenseModel = require('../models/Expense');
const { getPagination } = require('../utils/helpers');

/**
 * Get all expenses
 * GET /expenses?page=1&limit=10&category=salaries&is_approved=true
 */
const getAllExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, is_approved, from_date, to_date } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    const filters = {};
    if (category) filters.category = category;
    if (is_approved !== undefined) filters.is_approved = is_approved === 'true';
    if (from_date) filters.from_date = from_date;
    if (to_date) filters.to_date = to_date;

    const result = await ExpenseModel.getAll(filters, offset, pageLimit);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total: result.total,
        pages: Math.ceil(result.total / pageLimit)
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expenses'
    });
  }
};

/**
 * Get expense by ID
 * GET /expenses/:id
 */
const getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await ExpenseModel.getById(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expense'
    });
  }
};

/**
 * Create new expense
 * POST /expenses
 */
const createExpense = async (req, res) => {
  try {
    const { description, category, amount, expense_date, payment_method, reference_number, notes } = req.body;

    if (!description || !category || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Description, category, and amount are required'
      });
    }

    const expenseData = {
      description,
      category,
      amount,
      expense_date: expense_date || new Date().toISOString().split('T')[0],
      payment_method,
      reference_number,
      notes,
      created_by: req.user.id
    };

    const expense = await ExpenseModel.create(expenseData);

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating expense'
    });
  }
};

/**
 * Update expense
 * PUT /expenses/:id
 */
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expenseData = req.body;

    const expense = await ExpenseModel.update(id, expenseData);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: expense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating expense'
    });
  }
};

/**
 * Approve expense (Admin only)
 * PUT /expenses/:id/approve
 */
const approveExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await ExpenseModel.approve(id, req.user.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense approved successfully',
      data: expense
    });
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving expense'
    });
  }
};

/**
 * Delete expense
 * DELETE /expenses/:id
 */
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await ExpenseModel.delete(id);

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting expense'
    });
  }
};

/**
 * Get expense summary for date range
 * GET /expenses/summary?from_date=2024-01-01&to_date=2024-01-31
 */
const getExpenseSummary = async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    if (!from_date || !to_date) {
      return res.status(400).json({
        success: false,
        message: 'From date and to date are required'
      });
    }

    const summary = await ExpenseModel.getSummary(from_date, to_date);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get expense summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching expense summary'
    });
  }
};

/**
 * Get expense categories
 * GET /expenses/categories
 */
const getExpenseCategories = async (req, res) => {
  try {
    const categories = await ExpenseModel.getCategories();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
};

module.exports = {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  approveExpense,
  deleteExpense,
  getExpenseSummary,
  getExpenseCategories
};
