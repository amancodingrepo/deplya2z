import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';

import { pool } from '../database/connection.js';
import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { writeAuditLog } from '../repositories/auditRepository.js';
import { AppError } from '../shared/errors.js';
import { env } from '../config/env.js';
import { imageService } from '../services/ImageService.js';

// ─── Multer (memory storage, 5 MB, images only) ───────────────────────────────
const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.imageMaxInputSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are accepted'));
    }
  },
});

export const productsRouter = Router();

productsRouter.use(authRequired, rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']));

// GET /products — enhanced with pagination and filters
productsRouter.get('/', async (req, res, next) => {
  try {
    const search = String(req.query.search ?? req.query.q ?? '').trim();
    const status = String(req.query.status ?? '').trim();
    const category = String(req.query.category ?? '').trim();
    const brand = String(req.query.brand ?? '').trim();
    const customStyle = String(req.query.custom_style ?? '').trim();
    const sort = String(req.query.sort ?? 'title_asc').trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(env.maxPageSize, Math.max(1, Number(req.query.limit ?? env.defaultPageSize)));
    const offset = (page - 1) * limit;
    const includeStock = req.query.include_stock === 'true';
    const locationId = String(req.query.location_id ?? '').trim();

    const clauses: string[] = ['p.deleted_at IS NULL'];
    const values: (string | number)[] = [];

    if (search) {
      values.push(`%${search}%`);
      values.push(`%${search}%`);
      values.push(`%${search}%`);
      clauses.push(`(p.title ILIKE $${values.length - 2} OR p.sku ILIKE $${values.length - 1} OR p.brand ILIKE $${values.length})`);
    }
    if (status) {
      values.push(status);
      clauses.push(`p.status = $${values.length}`);
    }
    if (category) {
      values.push(category);
      clauses.push(`p.category = $${values.length}`);
    }
    if (brand) {
      values.push(brand);
      clauses.push(`p.brand ILIKE $${values.length}`);
    }
    if (customStyle) {
      values.push(customStyle);
      clauses.push(`p.custom_style = $${values.length}`);
    }

    const where = `WHERE ${clauses.join(' AND ')}`;

    const sortMap: Record<string, string> = {
      title_asc: 'p.title ASC',
      title_desc: 'p.title DESC',
      sku_asc: 'p.sku ASC',
      created_desc: 'p.created_at DESC',
      created_asc: 'p.created_at ASC',
    };
    const orderBy = sortMap[sort] ?? 'p.title ASC';

    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM products p ${where}`,
      values,
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    let stockJoin = '';
    let stockSelect = '';

    if (includeStock) {
      if (req.user?.role === 'superadmin') {
        stockSelect = `, COALESCE(SUM(i.total_stock), 0) as total_stock, COALESCE(SUM(i.reserved_stock), 0) as reserved_stock, COALESCE(SUM(i.total_stock - i.reserved_stock), 0) as available_stock`;
        stockJoin = `LEFT JOIN inventory i ON i.product_id = p.id`;
        if (locationId) {
          values.push(locationId);
          stockJoin += ` AND (i.location_id::text = $${values.length} OR i.location_id = (SELECT id FROM locations WHERE location_code = $${values.length} LIMIT 1))`;
        }
      } else {
        const userLocationId = req.user?.location_id ?? '';
        values.push(userLocationId);
        stockSelect = `, COALESCE(i.total_stock, 0) as total_stock, COALESCE(i.reserved_stock, 0) as reserved_stock, COALESCE(i.total_stock - i.reserved_stock, 0) as available_stock`;
        stockJoin = `LEFT JOIN inventory i ON i.product_id = p.id AND (i.location_id::text = $${values.length} OR i.location_id = (SELECT id FROM locations WHERE location_code = $${values.length} LIMIT 1))`;
      }
    }

    const groupBy = includeStock ? 'GROUP BY p.id' : '';

    const limitIdx = values.length + 1;
    const offsetIdx = values.length + 2;
    values.push(limit, offset);

    const rows = await pool.query(
      `SELECT p.*${stockSelect} FROM products p ${stockJoin} ${where} ${groupBy} ORDER BY ${orderBy} LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
    );

    return res.json({
      success: true,
      data: rows.rows,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
});

// GET /products/categories
productsRouter.get('/categories', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT category FROM products WHERE deleted_at IS NULL AND category IS NOT NULL ORDER BY category`,
    );
    return res.json({ success: true, data: result.rows.map((r) => r.category) });
  } catch (error) {
    return next(error);
  }
});

// GET /products/brands
productsRouter.get('/brands', async (_req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT brand FROM products WHERE deleted_at IS NULL ORDER BY brand`,
    );
    return res.json({ success: true, data: result.rows.map((r) => r.brand) });
  } catch (error) {
    return next(error);
  }
});

// GET /products/sku-check
productsRouter.get('/sku-check', async (req, res, next) => {
  try {
    const sku = String(req.query.sku ?? '').trim();
    if (!sku) {
      return res.status(400).json({ code: 'INVALID_PAYLOAD', message: 'sku query param required' });
    }
    const result = await pool.query(
      `SELECT id FROM products WHERE sku = $1 AND deleted_at IS NULL LIMIT 1`,
      [sku],
    );
    return res.json({ success: true, data: { available: result.rows.length === 0 } });
  } catch (error) {
    return next(error);
  }
});

// GET /products/:id
productsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const result = await pool.query(
      `SELECT * FROM products WHERE (id::text = $1 OR sku = $1) AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found' });
    }
    const product = result.rows[0];

    // Get inventory
    let inventoryQuery: string;
    let inventoryValues: string[];

    if (req.user?.role === 'superadmin') {
      inventoryQuery = `
        SELECT i.*, l.name as location_name, l.location_code, l.type as location_type,
               (i.total_stock - i.reserved_stock) as available_stock
        FROM inventory i
        JOIN locations l ON l.id = i.location_id
        WHERE i.product_id = $1
        ORDER BY l.type, l.name
      `;
      inventoryValues = [product.id];
    } else {
      const locationId = req.user?.location_id ?? '';
      inventoryQuery = `
        SELECT i.*, l.name as location_name, l.location_code, l.type as location_type,
               (i.total_stock - i.reserved_stock) as available_stock
        FROM inventory i
        JOIN locations l ON l.id = i.location_id
        WHERE i.product_id = $1
          AND (i.location_id::text = $2 OR l.location_code = $2)
      `;
      inventoryValues = [product.id, locationId];
    }

    const inventoryResult = await pool.query(inventoryQuery, inventoryValues);

    return res.json({
      success: true,
      data: { ...product, inventory: inventoryResult.rows },
    });
  } catch (error) {
    return next(error);
  }
});

const createProductSchema = z.object({
  title: z.string().min(1),
  short_name: z.string().min(1).optional(),
  sku: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(['present', 'inactive', 'discontinued']).optional().default('present'),
  custom_style: z.string().optional(),
  image_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
  initial_stock: z.number().int().min(0).optional(),
  initial_stock_reason: z.string().optional(),
});

const updateProductSchema = createProductSchema.partial().omit({ initial_stock: true, initial_stock_reason: true });

// POST /products
productsRouter.post(
  '/',
  rolesAllowed(['superadmin', 'warehouse_manager']),
  async (req, res, next) => {
    try {
      const parsed = createProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          code: 'INVALID_PAYLOAD',
          message: 'Validation failed',
          details: parsed.error.flatten(),
        });
      }

      const data = parsed.data;

      // Check unique SKU
      const existing = await pool.query(
        `SELECT id FROM products WHERE sku = $1 AND deleted_at IS NULL LIMIT 1`,
        [data.sku],
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ code: 'SKU_ALREADY_EXISTS', message: 'SKU already exists' });
      }

      const result = await pool.query(
        `INSERT INTO products (title, short_name, sku, brand, category, model, color, status, custom_style, image_url, thumbnail_url, low_stock_threshold)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          data.title,
          data.short_name ?? null,
          data.sku,
          data.brand,
          data.category ?? null,
          data.model ?? null,
          data.color ?? null,
          data.status,
          data.custom_style ?? null,
          data.image_url ?? null,
          data.thumbnail_url ?? null,
          data.low_stock_threshold ?? env.defaultLowStockThreshold,
        ],
      );

      const product = result.rows[0];

      // If initial_stock > 0 and user is warehouse_manager, upsert inventory
      if (data.initial_stock && data.initial_stock > 0 && req.user?.role === 'warehouse_manager') {
        const locationId = req.user.location_id;
        if (locationId) {
          const locResult = await pool.query(
            `SELECT id FROM locations WHERE location_code = $1 OR id::text = $1 LIMIT 1`,
            [locationId],
          );
          const loc = locResult.rows[0];
          if (loc) {
            await pool.query(
              `INSERT INTO inventory (product_id, location_id, total_stock, reserved_stock, issued_stock)
               VALUES ($1, $2, $3, 0, 0)
               ON CONFLICT (product_id, location_id)
               DO UPDATE SET total_stock = inventory.total_stock + $3, updated_at = NOW()`,
              [product.id, loc.id, data.initial_stock],
            );

            await pool.query(
              `INSERT INTO stock_movements (product_id, from_location_id, to_location_id, quantity, movement_type, reference_type, reference_id, reason, created_by)
               VALUES ($1, NULL, $2, $3, 'manual_add', 'manual', $1, $4, $5)`,
              [product.id, loc.id, data.initial_stock, data.initial_stock_reason ?? 'Initial stock', req.user.id],
            );
          }
        }
      }

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'product_created',
        entityType: 'product',
        entityId: product.id,
        afterValue: { sku: product.sku, title: product.title, status: product.status },
        details: `Product ${product.sku} created`,
      });

      return res.status(201).json({ success: true, data: product });
    } catch (error) {
      return next(error);
    }
  },
);

// PUT /products/:id
productsRouter.put(
  '/:id',
  rolesAllowed(['superadmin', 'warehouse_manager']),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const parsed = updateProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          code: 'INVALID_PAYLOAD',
          message: 'Validation failed',
          details: parsed.error.flatten(),
        });
      }

      const existing = await pool.query(
        `SELECT * FROM products WHERE (id::text = $1 OR sku = $1) AND deleted_at IS NULL LIMIT 1`,
        [id],
      );
      if (!existing.rows[0]) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found' });
      }

      const data = parsed.data;
      const prev = existing.rows[0];

      // If SKU is changing, check uniqueness
      if (data.sku && data.sku !== prev.sku) {
        const skuCheck = await pool.query(
          `SELECT id FROM products WHERE sku = $1 AND deleted_at IS NULL AND id != $2 LIMIT 1`,
          [data.sku, prev.id],
        );
        if (skuCheck.rows.length > 0) {
          return res.status(409).json({ code: 'SKU_ALREADY_EXISTS', message: 'SKU already exists' });
        }
      }

      const fields: string[] = [];
      const values: (string | number | null)[] = [];

      const fieldMap: Record<string, unknown> = {
        title: data.title,
        short_name: data.short_name,
        sku: data.sku,
        brand: data.brand,
        category: data.category,
        model: data.model,
        color: data.color,
        status: data.status,
        custom_style: data.custom_style,
        image_url: data.image_url,
        thumbnail_url: data.thumbnail_url,
        low_stock_threshold: data.low_stock_threshold,
      };

      for (const [key, val] of Object.entries(fieldMap)) {
        if (val !== undefined) {
          values.push(val as string | number | null);
          fields.push(`${key} = $${values.length}`);
        }
      }

      if (fields.length === 0) {
        return res.json({ success: true, data: prev });
      }

      values.push(prev.id);
      const result = await pool.query(
        `UPDATE products SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
        values,
      );

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'product_updated',
        entityType: 'product',
        entityId: prev.id,
        beforeValue: { sku: prev.sku, status: prev.status },
        afterValue: { ...data },
        details: `Product ${prev.sku} updated`,
      });

      return res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      return next(error);
    }
  },
);

// DELETE /products/:id — superadmin only, soft delete
productsRouter.delete(
  '/:id',
  rolesAllowed(['superadmin']),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);

      const existing = await pool.query(
        `SELECT * FROM products WHERE (id::text = $1 OR sku = $1) AND deleted_at IS NULL LIMIT 1`,
        [id],
      );
      if (!existing.rows[0]) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Product not found' });
      }

      const product = existing.rows[0];

      // Check for active reserved stock
      const reservedCheck = await pool.query(
        `SELECT SUM(reserved_stock) as total_reserved FROM inventory WHERE product_id = $1`,
        [product.id],
      );
      const totalReserved = Number(reservedCheck.rows[0]?.total_reserved ?? 0);
      if (totalReserved > 0) {
        return res.status(409).json({
          code: 'PRODUCT_HAS_ACTIVE_ORDERS',
          message: 'Cannot delete product with active reserved stock',
        });
      }

      await pool.query(
        `UPDATE products SET deleted_at = NOW() WHERE id = $1`,
        [product.id],
      );

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'product_deleted',
        entityType: 'product',
        entityId: product.id,
        beforeValue: { sku: product.sku, status: product.status },
        details: `Product ${product.sku} soft-deleted`,
      });

      return res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
      const err = error as { code?: string };
      if (err.code === '42703') {
        // deleted_at column may not exist yet — treat as AppError
        return next(new AppError('deleted_at column not found — run migrations', 500, 'MIGRATION_REQUIRED'));
      }
      return next(error);
    }
  },
);

// ─── POST /products/:id/image — upload / replace product image ────────────────
productsRouter.post(
  '/:id/image',
  rolesAllowed(['superadmin', 'warehouse_manager']),
  productImageUpload.single('image'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      if (!req.file) {
        return next(new AppError('No image file provided', 400, 'MISSING_FILE'));
      }

      // Verify product exists and isn't deleted
      const existing = await pool.query(
        `SELECT id, image_url FROM products WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      );
      if (!existing.rows[0]) {
        return next(new AppError('Product not found', 404, 'NOT_FOUND'));
      }

      const oldImageUrl: string | null = existing.rows[0].image_url ?? null;

      // Upload new image to R2 (processes to WebP + thumbnail)
      const result = await imageService.processAndUpload(req.file.buffer, req.file.originalname);

      // Persist URLs to DB
      await pool.query(
        `UPDATE products
         SET image_url = $1, thumbnail_url = $2, updated_at = NOW()
         WHERE id = $3`,
        [result.url, result.thumbnail_url, id],
      );

      // Delete old image from R2 (best-effort, don't fail the request)
      if (oldImageUrl) {
        imageService.deleteImage(oldImageUrl).catch(() => {});
      }

      await writeAuditLog({
        actorUserId: req.user!.id,
        action: 'product_image_updated',
        entityType: 'product',
        entityId: id,
        afterValue: { image_url: result.url, thumbnail_url: result.thumbnail_url },
        details: `Product image uploaded (${result.compressed_size_bytes} bytes, ${result.compression_ratio * 100}% compression)`,
      });

      return res.json({
        success: true,
        data: {
          url: result.url,
          thumbnail_url: result.thumbnail_url,
          original_size_bytes: result.original_size_bytes,
          compressed_size_bytes: result.compressed_size_bytes,
          compression_ratio: result.compression_ratio,
          width: result.width,
          height: result.height,
        },
      });
    } catch (err: any) {
      // Multer file-filter error
      if (err.message?.includes('Only JPEG')) {
        return next(new AppError(err.message, 400, 'INVALID_FILE_TYPE'));
      }
      return next(err);
    }
  },
);
