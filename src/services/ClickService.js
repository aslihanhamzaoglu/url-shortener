import Click from '../models/Click.js';
import Url from '../models/Url.js';

class ClickService {
  constructor(clickModel = new Click(), urlModel = new Url()) {
    this.clickModel = clickModel;
    this.urlModel = urlModel;
  }

  createError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  validateShortCode(shortCode) {
    if (!shortCode || typeof shortCode !== 'string') {
      throw this.createError('Short code is required');
    }

    const normalizedShortCode = shortCode.trim();
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(normalizedShortCode)) {
      throw this.createError('Invalid short code format');
    }

    return normalizedShortCode;
  }

  validateUserId(userId) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw this.createError('Invalid user id');
    }

    return userId;
  }

  sanitizeIpAddress(ipAddress) {
    if (!ipAddress) {
      return null;
    }

    return String(ipAddress).slice(0, 45);
  }

  async recordClick(shortCode, ipAddress = null) {
    const validatedShortCode = this.validateShortCode(shortCode);
    const url = await this.urlModel.findByShortCode(validatedShortCode);

    if (!url) {
      throw this.createError('Short URL not found or expired', 404);
    }

    const safeIp = this.sanitizeIpAddress(ipAddress);
    const click = await this.clickModel.create(url.id, safeIp);
    await this.urlModel.incrementClickCount(url.id);

    return {
      click,
      url
    };
  }

  async getUrlStatistics(shortCode, userId) {
    const validatedShortCode = this.validateShortCode(shortCode);
    const validatedUserId = this.validateUserId(userId);

    const url = await this.urlModel.findByShortCodeForUser(validatedShortCode, validatedUserId);
    if (!url) {
      throw this.createError('URL not found or unauthorized', 404);
    }

    const statistics = await this.clickModel.getStatistics(url.id);
    return {
      url,
      ...statistics
    };
  }

  async getClicksForUrl(shortCode, userId, limit = 100) {
    const validatedShortCode = this.validateShortCode(shortCode);
    const validatedUserId = this.validateUserId(userId);

    const safeLimit = Number.parseInt(limit, 10);
    if (!Number.isInteger(safeLimit) || safeLimit <= 0 || safeLimit > 500) {
      throw this.createError('Limit must be an integer between 1 and 500');
    }

    const url = await this.urlModel.findByShortCodeForUser(validatedShortCode, validatedUserId);
    if (!url) {
      throw this.createError('URL not found or unauthorized', 404);
    }

    return this.clickModel.findByUrlId(url.id, safeLimit);
  }
}

export default ClickService;
