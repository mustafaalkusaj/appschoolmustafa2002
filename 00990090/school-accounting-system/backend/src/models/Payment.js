// Payment Model
// Handles payment database operations

const db = require('../config/database');
const { generateReceiptNumber } = require('../utils/helpers');

/**
 * Payment model class
 */
class PaymentModel {
  /**
   * Get all payments with pagination and filters
   */
  static async getAll(filters = {}, offset = 0, limit = 10) {
    let query = `
      SELECT p.*, s.admission_number, s.first_name, s.last_name,
             u.name as recorded_by
      FROM payments p
      LEFT JOIN students s ON p.student_id = s.id
      LEFT JOIN users u ON p.created_by = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramCount = 1;

    if (filters.student_id) {
      query += ` AND p.student_id = $${paramCount}`;
      values.push(filters.student_id);
      paramCount++;
    }

    if (filters.from_date) {
      query += ` AND p.payment_date >= $${paramCount}`;
      values.push(filters.from_date);
      paramCount++;
    }

    if (filters.to_date) {
      query += ` AND p.payment_date <= $${paramCount}`;
      values.push(filters.to_date);
      paramCount++;
    }

    query += ` ORDER BY p.payment_date DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await db.query(query, values);

    // Count total
    let countQuery = 'SELECT COUNT(*) as total FROM payments WHERE 1=1';
    const countValues = [];

    if (filters.student_id) {
      countQuery += ` AND student_id = $${countValues.length + 1}`;
      countValues.push(filters.student_id);
    }

    if (filters.from_date) {
      countQuery += ` AND payment_date >= $${countValues.length + 1}`;
      countValues.push(filters.from_date);
    }

    if (filters.to_date) {
      countQuery += ` AND payment_date <= $${countValues.length + 1}`;
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
   * Get payment by ID
   */
  static async getById(id) {
    const result = await db.query(
      `SELECT p.*, s.admission_number, s.first_name, s.last_name
       FROM payments p
       LEFT JOIN students s ON p.student_id = s.id
       WHERE p.id = $1`, [id]
    );
    return result.rows[0];
  }

  /**
   * Record a payment
   */
  static async create(paymentData) {
    const {
      student_id, student_fee_id, amount,
      payment_method, reference_number, notes, created_by
    } = paymentData;

    const receipt_number = generateReceiptNumber();

    const result = await db.query(`
      INSERT INTO payments (
        student_id, student_fee_id, amount, payment_method,
        reference_number, receipt_number, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      student_id, student_fee_id, amount, payment_method,
      reference_number, receipt_number, notes, created_by
    ]);

    return result.rows[0];
  }

  /**
   * Update payment
   */
  static async update(id, paymentData) {
    const { amount, payment_method, reference_number, notes } = paymentData;

    const result = await db.query(`
      UPDATE payments SET
        amount = $1, payment_method = $2, reference_number = $3,
        notes = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [amount, payment_method, reference_number, notes, id]);

    return result.rows[0];
  }

  /**
   * Delete payment
   */
  static async delete(id) {
    await db.query('DELETE FROM payments WHERE id = $1', [id]);
    return true;
  }

  /**
   * Get payment summary for date range
   */
  static async getSummary(fromDate, toDate) {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_payments,
        SUM(amount) as total_amount,
        COUNT(DISTINCT student_id) as total_students,
        payment_method,
        DATE(payment_date) as payment_date
      FROM payments
      WHERE payment_date >= $1 AND payment_date <= $2
      GROUP BY payment_method, DATE(payment_date)
      ORDER BY payment_date DESC
    `, [fromDate, toDate]);

    return result.rows;
  }

  /**
   * Get student payments
   */
  static async getStudentPayments(studentId) {
    const result = await db.query(`
      SELECT p.* FROM payments p
      WHERE p.student_id = $1
      ORDER BY p.payment_date DESC
    `, [studentId]);

    return result.rows;
  }
}

module.exports = PaymentModel;
