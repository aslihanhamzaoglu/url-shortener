import pool from '../config/database.js';

class Click {
  
    /**
     * Record a click event
     * @param {number} urlId - URL ID
     * @param {string|null} ipAddress - IP address of the visitor (optional)
     * @returns {Promise<object>} Created click record
     */
    async create(urlId, ipAddress = null) {
      const [result] = await pool.execute(
        'INSERT INTO clicks (url_id, ip_address) VALUES (?, ?)',
        [urlId, ipAddress]
      );
  
      return {
        id: result.insertId,
        urlId,
        ipAddress,
        clickedAt: new Date()
      };
    }
  
    /**
     * Get all clicks for a specific URL
     * @param {number} urlId - URL ID
     * @param {number} limit - Number of results (default 100)
     * @returns {Promise<Array>} Array of click records
     */
    async findByUrlId(urlId, limit = 100) {
      const [rows] = await pool.execute(
        `SELECT id, url_id, clicked_at, ip_address
         FROM clicks 
         WHERE url_id = ?
         ORDER BY clicked_at DESC
         LIMIT ?`,
        [urlId, limit]
      );
  
      return rows;
    }
  
    /**
     * Get click statistics for a URL
     * @param {number} urlId - URL ID
     * @returns {Promise<object>} Statistics object
     */
    async getStatistics(urlId) {
      // Total clicks
      const [totalRows] = await pool.execute(
        'SELECT COUNT(*) as total FROM clicks WHERE url_id = ?',
        [urlId]
      );
  
      // Clicks by date (last 30 days)
      const [dailyRows] = await pool.execute(
        `SELECT DATE(clicked_at) as date, COUNT(*) as clicks
         FROM clicks 
         WHERE url_id = ? AND clicked_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(clicked_at)
         ORDER BY date DESC`,
        [urlId]
      );
  
      // Recent clicks (last 10)
      const [recentRows] = await pool.execute(
        `SELECT id, clicked_at, ip_address
         FROM clicks 
         WHERE url_id = ?
         ORDER BY clicked_at DESC
         LIMIT 10`,
        [urlId]
      );
  
      return {
        totalClicks: totalRows[0].total,
        dailyClicks: dailyRows,
        recentClicks: recentRows
      };
    }
  
    /**
     * Get click count for a specific date range
     * @param {number} urlId - URL ID
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<number>} Click count
     */
    async getClickCountByDateRange(urlId, startDate, endDate) {
      const [rows] = await pool.execute(
        `SELECT COUNT(*) as count
         FROM clicks 
         WHERE url_id = ? AND clicked_at BETWEEN ? AND ?`,
        [urlId, startDate, endDate]
      );
  
      return rows[0].count;
    }
  
    /**
     * Delete all clicks for a URL (cascade on URL deletion)
     * This is handled by the database CASCADE, but kept for manual cleanup if needed
     * @param {number} urlId - URL ID
     * @returns {Promise<number>} Number of clicks deleted
     */
    async deleteByUrlId(urlId) {
      const [result] = await pool.execute(
        'DELETE FROM clicks WHERE url_id = ?',
        [urlId]
      );
  
      return result.affectedRows;
    }
  }
  
  export default Click;