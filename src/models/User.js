import bcrypt from 'bcrypt';
import pool from '../config/database.js';

class User {

  /**
   * Create a new user
   * @param {string} email - User's email
   * @param {string} password - Plain text password
   * @returns {Promise<object>} Created user object (without password)
   */
  async create(email, password) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.execute(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email, passwordHash]
    );

    return {
      id: result.insertId,
      email,
      createdAt: new Date()
    };
  }

  /**
   * Find user by email
   * @param {string} email - User's email
   * @returns {Promise<object|null>} User object or null
   */
  async findByEmail(email) {
    const [rows] = await pool.execute(
      'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = ?',
      [email]
    );

    return rows[0] || null;
  }

  /**
   * Find user by ID
   * @param {number} id - User's ID
   * @returns {Promise<object|null>} User object (without password) or null
   */
  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, email, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    return rows[0] || null;
  }

  /**
   * Verify user password
   * @param {string} email - User's email
   * @param {string} password - Plain text password to verify
   * @returns {Promise<object|null>} User object (without password) if valid, null otherwise
   */
  async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return null;
    }

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Check if email already exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} True if exists
   */
  async emailExists(email) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM users WHERE email = ?',
      [email]
    );

    return rows[0].count > 0;
  }
}

export default User;