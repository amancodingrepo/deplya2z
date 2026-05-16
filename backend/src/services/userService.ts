import { findLocationByCode } from '../repositories/locationRepository.js';
import {
  createEmployeeUser,
  findEmployeeUserById,
  listEmployeeUsers,
  updateEmployeeUser,
} from '../repositories/userRepository.js';
import { createStaffMember } from '../repositories/staffRepository.js';
import {
  AppError,
  AuthorizationError,
  NotFoundError,
  ValidationAppError,
} from '../shared/errors.js';
import type { UserRole, UserStatus } from '../types.js';
import { hashPassword as hashPasswordBcrypt } from '../utils/crypto.js';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../database/connection.js';

type ListInput = {
  actorRole: UserRole;
  actorLocationCode?: string | null;
  role?: UserRole;
  status?: UserStatus;
};

type CreateInput = {
  actorRole: UserRole;
  actorLocationCode?: string | null;
  email: string;
  name: string;
  password: string;
  role: UserRole;
  locationCode?: string | null;
  status?: UserStatus;
};

type UpdateInput = {
  actorRole: UserRole;
  actorLocationCode?: string | null;
  id: string;
  name?: string;
  password?: string;
  role?: UserRole;
  locationCode?: string | null;
  status?: UserStatus;
};

async function generateEmployeeCode(locationCode: string, locationType: 'warehouse' | 'store'): Promise<string> {
  const prefix = locationType === 'warehouse' ? 'WH' : 'ST';
  // Get current count of staff at this location
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM staff_members sm
     JOIN locations l ON l.id = sm.location_id
     WHERE l.location_code = $1`,
    [locationCode],
  );
  const count = Number(result.rows[0]?.count ?? 0) + 1; // next sequence
  const seq = String(count).padStart(3, '0');
  return `EMP-${prefix}${locationCode.slice(-2)}-${seq}`;
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

  return location.id;
}

export async function listUsers(input: ListInput) {
  if (input.actorRole !== 'superadmin' && input.actorRole !== 'warehouse_manager' && input.actorRole !== 'store_manager') {
    throw new AuthorizationError('Only superadmin, warehouse manager, or store manager can list users');
  }

  return listEmployeeUsers({
    actorRole: input.actorRole,
    actorLocationCode: input.actorLocationCode,
    role: input.role,
    status: input.status,
  });
}

export async function createUser(input: CreateInput) {
  // Superadmin can create any user
  if (input.actorRole === 'superadmin') {
    // proceed without location restriction
  } else if (input.actorRole === 'warehouse_manager' || input.actorRole === 'store_manager') {
    // Managers can only create staff accounts for their own location
    if (input.role !== 'staff') {
      throw new AuthorizationError('Managers can only create staff accounts');
    }
    if (!input.locationCode) {
      throw new ValidationAppError('location_id is required for staff creation');
    }
    // Verify manager's location matches the target location
    const actorLocation = await findLocationByCode(input.actorLocationCode ?? '');
    if (!actorLocation) {
      throw new NotFoundError('Manager location not found', 'LOCATION_NOT_FOUND');
    }
    const targetLocation = await findLocationByCode(input.locationCode);
    if (!targetLocation || targetLocation.id !== actorLocation.id) {
      throw new AuthorizationError('Cannot create staff for a different location', 'LOCATION_SCOPE_VIOLATION');
    }
  } else {
    throw new AuthorizationError('Only superadmin or managers can create users');
  }

  const locationCode = await validateRoleLocation(input.role, input.locationCode);
  try {
    const created = await createEmployeeUser({
      email: input.email.toLowerCase(),
      passwordHash: await hashPasswordBcrypt(input.password),
      name: input.name,
      role: input.role,
      locationCode,
      status: input.status ?? 'active',
    });

    if (!created) {
      throw new AppError('User could not be created', 500, 'USER_CREATE_FAILED');
    }

    // If creating a staff account, also create staff_member record with employee code
    if (input.role === 'staff' && locationCode) {
      const location = await findLocationByCode(locationCode);
      if (location) {
        const employeeCode = await generateEmployeeCode(location.location_code, location.type);
        await createStaffMember({
          userId: created.id,
          locationId: location.id,
          employeeCode,
        });
      }
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
  const { actorRole, actorLocationCode, id, name, password, role, locationCode, status } = input;

  // Superadmin can update anything
  if (actorRole === 'superadmin') {
    // proceed
  } else if (actorRole === 'warehouse_manager' || actorRole === 'store_manager') {
    // Managers can only update status (active/inactive/blocked) of staff in their location
    if (role !== undefined || name !== undefined || password !== undefined || locationCode !== undefined || !status) {
      throw new AuthorizationError('Managers can only update staff status');
    }
    // Verify manager's location
    const actorLocation = await findLocationByCode(actorLocationCode ?? '');
    if (!actorLocation) {
      throw new NotFoundError('Manager location not found', 'LOCATION_NOT_FOUND');
    }
    // Load target user and verify it's a staff member at this location
    const target = await findEmployeeUserById(id);
    if (!target) {
      throw new NotFoundError('User not found', 'USER_NOT_FOUND');
    }
    if (target.role !== 'staff') {
      throw new AuthorizationError('Managers can only deactivate staff accounts');
    }
    if (target.location_id !== actorLocation.id) {
      throw new AuthorizationError('Cannot modify staff from another location', 'LOCATION_SCOPE_VIOLATION');
    }
    // Only allow status update
    try {
      const updated = await updateEmployeeUser(id, { status });
      if (!updated) throw new AppError('User could not be updated', 500, 'USER_UPDATE_FAILED');
      return updated;
    } catch (error) {
      const candidate = error as { code?: string };
      if (candidate.code === '23505') {
        throw new AppError('Email already exists', 409, 'EMAIL_ALREADY_EXISTS');
      }
      throw error;
    }
  } else {
    throw new AuthorizationError('Only superadmin or managers can update users');
  }

  // Superadmin path continues below
  const existing = await findEmployeeUserById(id);
  if (!existing) {
    throw new NotFoundError('User not found', 'USER_NOT_FOUND');
  }

  const nextRole = role ?? existing.role;
  const nextLocationFromInput = locationCode !== undefined
    ? locationCode
    : existing.location_id;
  const nextLocation = await validateRoleLocation(nextRole, nextLocationFromInput);

  try {
    const updated = await updateEmployeeUser(id, {
      name,
      role,
      status,
      locationCode: role === 'superadmin' ? null : nextLocation,
      passwordHash: password ? await hashPasswordBcrypt(password) : undefined,
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
