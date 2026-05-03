import { notificationQueue } from '../queue/queueFactory.js';
import logger from '../utils/logger.js';

export interface NotificationData {
  warehouse_id?: string;
  store_id?: string;
  order_id?: string;
  product_id?: string;
  message: string;
  [key: string]: any;
}

export class NotificationService {
  /**
   * Queue a notification to be sent
   */
  async queue(type: string, data: NotificationData): Promise<void> {
    if (!notificationQueue) {
      logger.warn({ type }, 'Notification skipped — Redis unavailable (REDIS_URL not set)');
      return;
    }
    try {
      await Promise.race([
        notificationQueue.add(
          { type, data },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Notification queue timeout')), 750),
        ),
      ]);

      logger.info({ type, data }, 'Notification queued');
    } catch (error) {
      logger.error({ error, type, data }, 'Failed to queue notification');
      // Don't throw - notification failure shouldn't block main operation
    }
  }

  /**
   * Send order confirmed notification to warehouse manager
   */
  async notifyOrderConfirmed(warehouseId: string, orderId: string, message: string): Promise<void> {
    await this.queue('order_confirmed', {
      warehouse_id: warehouseId,
      order_id: orderId,
      message,
    });
  }

  /**
   * Send order dispatched notification to store manager
   */
  async notifyOrderDispatched(storeId: string, orderId: string, message: string): Promise<void> {
    await this.queue('order_dispatched', {
      store_id: storeId,
      order_id: orderId,
      message,
    });
  }

  /**
   * Send notification for unconfirmed order (24h timeout)
   */
  async notifyOrderUnconfirmed(orderId: string, message: string): Promise<void> {
    await this.queue('order_unconfirmed_24h', {
      order_id: orderId,
      message,
    });
  }

  /**
   * Send low stock alert to warehouse manager
   */
  async notifyLowStock(warehouseId: string, productId: string, message: string): Promise<void> {
    await this.queue('low_stock_alert', {
      warehouse_id: warehouseId,
      product_id: productId,
      message,
    });
  }

  /**
   * Send bulk order created notification to warehouse manager
   */
  async notifyBulkOrderCreated(warehouseId: string, orderId: string, message: string): Promise<void> {
    await this.queue('bulk_order_created', {
      warehouse_id: warehouseId,
      order_id: orderId,
      message,
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
