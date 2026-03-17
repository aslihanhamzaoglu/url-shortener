import Url from '../models/Url.js';

class UrlService {
  constructor(urlModel = new Url()) {
    this.urlModel = urlModel;
  }

  isValidHttpUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  validateAlias(customAlias) {
    if (!customAlias) {
      return null;
    }

    const cleanedAlias = String(customAlias).trim();
    if (!/^[a-zA-Z0-9_-]{3,10}$/.test(cleanedAlias)) {
      throw new Error('Custom alias must be 3-10 characters and only contain letters, numbers, underscores, or hyphens');
    }

    return cleanedAlias;
  }

  normalizePagination(limit = 20, page = 1) {
    const normalizedLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
    const normalizedPage = Math.max(1, Number(page) || 1);
    const offset = (normalizedPage - 1) * normalizedLimit;
    return { limit: normalizedLimit, page: normalizedPage, offset };
  }

  async createShortUrl({ originalUrl, userId = null, customAlias = null, expiresAt = null }) {
    if (!originalUrl || !this.isValidHttpUrl(originalUrl)) {
      throw new Error('A valid http/https URL is required');
    }

    if (userId !== null && (!Number.isInteger(userId) || userId <= 0)) {
      throw new Error('userId must be a positive integer when provided');
    }

    const alias = this.validateAlias(customAlias);

    return this.urlModel.create(originalUrl, userId, alias, expiresAt);
  }

  async resolveShortCode(shortCode) {
    if (!shortCode) {
      throw new Error('Short code is required');
    }

    const url = await this.urlModel.findByShortCode(String(shortCode).trim());
    if (!url) {
      throw new Error('URL not found or expired');
    }

    return url;
  }

  async listUserUrls(userId, { page = 1, limit = 20 } = {}) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('A valid user id is required');
    }

    const pagination = this.normalizePagination(limit, page);
    const [urls, total] = await Promise.all([
      this.urlModel.findByUserId(userId, pagination.limit, pagination.offset),
      this.urlModel.countByUserId(userId)
    ]);

    return {
      data: urls,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit)
      }
    };
  }

  async updateDestination({ shortCode, userId, newOriginalUrl }) {
    if (!shortCode || !Number.isInteger(userId) || userId <= 0 || !this.isValidHttpUrl(newOriginalUrl)) {
      throw new Error('shortCode, valid userId, and a valid newOriginalUrl are required');
    }

    const updated = await this.urlModel.updateDestination(String(shortCode).trim(), userId, newOriginalUrl);
    if (!updated) {
      throw new Error('URL not found or update not allowed');
    }

    return { updated: true };
  }

  async softDelete({ shortCode, userId }) {
    if (!shortCode || !Number.isInteger(userId) || userId <= 0) {
      throw new Error('shortCode and valid userId are required');
    }

    const deleted = await this.urlModel.softDelete(String(shortCode).trim(), userId);
    if (!deleted) {
      throw new Error('URL not found or delete not allowed');
    }

    return { deleted: true };
  }
}

export default UrlService;
