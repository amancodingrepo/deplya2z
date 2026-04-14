// Order status constants
export const STORE_ORDER_STATUS = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  PACKED: 'packed',
  DISPATCHED: 'dispatched',
  STORE_RECEIVED: 'store_received',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const BULK_ORDER_STATUS = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  PACKED: 'packed',
  DISPATCHED: 'dispatched',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Stock movement types
export const MOVEMENT_TYPE = {
  ORDER_RESERVED: 'order_reserved',
  ORDER_DEDUCTED: 'order_deducted',
  ORDER_ISSUED: 'order_issued',
  TRANSFER: 'transfer',
  MANUAL_ADJUSTMENT: 'manual_adjustment',
} as const;

// Reference types
export const REFERENCE_TYPE = {
  STORE_ORDER: 'store_order',
  BULK_ORDER: 'bulk_order',
  TRANSFER_REQUEST: 'transfer_request',
  MANUAL: 'manual',
  SYSTEM: 'system',
} as const;

// Product status
export const PRODUCT_STATUS = {
  PRESENT: 'present',
  INACTIVE: 'inactive',
  DISCONTINUED: 'discontinued',
} as const;

// User status
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLOCKED: 'blocked',
} as const;

// User roles
export const USER_ROLE = {
  SUPERADMIN: 'superadmin',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  STORE_MANAGER: 'store_manager',
} as const;

// Location types
export const LOCATION_TYPE = {
  WAREHOUSE: 'warehouse',
  STORE: 'store',
} as const;

// State machine transitions
export const STORE_ORDER_TRANSITIONS: Record<string, string[]> = {
  [STORE_ORDER_STATUS.DRAFT]: [STORE_ORDER_STATUS.CONFIRMED, STORE_ORDER_STATUS.CANCELLED],
  [STORE_ORDER_STATUS.CONFIRMED]: [STORE_ORDER_STATUS.PACKED, STORE_ORDER_STATUS.CANCELLED],
  [STORE_ORDER_STATUS.PACKED]: [STORE_ORDER_STATUS.DISPATCHED, STORE_ORDER_STATUS.CANCELLED],
  [STORE_ORDER_STATUS.DISPATCHED]: [STORE_ORDER_STATUS.STORE_RECEIVED],
  [STORE_ORDER_STATUS.STORE_RECEIVED]: [STORE_ORDER_STATUS.COMPLETED],
  [STORE_ORDER_STATUS.COMPLETED]: [],
  [STORE_ORDER_STATUS.CANCELLED]: [],
};

export const BULK_ORDER_TRANSITIONS: Record<string, string[]> = {
  [BULK_ORDER_STATUS.DRAFT]: [BULK_ORDER_STATUS.CONFIRMED, BULK_ORDER_STATUS.CANCELLED],
  [BULK_ORDER_STATUS.CONFIRMED]: [BULK_ORDER_STATUS.PACKED, BULK_ORDER_STATUS.CANCELLED],
  [BULK_ORDER_STATUS.PACKED]: [BULK_ORDER_STATUS.DISPATCHED, BULK_ORDER_STATUS.CANCELLED],
  [BULK_ORDER_STATUS.DISPATCHED]: [BULK_ORDER_STATUS.COMPLETED],
  [BULK_ORDER_STATUS.COMPLETED]: [],
  [BULK_ORDER_STATUS.CANCELLED]: [],
};

// HTTP Status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;
