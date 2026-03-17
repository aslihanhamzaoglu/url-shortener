import User from '../models/User.js';

class UserService {
  constructor(userModel = new User()) {
    this.userModel = userModel;
  }

  createError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      throw this.createError('Email is required');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      throw this.createError('Invalid email format');
    }

    return normalizedEmail;
  }

  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      throw this.createError('Password is required');
    }

    if (password.length < 8) {
      throw this.createError('Password must be at least 8 characters long');
    }

    return password;
  }

  async register(email, password) {
    const normalizedEmail = this.validateEmail(email);
    const validatedPassword = this.validatePassword(password);

    const emailExists = await this.userModel.emailExists(normalizedEmail);
    if (emailExists) {
      throw this.createError('Email already registered', 409);
    }

    return this.userModel.create(normalizedEmail, validatedPassword);
  }

  async login(email, password) {
    const normalizedEmail = this.validateEmail(email);
    this.validatePassword(password);

    const user = await this.userModel.verifyPassword(normalizedEmail, password);
    if (!user) {
      throw this.createError('Invalid email or password', 401);
    }

    return user;
  }

  async getById(id) {
    if (!Number.isInteger(id) || id <= 0) {
      throw this.createError('Invalid user id');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw this.createError('User not found', 404);
    }

    return user;
  }
}

export default UserService;
