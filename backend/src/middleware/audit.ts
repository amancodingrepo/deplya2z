import type { NextFunction, Request, Response } from 'express';
import { auditService } from '../services/auditService.js';
import logger from '../utils/logger.js';

/**
 * Middleware to log all API requests to audit trail
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip audit for health check and non-authenticated routes
  if (req.path === '/health' || req.path === '/ready' || !req.user) {
    return next();
  }

  // Capture the original res.json to log after response
  const originalJson = res.json.bind(res);
  let responseData: any;
  
  res.json = function(data: any) {
    responseData = data;
    return originalJson(data);
  };

  // Log request completion
  res.on('finish', () => {
    const success = res.statusCode >= 200 && res.statusCode < 400;
    
    // Only log important actions (not GET requests unless they fail)
    if (req.method !== 'GET' || !success) {
      const action = getActionFromRequest(req);
      const entityType = getEntityTypeFromPath(req.path);
      
      if (action && entityType) {
        auditService.log({
          actor_user_id: req.user!.id,
          action,
          entity_type: entityType,
          details: `${req.method} ${req.path}`,
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
          success,
          error_message: success ? undefined : responseData?.message,
        }).catch((error) => {
          logger.error({ error }, 'Failed to log audit entry');
        });
      }
    }
  });

  next();
}

/**
 * Extract action type from request
 */
function getActionFromRequest(req: Request): 'create' | 'update' | 'delete' | 'approve' | 'dispatch' | 'confirm_receive' | 'cancel' | null {
  if (req.method === 'POST') return 'create';
  if (req.method === 'PUT' || req.method === 'PATCH') {
    if (req.path.includes('/approve')) return 'approve';
    if (req.path.includes('/dispatch')) return 'dispatch';
    if (req.path.includes('/confirm-receive')) return 'confirm_receive';
    if (req.path.includes('/cancel')) return 'cancel';
    return 'update';
  }
  if (req.method === 'DELETE') return 'delete';
  return null;
}

/**
 * Extract entity type from request path
 */
function getEntityTypeFromPath(path: string): 'user' | 'product' | 'order' | 'inventory' | 'transfer' | 'store_order' | 'bulk_order' | null {
  if (path.includes('/users')) return 'user';
  if (path.includes('/products')) return 'product';
  if (path.includes('/inventory')) return 'inventory';
  if (path.includes('/bulk-orders')) return 'bulk_order';
  if (path.includes('/orders')) return 'store_order';
  if (path.includes('/transfers')) return 'transfer';
  return null;
}
