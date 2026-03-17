import Click from '../models/Click.js';
import ServiceError from './ServiceError.js';

class ClickService {
  constructor(clickModel = new Click()) {
    this.clickModel = clickModel;
  }

  sanitizeIp(ipAddress) {
    if (!ipAddress) {
      return null;
    }

    const trimmedIp = ipAddress.trim();
    if (trimmedIp.length > 45) {
      throw new ServiceError('Invalid IP address', 400, 'INVALID_IP');
    }

    return trimmedIp;
  }

  parseDateRange(startDate, endDate) {
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      throw new ServiceError('Invalid date range', 400, 'INVALID_DATE_RANGE');
    }

    if (parsedStartDate > parsedEndDate) {
      throw new ServiceError('startDate cannot be after endDate', 400, 'INVALID_DATE_ORDER');
    }

    return { parsedStartDate, parsedEndDate };
  }

  async recordClick(urlId, ipAddress = null) {
    const safeIp = this.sanitizeIp(ipAddress);
    return this.clickModel.create(urlId, safeIp);
  }

  async getClicksByUrlId(urlId, limit = 100) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    return this.clickModel.findByUrlId(urlId, safeLimit);
  }

  async getStatistics(urlId) {
    return this.clickModel.getStatistics(urlId);
  }

  async getClickCountByDateRange(urlId, startDate, endDate) {
    const { parsedStartDate, parsedEndDate } = this.parseDateRange(startDate, endDate);
    return this.clickModel.getClickCountByDateRange(urlId, parsedStartDate, parsedEndDate);
  }
}

export default ClickService;
