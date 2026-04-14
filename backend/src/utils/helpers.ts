/**
 * Generate a unique order ID
 * Format: PREFIX-{LOCATION_CODE}-{DATE}-{INCREMENTAL}
 * Example: ORD-ST01-20260412-0001
 */
export function generateOrderId(prefix: string, locationCode: string, incrementalNumber: number): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const paddedNumber = String(incrementalNumber).padStart(4, '0');
  return `${prefix}-${locationCode}-${date}-${paddedNumber}`;
}

/**
 * Validate state machine transition
 */
export function isValidTransition(currentStatus: string, newStatus: string, transitions: Record<string, string[]>): boolean {
  const allowedTransitions = transitions[currentStatus];
  return allowedTransitions ? allowedTransitions.includes(newStatus) : false;
}

/**
 * Format error response
 */
export function formatErrorResponse(code: string, message: string, details?: unknown) {
  const response: Record<string, any> = {
    code,
    message,
  };
  
  if (details) {
    response.details = details;
  }
  
  return response;
}

/**
 * Pagination helper
 */
export function getPaginationParams(page?: string | number, limit?: string | number) {
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
  const offset = (pageNum - 1) * limitNum;
  
  return {
    page: pageNum,
    limit: limitNum,
    offset,
  };
}

/**
 * Calculate available stock
 */
export function calculateAvailableStock(totalStock: number, reservedStock: number): number {
  return Math.max(0, totalStock - reservedStock);
}
