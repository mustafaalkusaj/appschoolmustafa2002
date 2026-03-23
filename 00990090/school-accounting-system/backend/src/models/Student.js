// Student Model
// Handles student database operations

const db = require('../config/database');

/**
 * Student model class
 */
class StudentModel {
  /**
   * Get all students with pagination and filters
   */
  static async getAll(filters = {}, offset = 0, limit = 10) {
    let query = `
      SELECT s.*, c.name as class_name, sec.name as section_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE s.is_active = true
    `;
    const values = [];
    let paramCount = 1;

    // Add filters
    if (filters.class_id) {
      query += ` AND s.class_id = $${paramCount}`;
      values.push(filters.class_id);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (s.first_name ILIKE $${paramCount} OR s.last_name ILIKE $${paramCount} OR s.admission_number LIKE $${paramCount})`;
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    // Add pagination
    query += ` ORDER BY s.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await db.query(query, values);
    
    // Count total
    let countQuery = 'SELECT COUNT(*) as total FROM students WHERE is_active = true';
    const countValues = [];

    if (filters.class_id) {
      countQuery += ' AND class_id = $1';
      countValues.push(filters.class_id);
    }

    if (filters.search) {
      countQuery += ` AND (first_name ILIKE $${countValues.length + 1} OR last_name ILIKE $${countValues.length + 1} OR admission_number LIKE $${countValues.length + 1})`;
      countValues.push(`%${filters.search}%`);
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
   * Get student by ID with payment summary
   */
  static async getById(id) {
    const result = await db.query(`
      SELECT s.*, c.name as class_name, sec.name as section_name,
             COALESCE(SUM(sf.amount), 0) as total_fees,
             COALESCE(SUM(sf.total_paid), 0) as total_paid
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN student_fees sf ON s.id = sf.student_id
      WHERE s.id = $1 AND s.is_active = true
      GROUP BY s.id, c.name, sec.name
    `, [id]);
    
    return result.rows[0];
  }

  /**
   * Get student by admission number
   */
  static async getByAdmissionNumber(admissionNumber) {
    const result = await db.query(
      'SELECT * FROM students WHERE admission_number = $1 AND is_active = true',
      [admissionNumber]
    );
    return result.rows[0];
  }

  /**
   * Create new student
   */
  static async create(studentData) {
    const {
      admission_number, first_name, last_name, email, phone,
      date_of_birth, address, parent_name, parent_phone,
      parent_email, class_id, section_id
    } = studentData;

    const result = await db.query(`
      INSERT INTO students (
        admission_number, first_name, last_name, email, phone,
        date_of_birth, address, parent_name, parent_phone,
        parent_email, class_id, section_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      admission_number, first_name, last_name, email, phone,
      date_of_birth, address, parent_name, parent_phone,
      parent_email, class_id, section_id
    ]);

    return result.rows[0];
  }

  /**
   * Update student
   */
  static async update(id, studentData) {
    const {
      first_name, last_name, email, phone, date_of_birth,
      address, parent_name, parent_phone, parent_email,
      class_id, section_id, is_active
    } = studentData;

    const result = await db.query(`
      UPDATE students SET
        first_name = $1, last_name = $2, email = $3, phone = $4,
        date_of_birth = $5, address = $6, parent_name = $7,
        parent_phone = $8, parent_email = $9, class_id = $10,
        section_id = $11, is_active = $12, updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `, [
      first_name, last_name, email, phone, date_of_birth,
      address, parent_name, parent_phone, parent_email,
      class_id, section_id, is_active, id
    ]);

    return result.rows[0];
  }

  /**
   * Delete student (soft delete)
   */
  static async delete(id) {
    await db.query(
      'UPDATE students SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return true;
  }

  /**
   * Get student payment summary
   */
  static async getPaymentSummary(id) {
    const result = await db.query(`
      SELECT 
        s.id, s.admission_number, CONCAT(s.first_name, ' ', s.last_name) as student_name,
        COUNT(sf.id) as total_fees,
        SUM(sf.amount) as total_fee_amount,
        SUM(CASE WHEN sf.status = 'paid' THEN sf.amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN sf.status IN ('pending', 'overdue') THEN sf.amount - COALESCE(sf.total_paid, 0) ELSE 0 END) as total_pending
      FROM students s
      LEFT JOIN student_fees sf ON s.id = sf.student_id
      WHERE s.id = $1 AND s.is_active = true
      GROUP BY s.id
    `, [id]);

    return result.rows[0];
  }
}

module.exports = StudentModel;
