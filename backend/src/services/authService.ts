import { AuthenticationError } from '../shared/errors.js';
import { findSessionUserById, findUserByEmailWithPassword, updateLastLogin } from '../repositories/userRepository.js';
import { comparePassword } from '../utils/crypto.js';
import { generateToken } from '../utils/jwt.js';
import logger from '../utils/logger.js';

export async function login(email: string, password: string) {
  const user = await findUserByEmailWithPassword(email);
  if (!user) {
    logger.warn({ email }, 'Login attempt with invalid email');
    throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  if (user.status !== 'active') {
    logger.warn({ userId: user.id, status: user.status }, 'Login attempt with inactive account');
    throw new AuthenticationError('Account is inactive or blocked', 'ACCOUNT_LOCKED');
  }

  const passwordHash = String(user.password_hash ?? '');
  if (!passwordHash) {
    logger.error({ userId: user.id }, 'User has no password hash');
    throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const valid = await comparePassword(password, passwordHash);
  if (!valid) {
    logger.warn({ userId: user.id, email }, 'Login attempt with invalid password');
    throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  // Update last login timestamp
  await updateLastLogin(user.id);

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    location_id: user.location_id ?? null,
  });

  logger.info({ userId: user.id, email, role: user.role }, 'User logged in successfully');

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      location_id: user.location_id ?? null,
    },
  };
}

export async function refresh(tokenPayload: { userId: string }) {
  const user = await findSessionUserById(tokenPayload.userId);
  if (!user) {
    throw new AuthenticationError('Invalid token', 'INVALID_TOKEN');
  }

  if (user.status !== 'active') {
    throw new AuthenticationError('Account is inactive or blocked', 'ACCOUNT_LOCKED');
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    location_id: user.location_id ?? null,
  });

  logger.info({ userId: user.id }, 'Token refreshed');

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      location_id: user.location_id ?? null,
    },
  };
}

export async function logout(token: string) {
  // Optional: Implement token blacklisting with Redis
  // For now, tokens expire naturally based on JWT expiry
  logger.info('User logged out');
  return { success: true };
}
