import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AuthenticationError } from '../shared/errors.js';
import { findSessionUserById, findUserByEmailWithPassword } from '../repositories/userRepository.js';

function verifyPassword(password: string, passwordHash: string) {
  const parts = passwordHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return password === passwordHash;
  }

  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = parts[3];
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(expected));
}

export async function login(email: string, password: string) {
  const user = await findUserByEmailWithPassword(email);
  if (!user) {
    throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  if (user.status !== 'active') {
    throw new AuthenticationError('Account is inactive', 'ACCOUNT_LOCKED');
  }

  const passwordHash = String(user.password_hash ?? process.env.SEED_PASSWORD_HASH ?? '');
  const valid = verifyPassword(password, passwordHash);
  if (!valid) {
    throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, location_id: user.location_code ?? null },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );

  return {
    token,
    user: {
      ...user,
      location_id: user.location_code ?? null,
    },
  };
}

export async function refresh(tokenPayload: { userId: string }) {
  const user = await findSessionUserById(tokenPayload.userId);
  if (!user) {
    throw new AuthenticationError('Invalid token', 'INVALID_TOKEN');
  }
  const token = jwt.sign(
    { userId: user.id, role: user.role, location_id: user.location_code ?? null },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
  return {
    token,
    user: {
      ...user,
      location_id: user.location_code ?? null,
    },
  };
}
