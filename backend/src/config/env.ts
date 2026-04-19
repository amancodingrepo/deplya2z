import { configDotenv } from 'dotenv';
// Must run BEFORE any process.env reads below — overrides stale shell/parent-process env vars
configDotenv({ override: true });

export const env = {

  port: Number(process.env.PORT ?? 8080),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL ?? '',
  dbSslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12),
  logLevel: process.env.LOG_LEVEL ?? 'info',
  // R2
  cfAccountId: process.env.CF_ACCOUNT_ID ?? '',
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  r2BucketName: process.env.R2_BUCKET_NAME ?? 'store-warehouse-images',
  r2PublicUrl: process.env.R2_PUBLIC_URL ?? '',
  // Image
  imageMaxInputSizeMb: Number(process.env.IMAGE_MAX_INPUT_SIZE_MB ?? 5),
  imageFullWidth: Number(process.env.IMAGE_FULL_WIDTH ?? 800),
  imageFullHeight: Number(process.env.IMAGE_FULL_HEIGHT ?? 800),
  imageFullQuality: Number(process.env.IMAGE_FULL_QUALITY ?? 80),
  imageThumbWidth: Number(process.env.IMAGE_THUMB_WIDTH ?? 300),
  imageThumbHeight: Number(process.env.IMAGE_THUMB_HEIGHT ?? 300),
  imageThumbQuality: Number(process.env.IMAGE_THUMB_QUALITY ?? 70),
  // Pagination
  defaultPageSize: Number(process.env.DEFAULT_PAGE_SIZE ?? 50),
  maxPageSize: Number(process.env.MAX_PAGE_SIZE ?? 100),
  // Low stock
  defaultLowStockThreshold: Number(process.env.DEFAULT_LOW_STOCK_THRESHOLD ?? 10),
};
