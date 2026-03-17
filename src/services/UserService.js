import User from '../models/User.js';

class UserService {
  constructor(userModel = new User()) {
    this.userModel = userModel;
  }

  normalizeEmail(email) {
    return String(email).trim().toLowerCase();
  }

  validateCredentials(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const normalizedEmail = this.normalizeEmail(email);

    if (!normalizedEmail.includes('@')) {
      throw new Error('Invalid email format');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    return { normalizedEmail, password };
  }

  async register(email, password) {
    const { normalizedEmail, password: validatedPassword } = this.validateCredentials(email, password);

    const emailExists = await this.userModel.emailExists(normalizedEmail);
    if (emailExists) {
      throw new Error('Email is already in use');
    }

    return this.userModel.create(normalizedEmail, validatedPassword);
  }

  async authenticate(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const normalizedEmail = this.normalizeEmail(email);
    const user = await this.userModel.verifyPassword(normalizedEmail, password);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    return user;
  }

  async getById(userId) {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('A valid user id is required');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}

export default UserService;
