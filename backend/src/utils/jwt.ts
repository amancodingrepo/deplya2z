import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRole } from '../types.js';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  location_id: string | null;
}

const jwtOptions: SignOptions = {
  expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
};

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.jwtSecret, jwtOptions);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, env.jwtSecret) as JWTPayload;
}
