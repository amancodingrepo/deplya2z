import { randomUUID } from 'crypto';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

import { r2Client } from '../config/r2.js';
import { env } from '../config/env.js';

export interface UploadResult {
  url: string;
  thumbnail_url: string;
  original_size_bytes: number;
  compressed_size_bytes: number;
  compression_ratio: number;
  width: number;
  height: number;
}

export class ImageService {
  async processAndUpload(buffer: Buffer, _originalName: string): Promise<UploadResult> {
    const id = randomUUID();
    const fullKey = `products/${id}.webp`;
    const thumbKey = `products/thumbnails/${id}_thumb.webp`;

    const originalSizeBytes = buffer.length;

    // Process full-size image
    const fullImage = await sharp(buffer)
      .rotate()
      .resize(env.imageFullWidth, env.imageFullHeight, { fit: 'inside' })
      .webp({ quality: env.imageFullQuality })
      .toBuffer();

    // Get metadata for width/height
    const metadata = await sharp(fullImage).metadata();

    // Process thumbnail
    const thumbImage = await sharp(buffer)
      .rotate()
      .resize(env.imageThumbWidth, env.imageThumbHeight, { fit: 'cover' })
      .webp({ quality: env.imageThumbQuality })
      .toBuffer();

    // Upload both in parallel
    await Promise.all([
      r2Client.send(
        new PutObjectCommand({
          Bucket: env.r2BucketName,
          Key: fullKey,
          Body: fullImage,
          ContentType: 'image/webp',
        }),
      ),
      r2Client.send(
        new PutObjectCommand({
          Bucket: env.r2BucketName,
          Key: thumbKey,
          Body: thumbImage,
          ContentType: 'image/webp',
        }),
      ),
    ]);

    const compressedSizeBytes = fullImage.length;
    const compressionRatio = originalSizeBytes > 0
      ? Math.round((1 - compressedSizeBytes / originalSizeBytes) * 100) / 100
      : 0;

    const baseUrl = env.r2PublicUrl.replace(/\/$/, '');

    return {
      url: `${baseUrl}/${fullKey}`,
      thumbnail_url: `${baseUrl}/${thumbKey}`,
      original_size_bytes: originalSizeBytes,
      compressed_size_bytes: compressedSizeBytes,
      compression_ratio: compressionRatio,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
    };
  }

  async deleteImage(url: string): Promise<void> {
    const baseUrl = env.r2PublicUrl.replace(/\/$/, '');
    const fullKey = url.replace(`${baseUrl}/`, '');
    // Derive thumb key from full key
    const thumbKey = fullKey.replace(/^products\/(.+)\.webp$/, 'products/thumbnails/$1_thumb.webp');

    await Promise.allSettled([
      r2Client.send(
        new DeleteObjectCommand({
          Bucket: env.r2BucketName,
          Key: fullKey,
        }),
      ),
      r2Client.send(
        new DeleteObjectCommand({
          Bucket: env.r2BucketName,
          Key: thumbKey,
        }),
      ),
    ]);
  }
}

export const imageService = new ImageService();
