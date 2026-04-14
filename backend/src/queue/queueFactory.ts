import Queue from 'bull';
import logger from '../utils/logger.js';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

// Create notification queue
export const notificationQueue = new Queue('notifications', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Create report queue
export const reportQueue = new Queue('reports', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Process notification jobs
notificationQueue.process(async (job) => {
  const { type, data } = job.data;
  
  logger.info({ type, data }, 'Processing notification job');
  
  try {
    switch (type) {
      case 'order_confirmed':
        await sendOrderConfirmedNotification(data);
        break;
      case 'order_dispatched':
        await sendOrderDispatchedNotification(data);
        break;
      case 'order_unconfirmed_24h':
        await sendOrderUnconfirmedNotification(data);
        break;
      case 'low_stock_alert':
        await sendLowStockNotification(data);
        break;
      case 'bulk_order_created':
        await sendBulkOrderCreatedNotification(data);
        break;
      default:
        logger.warn({ type }, 'Unknown notification type');
    }
    
    logger.info({ type, jobId: job.id }, 'Notification processed successfully');
  } catch (error) {
    logger.error({ error, type, jobId: job.id }, 'Failed to process notification');
    throw error; // Re-throw to trigger retry
  }
});

// Handle failed jobs
notificationQueue.on('failed', (job, err) => {
  logger.error({
    jobId: job.id,
    data: job.data,
    error: err.message,
    attemptsMade: job.attemptsMade,
  }, 'Notification job failed');
});

// Notification handlers (to be implemented based on actual notification service)
async function sendOrderConfirmedNotification(data: any) {
  // TODO: Implement push notification / email for warehouse manager
  logger.info({ data }, 'Order confirmed notification sent');
}

async function sendOrderDispatchedNotification(data: any) {
  // TODO: Implement push notification / email for store manager
  logger.info({ data }, 'Order dispatched notification sent');
}

async function sendOrderUnconfirmedNotification(data: any) {
  // TODO: Implement notification to superadmin
  logger.info({ data }, 'Order unconfirmed notification sent');
}

async function sendLowStockNotification(data: any) {
  // TODO: Implement low stock alert
  logger.info({ data }, 'Low stock notification sent');
}

async function sendBulkOrderCreatedNotification(data: any) {
  // TODO: Implement bulk order notification
  logger.info({ data }, 'Bulk order created notification sent');
}

export default notificationQueue;
