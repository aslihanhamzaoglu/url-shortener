import crypto from 'crypto';
import pool from '../config/database.js';


class Url {

  /**
   * Generate a unique short code using Base62 encoding
   * @returns {string} 6-character short code
   */
  generateShortCode() {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomBytes = crypto.randomBytes(4);
    let shortCode = '';
    
    for (let i = 0; i < 6; i++) {
      const index = randomBytes[i % 4] % chars.length;
      shortCode += chars[index];
    }
    
    return shortCode;
  }

  /**
   * Create a shortened URL
   * @param {string} originalUrl - The original long URL
   * @param {number|null} userId - User ID (null for anonymous)
   * @param {string|null} customAlias - Custom short code (optional)
   * @param {Date|null} expiresAt - Expiration date (optional)
   * @returns {Promise<object>} Created URL object
   */
  async create(originalUrl, userId = null, customAlias = null, expiresAt = null) {
    let shortCode = customAlias;
    let isCustomAlias = false;

    // If custom alias provided, check if it's available
    if (customAlias) {
      const exists = await this.shortCodeExists(customAlias);
      if (exists) {
        throw new Error('Custom alias already in use');
      }
      isCustomAlias = true;
    } else {
      // Generate unique short code
      let attempts = 0;
      do {
        shortCode = this.generateShortCode();
        attempts++;
        if (attempts > 10) {
          throw new Error('Failed to generate unique short code');
        }
      } while (await this.shortCodeExists(shortCode));
    }

    // Set default expiration based on user type if not provided
    if (!expiresAt) {
      const expirationDays = userId ? 365 : 7; // 1 year for authenticated, 7 days for anonymous
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expirationDays);
    }

    const [result] = await pool.execute(
      `INSERT INTO urls (user_id, original_url, short_code, is_custom_alias, expires_at) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, originalUrl, shortCode, isCustomAlias, expiresAt]
    );

    return {
      id: result.insertId,
      userId,
      originalUrl,
      shortCode,
      isCustomAlias,
      expiresAt,
      clickCount: 0,
      createdAt: new Date()
    };
  }

  /**
   * Check if short code already exists
   * @param {string} shortCode - Short code to check
   * @returns {Promise<boolean>} True if exists
   */
  async shortCodeExists(shortCode) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM urls WHERE short_code = ? AND is_active = TRUE',
      [shortCode]
    );

    return rows[0].count > 0;
  }

  /**
   * Find URL by short code (only active, non-expired)
   * @param {string} shortCode - Short code to find
   * @returns {Promise<object|null>} URL object or null
   */
  async findByShortCode(shortCode) {
    const [rows] = await pool.execute(
      `SELECT id, user_id, original_url, short_code, is_custom_alias, 
              created_at, updated_at, expires_at, click_count, is_active
       FROM urls 
       WHERE short_code = ? AND is_active = TRUE AND deleted_at IS NULL
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [shortCode]
    );

    return rows[0] || null;
  }

  /**
   * Find URL by short code including expired/deleted (for owner access)
   * @param {string} shortCode - Short code to find
   * @param {number} userId - User ID to verify ownership
   * @returns {Promise<object|null>} URL object or null
   */
  async findByShortCodeForUser(shortCode, userId) {
    const [rows] = await pool.execute(
      `SELECT id, user_id, original_url, short_code, is_custom_alias, 
              created_at, updated_at, expires_at, click_count, is_active, deleted_at
       FROM urls 
       WHERE short_code = ? AND user_id = ?`,
      [shortCode, userId]
    );

    return rows[0] || null;
  }

  /**
   * Get all URLs for a user (paginated)
   * @param {number} userId - User ID
   * @param {number} limit - Number of results per page
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} Array of URL objects
   */
  async findByUserId(userId, limit = 20, offset = 0) {
    const [rows] = await pool.execute(
      `SELECT id, original_url, short_code, is_custom_alias, 
              created_at, updated_at, expires_at, click_count, is_active
       FROM urls 
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    return rows;
  }

  /**
   * Get total count of URLs for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Total count
   */
  async countByUserId(userId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM urls WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    );

    return rows[0].count;
  }

  /**
   * Update the destination URL
   * @param {string} shortCode - Short code of URL to update
   * @param {number} userId - User ID (for authorization)
   * @param {string} newOriginalUrl - New destination URL
   * @returns {Promise<boolean>} True if updated successfully
   */
  async updateDestination(shortCode, userId, newOriginalUrl) {
    const [result] = await pool.execute(
      `UPDATE urls 
       SET original_url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE short_code = ? AND user_id = ? AND deleted_at IS NULL`,
      [newOriginalUrl, shortCode, userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * Soft delete a URL
   * @param {string} shortCode - Short code to delete
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async softDelete(shortCode, userId) {
    const [result] = await pool.execute(
      `UPDATE urls 
       SET is_active = FALSE, deleted_at = CURRENT_TIMESTAMP
       WHERE short_code = ? AND user_id = ? AND deleted_at IS NULL`,
      [shortCode, userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * Increment click count for a URL
   * @param {number} urlId - URL ID
   * @returns {Promise<void>}
   */
  async incrementClickCount(urlId) {
    await pool.execute(
      'UPDATE urls SET click_count = click_count + 1 WHERE id = ?',
      [urlId]
    );
  }

  /**
   * Purge soft-deleted URLs older than 30 days
   * @returns {Promise<number>} Number of URLs purged
   */
  async purgeOldDeletedUrls() {
    const [result] = await pool.execute(
      `DELETE FROM urls 
       WHERE deleted_at IS NOT NULL 
       AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    return result.affectedRows;
  }
}

export default Url;