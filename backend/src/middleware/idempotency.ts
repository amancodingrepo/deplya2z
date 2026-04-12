import type { NextFunction, Request, Response } from 'express';

import {
  findIdempotencyRecord,
  releaseReservedIdempotencyKey,
  reserveIdempotencyKey,
  saveIdempotencyResponse,
} from '../repositories/idempotencyRepository.js';

type CachedPayload = {
  pending?: boolean;
  status?: number;
  body?: unknown;
};

export function idempotencyRequired(endpoint: string) {
  return async function enforceIdempotency(req: Request, res: Response, next: NextFunction) {
    const key = String(req.header('Idempotency-Key') ?? '').trim();
    if (!key) {
      return res.status(400).json({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Idempotency-Key header is required for this endpoint',
      });
    }

    const existing = await findIdempotencyRecord(key);
    if (existing) {
      if (existing.endpoint !== endpoint) {
        return res.status(409).json({
          code: 'IDEMPOTENCY_KEY_REUSED',
          message: 'This idempotency key is already used for a different endpoint',
        });
      }

      const payload = (existing.response_json ?? {}) as CachedPayload;
      if (payload.pending) {
        return res.status(409).json({
          code: 'IDEMPOTENCY_IN_PROGRESS',
          message: 'A request with this idempotency key is already in progress',
        });
      }

      return res.status(payload.status ?? 200).json(payload.body ?? null);
    }

    const reserved = await reserveIdempotencyKey(key, endpoint);
    if (!reserved) {
      return res.status(409).json({
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Could not reserve idempotency key, retry with a new key',
      });
    }

    const originalJson = res.json.bind(res);
    let hasStoredResponse = false;
    res.json = ((body: unknown) => {
      hasStoredResponse = true;
      void saveIdempotencyResponse(key, endpoint, {
        status: res.statusCode,
        body,
      });
      return originalJson(body);
    }) as Response['json'];

    res.on('close', () => {
      if (!hasStoredResponse) {
        void releaseReservedIdempotencyKey(key, endpoint);
      }
    });

    return next();
  };
}
