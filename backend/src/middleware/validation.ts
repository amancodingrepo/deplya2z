import type { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { ValidationAppError } from '../shared/errors.js';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

/**
 * Middleware to validate request data against Joi schemas
 */
export function validateRequest(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(d => d.message));
      } else {
        req.body = value;
      }
    }

    // Validate query
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(d => d.message));
      } else {
        req.query = value;
      }
    }

    // Validate params
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map(d => d.message));
      } else {
        req.params = value;
      }
    }

    if (errors.length > 0) {
      throw new ValidationAppError(errors.join(', '));
    }

    next();
  };
}

// Common validation schemas
export const commonSchemas = {
  uuid: Joi.string().uuid(),
  email: Joi.string().email(),
  password: Joi.string().min(6).max(100),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
  }),
  idParam: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

// Login validation schema
export const loginSchema = {
  body: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required(),
  }),
};

// Create store order schema
export const createStoreOrderSchema = {
  body: Joi.object({
    store_id: commonSchemas.uuid.required(),
    warehouse_id: commonSchemas.uuid.required(),
    items: Joi.array().items(
      Joi.object({
        product_id: commonSchemas.uuid.required(),
        qty: Joi.number().integer().min(1).required(),
      })
    ).min(1).required(),
  }),
};

// Create bulk order schema
export const createBulkOrderSchema = {
  body: Joi.object({
    client_store_id: commonSchemas.uuid.required(),
    warehouse_id: commonSchemas.uuid.required(),
    items: Joi.array().items(
      Joi.object({
        product_id: commonSchemas.uuid.required(),
        qty: Joi.number().integer().min(1).required(),
      })
    ).min(1).required(),
  }),
};

// Create product schema
export const createProductSchema = {
  body: Joi.object({
    title: Joi.string().min(1).max(255).required(),
    short_name: Joi.string().min(1).max(100).required(),
    sku: Joi.string().min(1).max(100).required(),
    brand: Joi.string().min(1).max(100).required(),
    category: Joi.string().min(1).max(100).required(),
    model: Joi.string().max(100).allow('', null),
    color: Joi.string().max(50).allow('', null),
    status: Joi.string().valid('present', 'inactive', 'discontinued').default('present'),
    custom_style: Joi.string().valid('default', 'premium', 'featured', 'sale', 'catalogue_ready').default('default'),
    image_url: Joi.string().uri().allow('', null),
  }),
};

// Update product schema
export const updateProductSchema = {
  body: Joi.object({
    title: Joi.string().min(1).max(255),
    short_name: Joi.string().min(1).max(100),
    brand: Joi.string().min(1).max(100),
    category: Joi.string().min(1).max(100),
    model: Joi.string().max(100).allow('', null),
    color: Joi.string().max(50).allow('', null),
    status: Joi.string().valid('present', 'inactive', 'discontinued'),
    custom_style: Joi.string().valid('default', 'premium', 'featured', 'sale', 'catalogue_ready'),
    image_url: Joi.string().uri().allow('', null),
  }).min(1),
  params: commonSchemas.idParam,
};

// Create user schema
export const createUserSchema = {
  body: Joi.object({
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
    name: Joi.string().min(1).max(255).required(),
    phone: Joi.string().max(20).allow('', null),
    role: Joi.string().valid('superadmin', 'warehouse_manager', 'store_manager').required(),
    location_id: commonSchemas.uuid.allow(null),
    status: Joi.string().valid('active', 'inactive', 'blocked').default('active'),
  }),
};

// Create location schema
export const createLocationSchema = {
  body: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    type: Joi.string().valid('warehouse', 'store').required(),
    address: Joi.string().min(1).max(500).required(),
    geo_lat: Joi.number().min(-90).max(90).allow(null),
    geo_lng: Joi.number().min(-180).max(180).allow(null),
    geofence_radius: Joi.number().min(0).default(100),
    location_code: Joi.string().min(1).max(20).required(),
    status: Joi.string().valid('active', 'inactive').default('active'),
  }),
};

// Create client store schema
export const createClientStoreSchema = {
  body: Joi.object({
    store_name: Joi.string().min(1).max(255).required(),
    owner_name: Joi.string().min(1).max(255).required(),
    phone: Joi.string().min(1).max(20).required(),
    email: commonSchemas.email.required(),
    address: Joi.string().min(1).max(500).required(),
    gst_number: Joi.string().max(50).allow('', null),
    status: Joi.string().valid('active', 'inactive', 'blocked').default('active'),
  }),
};

// Manual stock adjustment schema
export const manualStockAdjustmentSchema = {
  body: Joi.object({
    product_id: commonSchemas.uuid.required(),
    location_id: commonSchemas.uuid.required(),
    quantity: Joi.number().integer().required(),
    reason: Joi.string().min(1).max(500).required(),
  }),
};

// Dispatch notes schema
export const dispatchNotesSchema = {
  body: Joi.object({
    dispatch_notes: Joi.string().max(500).allow('', null),
  }),
  params: commonSchemas.idParam,
};
