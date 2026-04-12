import { pool } from '../database/connection.js';

export async function writeAuditLog(input: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  details?: string;
  success?: boolean;
  errorMessage?: string;
  requestId?: string;
}) {
  await pool.query(
    `insert into audit_logs (
      actor_user_id, action, entity_type, entity_id,
      before_value, after_value, details, success, error_message, request_id
    ) values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10)`,
    [
      input.actorUserId,
      input.action,
      input.entityType,
      input.entityId,
      input.beforeValue ? JSON.stringify(input.beforeValue) : null,
      input.afterValue ? JSON.stringify(input.afterValue) : null,
      input.details ?? null,
      input.success ?? true,
      input.errorMessage ?? null,
      input.requestId ?? null,
    ],
  );
}
