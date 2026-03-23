// User Model
// Handles user database operations

const db = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');

/**
 * User model class
 */
class UserModel {
  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const result = await db.query('SELECT id, name, email, role, is_active, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  /**
   * Create new user
   */
  static async create(userData) {
    const { name, email, password, role } = userData;
    const hash = await hashPassword(password);
    
    const result = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, hash, role]
    );
    return result.rows[0];
  }

  /**
   * Verify user password
   */
  static async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return null;
    }

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user
   */
  static async update(id, userData) {
    const { name, role, is_active } = userData;
    const result = await db.query(
      'UPDATE users SET name = $1, role = $2, is_active = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING id, name, email, role, is_active',
      [name, role, is_active, id]
    );
    return result.rows[0];
  }

  /**
   * Get all users with pagination
   */
  static async getAll(offset = 0, limit = 10) {
    const result = await db.query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    const countResult = await db.query('SELECT COUNT(*) as total FROM users');
    return {
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      offset,
      limit
    };
  }

  /**
   * Delete user (soft delete)
   */
  static async delete(id) {
    await db.query('UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    return true;
  }
}

module.exports = UserModel;
