import Url from '../models/Url.js';
import ServiceError from './ServiceError.js';

class UrlService {
  constructor(urlModel = new Url()) {
    this.urlModel = urlModel;
  }

  validateOriginalUrl(originalUrl) {
    try {
      const parsedUrl = new URL(originalUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new ServiceError('URL must use HTTP or HTTPS', 400, 'INVALID_URL_PROTOCOL');
      }
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw new ServiceError('Invalid URL format', 400, 'INVALID_URL');
    }
  }

  validateCustomAlias(customAlias) {
    if (!customAlias) {
      return;
    }

    const aliasRegex = /^[a-zA-Z0-9_-]{3,10}$/;
    if (!aliasRegex.test(customAlias)) {
      throw new ServiceError(
        'Custom alias must be 3-10 characters and contain only letters, numbers, _ or -',
        400,
        'INVALID_ALIAS'
      );
    }
  }

  parseExpiration(expiresAt) {
    if (!expiresAt) {
      return null;
    }

    const date = new Date(expiresAt);
    if (Number.isNaN(date.getTime())) {
      throw new ServiceError('Invalid expiration date', 400, 'INVALID_EXPIRATION');
    }

    if (date <= new Date()) {
      throw new ServiceError('Expiration date must be in the future', 400, 'PAST_EXPIRATION');
    }

    return date;
  }

  async createShortUrl({ originalUrl, userId = null, customAlias = null, expiresAt = null }) {
    this.validateOriginalUrl(originalUrl);
    this.validateCustomAlias(customAlias);

    try {
      const parsedExpiration = this.parseExpiration(expiresAt);
      return await this.urlModel.create(originalUrl, userId, customAlias, parsedExpiration);
    } catch (error) {
      if (error.message === 'Custom alias already in use') {
        throw new ServiceError(error.message, 409, 'ALIAS_EXISTS');
      }
      throw error;
    }
  }

  async resolveByShortCode(shortCode) {
    const url = await this.urlModel.findByShortCode(shortCode);
    if (!url) {
      throw new ServiceError('Short URL not found or expired', 404, 'URL_NOT_FOUND');
    }

    return url;
  }

  async getUserUrls(userId, page = 1, limit = 20) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const offset = (safePage - 1) * safeLimit;

    const [urls, total] = await Promise.all([
      this.urlModel.findByUserId(userId, safeLimit, offset),
      this.urlModel.countByUserId(userId)
    ]);

    return {
      data: urls,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit)
      }
    };
  }

  async updateDestination(shortCode, userId, newOriginalUrl) {
    this.validateOriginalUrl(newOriginalUrl);

    const updated = await this.urlModel.updateDestination(shortCode, userId, newOriginalUrl);
    if (!updated) {
      throw new ServiceError('URL not found or access denied', 404, 'URL_UPDATE_FORBIDDEN');
    }

    return this.urlModel.findByShortCodeForUser(shortCode, userId);
  }

  async deleteUrl(shortCode, userId) {
    const deleted = await this.urlModel.softDelete(shortCode, userId);
    if (!deleted) {
      throw new ServiceError('URL not found or access denied', 404, 'URL_DELETE_FORBIDDEN');
    }

    return { deleted: true };
  }

  async incrementClickCount(urlId) {
    await this.urlModel.incrementClickCount(urlId);
  }
}

export default UrlService;
