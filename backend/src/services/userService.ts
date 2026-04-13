import crypto from 'crypto';

import { findLocationByCode } from '../repositories/locationRepository.js';
import {
  createEmployeeUser,
  findEmployeeUserById,
  listEmployeeUsers,
  updateEmployeeUser,
} from '../repositories/userRepository.js';
import {
  AppError,
  AuthorizationError,
  NotFoundError,
  ValidationAppError,
} from '../shared/errors.js';
import type { UserRole, UserStatus } from '../types.js';

type ListInput = {
  actorRole: UserRole;
  actorLocationCode?: string | null;
  role?: UserRole;
  status?: UserStatus;
};

type CreateInput = {
  actorRole: UserRole;
  email: string;
  name: string;
  password: string;
  role: UserRole;
  locationCode?: string | null;
  status?: UserStatus;
};

type UpdateInput = {
  actorRole: UserRole;
  id: string;
  name?: string;
  password?: string;
  role?: UserRole;
  locationCode?: string | null;
  status?: UserStatus;
};

function hashPassword(password: string) {
  const iterations = 100_000;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

async function validateRoleLocation(role: UserRole, locationCode?: string | null) {
  if (role === 'superadmin') {
    return null;
  }

  if (!locationCode) {
    throw new ValidationAppError('location_id is required for non-superadmin users');
  }

  const location = await findLocationByCode(locationCode);
  if (!location) {
    throw new NotFoundError('Location not found', 'LOCATION_NOT_FOUND');
  }

  if (role === 'warehouse_manager' && location.type !== 'warehouse') {
    throw new ValidationAppError('warehouse_manager must be assigned to a warehouse location');
  }

  if (role === 'store_manager' && location.type !== 'store') {
    throw new ValidationAppError('store_manager must be assigned to a store location');
  }

  return location.location_code;
}

export async function listUsers(input: ListInput) {
  if (input.actorRole !== 'superadmin' && input.actorRole !== 'warehouse_manager') {
    throw new AuthorizationError('Only superadmin or warehouse manager can list users');
  }

  return listEmployeeUsers({
    actorRole: input.actorRole,
    actorLocationCode: input.actorLocationCode,
    role: input.role,
    status: input.status,
  });
}

export async function createUser(input: CreateInput) {
  if (input.actorRole !== 'superadmin') {
    throw new AuthorizationError('Only superadmin can create users');
  }

  const locationCode = await validateRoleLocation(input.role, input.locationCode);
  try {
    const created = await createEmployeeUser({
      email: input.email.toLowerCase(),
      passwordHash: hashPassword(input.password),
      name: input.name,
      role: input.role,
      locationCode,
      status: input.status ?? 'active',
    });

    if (!created) {
      throw new AppError('User could not be created', 500, 'USER_CREATE_FAILED');
    }

    return created;
  } catch (error) {
    const candidate = error as { code?: string };
    if (candidate.code === '23505') {
      throw new AppError('Email already exists', 409, 'EMAIL_ALREADY_EXISTS');
    }
    throw error;
  }
}

export async function updateUser(input: UpdateInput) {
  if (input.actorRole !== 'superadmin') {
    throw new AuthorizationError('Only superadmin can update users');
  }

  const existing = await findEmployeeUserById(input.id);
  if (!existing) {
    throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  const nextRole = input.role ?? existing.role;
  const nextLocationFromInput = input.locationCode !== undefined
    ? input.locationCode
    : existing.location_id;
  const nextLocation = await validateRoleLocation(nextRole, nextLocationFromInput);

  try {
    const updated = await updateEmployeeUser(input.id, {
      name: input.name,
      role: input.role,
      status: input.status,
      locationCode: input.role === 'superadmin' ? null : nextLocation,
      passwordHash: input.password ? hashPassword(input.password) : undefined,
    });

    if (!updated) {
      throw new AppError('User could not be updated', 500, 'USER_UPDATE_FAILED');
    }

    return updated;
  } catch (error) {
    const candidate = error as { code?: string };
    if (candidate.code === '23505') {
      throw new AppError('Email already exists', 409, 'EMAIL_ALREADY_EXISTS');
    }
    throw error;
  }
}
