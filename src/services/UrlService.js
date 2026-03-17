import Url from '../models/Url.js';

class UrlService {
  constructor(urlModel = new Url()) {
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

  validateOriginalUrl(originalUrl) {
    if (!originalUrl || typeof originalUrl !== 'string') {
      throw this.createError('Original URL is required');
    }

    const normalizedUrl = originalUrl.trim();

    let parsedUrl;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      throw this.createError('Invalid URL format');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw this.createError('URL must use HTTP or HTTPS protocol');
    }

    return normalizedUrl;
  }

  validatePagination(limit = 20, page = 1) {
    const safeLimit = Number.parseInt(limit, 10);
    const safePage = Number.parseInt(page, 10);

    if (!Number.isInteger(safeLimit) || safeLimit <= 0 || safeLimit > 100) {
      throw this.createError('Limit must be an integer between 1 and 100');
    }

    if (!Number.isInteger(safePage) || safePage <= 0) {
      throw this.createError('Page must be a positive integer');
    }

    return {
      limit: safeLimit,
      page: safePage,
      offset: (safePage - 1) * safeLimit
    };
  }

  validateUserId(userId) {
    if (userId === null || userId === undefined) {
      return null;
    }

    if (!Number.isInteger(userId) || userId <= 0) {
      throw this.createError('Invalid user id');
    }

    return userId;
  }

  async createShortUrl(originalUrl, userId = null, customAlias = null, expiresAt = null) {
    const validatedOriginalUrl = this.validateOriginalUrl(originalUrl);
    const validatedUserId = this.validateUserId(userId);
    const validatedAlias = customAlias ? this.validateShortCode(customAlias) : null;

    const parsedExpirationDate = expiresAt ? new Date(expiresAt) : null;
    if (parsedExpirationDate && Number.isNaN(parsedExpirationDate.getTime())) {
      throw this.createError('Invalid expiration date');
    }

    if (parsedExpirationDate && parsedExpirationDate <= new Date()) {
      throw this.createError('Expiration date must be in the future');
    }

    return this.urlModel.create(
      validatedOriginalUrl,
      validatedUserId,
      validatedAlias,
      parsedExpirationDate
    );
  }

  async resolveShortCode(shortCode) {
    const validatedShortCode = this.validateShortCode(shortCode);
    const url = await this.urlModel.findByShortCode(validatedShortCode);

    if (!url) {
      throw this.createError('Short URL not found or expired', 404);
    }

    return url;
  }

  async getUserUrls(userId, limit = 20, page = 1) {
    const validatedUserId = this.validateUserId(userId);
    if (!validatedUserId) {
      throw this.createError('User id is required');
    }

    const { offset, limit: safeLimit, page: safePage } = this.validatePagination(limit, page);

    const [items, total] = await Promise.all([
      this.urlModel.findByUserId(validatedUserId, safeLimit, offset),
      this.urlModel.countByUserId(validatedUserId)
    ]);

    return {
      items,
      pagination: {
        total,
        limit: safeLimit,
        page: safePage,
        totalPages: Math.ceil(total / safeLimit)
      }
    };
  }

  async updateDestination(shortCode, userId, newOriginalUrl) {
    const validatedShortCode = this.validateShortCode(shortCode);
    const validatedUserId = this.validateUserId(userId);
    const validatedOriginalUrl = this.validateOriginalUrl(newOriginalUrl);

    const updated = await this.urlModel.updateDestination(
      validatedShortCode,
      validatedUserId,
      validatedOriginalUrl
    );

    if (!updated) {
      throw this.createError('URL not found or unauthorized', 404);
    }

    return true;
  }

  async deleteUrl(shortCode, userId) {
    const validatedShortCode = this.validateShortCode(shortCode);
    const validatedUserId = this.validateUserId(userId);

    const deleted = await this.urlModel.softDelete(validatedShortCode, validatedUserId);
    if (!deleted) {
      throw this.createError('URL not found or unauthorized', 404);
    }

    return true;
  }

  async purgeDeletedUrls() {
    return this.urlModel.purgeOldDeletedUrls();
  }
}

export default UrlService;
