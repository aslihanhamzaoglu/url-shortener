import User from '../models/User.js';
import ServiceError from './ServiceError.js';

class UserService {
  constructor(userModel = new User()) {
    this.userModel = userModel;
  }

  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ServiceError('Invalid email format', 400, 'INVALID_EMAIL');
    }
  }

  validatePassword(password) {
    if (!password || password.length < 8) {
      throw new ServiceError('Password must be at least 8 characters long', 400, 'WEAK_PASSWORD');
    }
  }

  async register(email, password) {
    this.validateEmail(email);
    this.validatePassword(password);

    const normalizedEmail = email.trim().toLowerCase();
    const exists = await this.userModel.emailExists(normalizedEmail);

    if (exists) {
      throw new ServiceError('Email is already in use', 409, 'EMAIL_EXISTS');
    }

    return this.userModel.create(normalizedEmail, password);
  }

  async authenticate(email, password) {
    this.validateEmail(email);

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userModel.verifyPassword(normalizedEmail, password);

    if (!user) {
      throw new ServiceError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    return user;
  }

  async getById(userId) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new ServiceError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  }
}

export default UserService;
