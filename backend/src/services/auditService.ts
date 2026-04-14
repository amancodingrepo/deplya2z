import { create as createAuditLog } from '../repositories/auditRepository.js';
import logger from '../utils/logger.js';

export interface AuditLogData {
  actor_user_id: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'dispatch' | 'confirm_receive' | 'cancel' | 'error';
  entity_type: 'user' | 'product' | 'order' | 'inventory' | 'transfer' | 'system' | 'store_order' | 'bulk_order';
  entity_id?: string;
  before_value?: unknown;
  after_value?: unknown;
  details: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  success: boolean;
  error_message?: string;
}

export class AuditService {
  /**
   * Log an action to the audit trail
   */
  async log(data: AuditLogData): Promise<void> {
    try {
      await createAuditLog({
        actor_user_id: data.actor_user_id,
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id || null,
        before_value: data.before_value ? JSON.stringify(data.before_value) : null,
        after_value: data.after_value ? JSON.stringify(data.after_value) : null,
        details: data.details,
        ip_address: data.ip_address || null,
        user_agent: data.user_agent || null,
        request_id: data.request_id || null,
        success: data.success,
        error_message: data.error_message || null,
      });

      logger.info({
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        success: data.success,
      }, 'Audit log created');
    } catch (error) {
      // Never fail the main operation due to audit logging failure
      logger.error({ error, auditData: data }, 'Failed to create audit log');
    }
  }

  /**
   * Log a successful action
   */
  async logSuccess(
    userId: string,
    action: AuditLogData['action'],
    entityType: AuditLogData['entity_type'],
    entityId: string,
    details: string,
    metadata?: {
      before?: unknown;
      after?: unknown;
      ip?: string;
      userAgent?: string;
      requestId?: string;
    }
  ): Promise<void> {
    await this.log({
      actor_user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      success: true,
      before_value: metadata?.before,
      after_value: metadata?.after,
      ip_address: metadata?.ip,
      user_agent: metadata?.userAgent,
      request_id: metadata?.requestId,
    });
  }

  /**
   * Log a failed action
   */
  async logFailure(
    userId: string,
    action: AuditLogData['action'],
    entityType: AuditLogData['entity_type'],
    details: string,
    errorMessage: string,
    metadata?: {
      entityId?: string;
      ip?: string;
      userAgent?: string;
      requestId?: string;
    }
  ): Promise<void> {
    await this.log({
      actor_user_id: userId,
      action,
      entity_type: entityType,
      entity_id: metadata?.entityId,
      details,
      success: false,
      error_message: errorMessage,
      ip_address: metadata?.ip,
      user_agent: metadata?.userAgent,
      request_id: metadata?.requestId,
    });
  }
}

// Export singleton instance
export const auditService = new AuditService();
