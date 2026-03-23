// Expense Model
// Handles expense database operations

const db = require('../config/database');

/**
 * Expense model class
 */
class ExpenseModel {
  /**
   * Get all expenses with pagination and filters
   */
  static async getAll(filters = {}, offset = 0, limit = 10) {
    let query = `
      SELECT e.*, u.name as created_by_name, u2.name as approved_by_name
      FROM expenses e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN users u2 ON e.approved_by = u2.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.category) {
      query += ` AND e.category = $${paramCount}`;
      values.push(filters.category);
      paramCount++;
    }

    if (filters.is_approved !== undefined) {
      query += ` AND e.is_approved = $${paramCount}`;
      values.push(filters.is_approved);
      paramCount++;
    }

    if (filters.from_date) {
      query += ` AND e.expense_date >= $${paramCount}`;
      values.push(filters.from_date);
      paramCount++;
    }

    if (filters.to_date) {
      query += ` AND e.expense_date <= $${paramCount}`;
      values.push(filters.to_date);
      paramCount++;
    }

    query += ` ORDER BY e.expense_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await db.query(query, values);

    // Count total
    let countQuery = 'SELECT COUNT(*) as total FROM expenses WHERE 1=1';
    const countValues = [];

    if (filters.category) {
      countQuery += ` AND category = $${countValues.length + 1}`;
      countValues.push(filters.category);
    }

    if (filters.is_approved !== undefined) {
      countQuery += ` AND is_approved = $${countValues.length + 1}`;
      countValues.push(filters.is_approved);
    }

    if (filters.from_date) {
      countQuery += ` AND expense_date >= $${countValues.length + 1}`;
      countValues.push(filters.from_date);
    }

    if (filters.to_date) {
      countQuery += ` AND expense_date <= $${countValues.length + 1}`;
      countValues.push(filters.to_date);
    }

    const countResult = await db.query(countQuery, countValues);

    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      offset,
      limit
    };
  }

  /**
   * Get expense by ID
   */
  static async getById(id) {
    const result = await db.query(
      `SELECT e.*, u.name as created_by_name, u2.name as approved_by_name
       FROM expenses e
       LEFT JOIN users u ON e.created_by = u.id
       LEFT JOIN users u2 ON e.approved_by = u2.id
       WHERE e.id = $1`, [id]
    );
    return result.rows[0];
  }

  /**
   * Create new expense
   */
  static async create(expenseData) {
    const {
      description, category, amount, expense_date,
      payment_method, reference_number, notes, created_by
    } = expenseData;

    const result = await db.query(`
      INSERT INTO expenses (
        description, category, amount, expense_date,
        payment_method, reference_number, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      description, category, amount, expense_date,
      payment_method, reference_number, notes, created_by
    ]);

    return result.rows[0];
  }

  /**
   * Update expense
   */
  static async update(id, expenseData) {
    const {
      description, category, amount, expense_date,
      payment_method, reference_number, notes
    } = expenseData;

    const result = await db.query(`
      UPDATE expenses SET
        description = $1, category = $2, amount = $3,
        expense_date = $4, payment_method = $5,
        reference_number = $6, notes = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      description, category, amount, expense_date,
      payment_method, reference_number, notes, id
    ]);

    return result.rows[0];
  }

  /**
   * Approve expense
   */
  static async approve(id, approvedBy) {
    const result = await db.query(`
      UPDATE expenses SET
        is_approved = true, approved_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [approvedBy, id]);

    return result.rows[0];
  }

  /**
   * Delete expense
   */
  static async delete(id) {
    await db.query('DELETE FROM expenses WHERE id = $1', [id]);
    return true;
  }

  /**
   * Get expense summary for date range
   */
  static async getSummary(fromDate, toDate) {
    const result = await db.query(`
      SELECT
        SUM(amount) as total_expenses,
        COUNT(*) as total_count,
        category,
        DATE(expense_date) as expense_date
      FROM expenses
      WHERE expense_date >= $1 AND expense_date <= $2
      AND is_approved = true
      GROUP BY category, DATE(expense_date)
      ORDER BY expense_date DESC
    `, [fromDate, toDate]);

    return result.rows;
  }

  /**
   * Get expense categories
   */
  static async getCategories() {
    const result = await db.query(
      'SELECT DISTINCT category FROM expenses ORDER BY category'
    );
    return result.rows.map(row => row.category);
  }
}

module.exports = ExpenseModel;
