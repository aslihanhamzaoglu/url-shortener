import Click from '../models/Click.js';
import Url from '../models/Url.js';

class ClickService {
  constructor(clickModel = new Click(), urlModel = new Url()) {
    this.clickModel = clickModel;
    this.urlModel = urlModel;
  }

  extractIpAddress(rawIpAddress) {
    if (!rawIpAddress) {
      return null;
    }

    const address = String(rawIpAddress).split(',')[0].trim();
    return address || null;
  }

  async recordClick(shortCode, rawIpAddress = null) {
    if (!shortCode) {
      throw new Error('Short code is required');
    }

    const url = await this.urlModel.findByShortCode(String(shortCode).trim());
    if (!url) {
      throw new Error('URL not found or expired');
    }

    const ipAddress = this.extractIpAddress(rawIpAddress);

    await Promise.all([
      this.clickModel.create(url.id, ipAddress),
      this.urlModel.incrementClickCount(url.id)
    ]);

    return {
      originalUrl: url.original_url,
      shortCode: url.short_code,
      clickCount: url.click_count + 1
    };
  }

  async getUrlStatistics(shortCode, userId) {
    if (!shortCode || !Number.isInteger(userId) || userId <= 0) {
      throw new Error('shortCode and valid userId are required');
    }

    const url = await this.urlModel.findByShortCodeForUser(String(shortCode).trim(), userId);
    if (!url) {
      throw new Error('URL not found');
    }

    const statistics = await this.clickModel.getStatistics(url.id);

    return {
      shortCode: url.short_code,
      originalUrl: url.original_url,
      ...statistics
    };
  }
}

export default ClickService;
