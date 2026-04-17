import { Router } from 'express';
import { z } from 'zod';

import { pool } from '../database/connection.js';
import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { listLocations } from '../repositories/locationRepository.js';
import { writeAuditLog } from '../repositories/auditRepository.js';

export const locationsRouter = Router();

locationsRouter.use(authRequired, rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']));

locationsRouter.get('/', async (req, res) => {
  const type = String(req.query.type ?? '').trim();
  const rows = await listLocations({ type: type || undefined });
  return res.json({ success: true, data: rows });
});

const createLocationSchema = z.object({
  location_code: z.string().min(2).max(20),
  name: z.string().min(2),
  type: z.enum(['warehouse', 'store']),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  address: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
});

const updateLocationSchema = createLocationSchema.partial();

locationsRouter.post('/', rolesAllowed(['superadmin']), async (req, res, next) => {
  try {
    const parsed = createLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        code: 'INVALID_PAYLOAD',
        message: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const { location_code, name, type, status, address, city, phone } = parsed.data;

    // Check unique location_code
    const existing = await pool.query(
      `SELECT id FROM locations WHERE location_code = $1 LIMIT 1`,
      [location_code],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ code: 'LOCATION_CODE_EXISTS', message: 'Location code already exists' });
    }

    const result = await pool.query(
      `INSERT INTO locations (location_code, name, type, status, address, city, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [location_code, name, type, status, address ?? null, city ?? null, phone ?? null],
    );

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'location_created',
      entityType: 'location',
      entityId: result.rows[0].id,
      afterValue: { location_code, name, type, status },
      details: `Location ${location_code} created`,
    });

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

locationsRouter.put('/:id', rolesAllowed(['superadmin']), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const parsed = updateLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        code: 'INVALID_PAYLOAD',
        message: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const existing = await pool.query(
      `SELECT * FROM locations WHERE id::text = $1 OR location_code = $1 LIMIT 1`,
      [id],
    );
    if (!existing.rows[0]) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Location not found' });
    }
    const location = existing.rows[0] as { id: string; location_code: string };

    const data = parsed.data;
    const fields: string[] = [];
    const values: (string | null)[] = [];

    const fieldMap: Record<string, unknown> = {
      location_code: data.location_code,
      name: data.name,
      type: data.type,
      status: data.status,
      address: data.address,
      city: data.city,
      phone: data.phone,
    };

    for (const [key, val] of Object.entries(fieldMap)) {
      if (val !== undefined) {
        values.push(val as string | null);
        fields.push(`${key} = $${values.length}`);
      }
    }

    if (fields.length === 0) {
      return res.json({ success: true, data: existing.rows[0] });
    }

    values.push(location.id);
    const result = await pool.query(
      `UPDATE locations SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values,
    );

    await writeAuditLog({
      actorUserId: req.user!.id,
      action: 'location_updated',
      entityType: 'location',
      entityId: location.id,
      afterValue: data,
      details: `Location ${location.location_code} updated`,
    });

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});
