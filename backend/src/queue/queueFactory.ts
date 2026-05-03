import Queue from 'bull';
import { Resend } from 'resend';

import { pool } from '../database/connection.js';
import { env } from '../config/env.js';
import logger from '../utils/logger.js';

// ─── Redis config (Upstash TLS support) ──────────────────────────────────────

function parseRedisConfig() {
  const url = env.redisUrl;
  if (!url) {
    return { host: 'localhost', port: 6379 };
  }
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      password: decodeURIComponent(parsed.password) || undefined,
      // rediss:// scheme → TLS required (Upstash always uses TLS)
      tls: url.startsWith('rediss://') ? {} : undefined,
    };
  } catch {
    logger.warn({ url }, 'Failed to parse REDIS_URL — falling back to localhost');
    return { host: 'localhost', port: 6379 };
  }
}

// ─── Resend client ────────────────────────────────────────────────────────────

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

// ─── Queue instances (null = Redis unavailable, notifications are no-ops) ─────

let notificationQueue: Queue.Queue | null = null;
let reportQueue: Queue.Queue | null = null;

try {
  const redisConfig = parseRedisConfig();

  notificationQueue = new Queue('notifications', {
    redis: redisConfig as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  reportQueue = new Queue('reports', {
    redis: redisConfig as any,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  // ── Process notification jobs ───────────────────────────────────────────────
  notificationQueue.process(async (job) => {
    const { type, data } = job.data;
    logger.info({ type }, 'Processing notification job');

    switch (type) {
      case 'order_confirmed':
        await sendOrderConfirmedEmail(data);
        break;
      case 'order_dispatched':
        await sendOrderDispatchedEmail(data);
        break;
      case 'order_unconfirmed_24h':
        await sendOrderUnconfirmedEmail(data);
        break;
      case 'low_stock_alert':
        await sendLowStockEmail(data);
        break;
      case 'bulk_order_created':
        await sendBulkOrderCreatedEmail(data);
        break;
      default:
        logger.warn({ type }, 'Unknown notification type');
    }

    logger.info({ type, jobId: job.id }, 'Notification processed');
  });

  notificationQueue.on('failed', (job, err) => {
    logger.error(
      { jobId: job.id, error: err.message, attemptsMade: job.attemptsMade },
      'Notification job failed',
    );
  });

  logger.info('Bull queues initialized');
} catch (error) {
  logger.warn(
    { error },
    'Queue init failed — notifications disabled. Set REDIS_URL to enable.',
  );
}

// ─── Email helper ─────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    logger.info({ to, subject }, 'Email skipped — RESEND_API_KEY not set');
    return;
  }
  try {
    await resend.emails.send({ from: env.resendFrom, to, subject, html });
    logger.info({ to, subject }, 'Email sent via Resend');
  } catch (err) {
    logger.error({ err, to, subject }, 'Resend email failed');
  }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

interface UserRow { id: string; email: string; }

async function getManager(
  locationId: string,
  role: 'warehouse_manager' | 'store_manager',
): Promise<UserRow | null> {
  const result = await pool.query(
    `SELECT id, email FROM users
     WHERE role = $1 AND location_id = $2 AND status = 'active'
     LIMIT 1`,
    [role, locationId],
  );
  return (result.rows[0] as UserRow) ?? null;
}

async function getSuperadmins(): Promise<UserRow[]> {
  const result = await pool.query(
    `SELECT id, email FROM users WHERE role = 'superadmin' AND status = 'active'`,
  );
  return result.rows as UserRow[];
}

// ─── In-app notification helper ───────────────────────────────────────────────

async function insertInAppNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [userId, type, title, message, payload ? JSON.stringify(payload) : null],
    );
  } catch (err) {
    logger.error({ err, userId, type }, 'Failed to insert in-app notification');
  }
}

// ─── Notification handlers ────────────────────────────────────────────────────

async function sendOrderConfirmedEmail(data: any) {
  const user = await getManager(data.warehouse_id, 'warehouse_manager');
  if (!user) return;

  const title = `Order ${data.order_id} confirmed`;
  const msg   = `Store ${data.store_id} order is confirmed and waiting to be packed.`;

  await Promise.all([
    sendEmail(
      user.email,
      `${title} — ready to pack`,
      `<p>Store <strong>${data.store_id}</strong> order <strong>${data.order_id}</strong> has been confirmed and is waiting to be packed.</p>
       <p>Please log in to the warehouse portal to proceed.</p>`,
    ),
    insertInAppNotification(user.id, 'order_confirmed', title, msg, { order_id: data.order_id, store_id: data.store_id }),
  ]);
}

async function sendOrderDispatchedEmail(data: any) {
  const user = await getManager(data.store_id, 'store_manager');
  if (!user) return;

  const title = `Order ${data.order_id} dispatched`;
  const msg   = `Your order has been dispatched from warehouse ${data.warehouse_id}. Please confirm receipt when it arrives.`;

  await Promise.all([
    sendEmail(
      user.email,
      `${title} — shipment on the way`,
      `<p>Your order <strong>${data.order_id}</strong> has been dispatched from warehouse <strong>${data.warehouse_id}</strong>.</p>
       <p>Please confirm receipt when the shipment arrives at your store.</p>`,
    ),
    insertInAppNotification(user.id, 'order_dispatched', title, msg, { order_id: data.order_id, warehouse_id: data.warehouse_id }),
  ]);
}

async function sendOrderUnconfirmedEmail(data: any) {
  const users = await getSuperadmins();
  const title = `Action needed: Order ${data.order_id} unconfirmed 24h`;
  const msg   = `Order ${data.order_id} has been pending approval for over 24 hours.`;

  await Promise.all(
    users.flatMap((u) => [
      sendEmail(
        u.email,
        `Action needed: Order ${data.order_id} unconfirmed for 24h`,
        `<p>Order <strong>${data.order_id}</strong> has been pending approval for over 24 hours.</p>
         <p>Please review and approve or reject it in the admin portal.</p>`,
      ),
      insertInAppNotification(u.id, 'order_unconfirmed_24h', title, msg, { order_id: data.order_id }),
    ]),
  );
}

async function sendLowStockEmail(data: any) {
  const user = await getManager(data.warehouse_id, 'warehouse_manager');
  if (!user) return;

  const title = `Low stock: ${data.product_title}`;
  const msg   = `Only ${data.current_stock} units remaining. Please restock or adjust the threshold.`;

  await Promise.all([
    sendEmail(
      user.email,
      title,
      `<p>Product <strong>${data.product_title}</strong> is running low at your warehouse.</p>
       <p>Current available stock: <strong>${data.current_stock}</strong> units.</p>
       <p>Please restock or adjust the threshold in the portal.</p>`,
    ),
    insertInAppNotification(user.id, 'low_stock_alert', title, msg, {
      product_id: data.product_id,
      product_title: data.product_title,
      current_stock: data.current_stock,
      warehouse_id: data.warehouse_id,
    }),
  ]);
}

async function sendBulkOrderCreatedEmail(data: any) {
  const user = await getManager(data.warehouse_id, 'warehouse_manager');
  if (!user) return;

  const title = `New bulk order ${data.order_id}`;
  const msg   = `Bulk order for client ${data.client_name} has been created and is ready to pack.`;

  await Promise.all([
    sendEmail(
      user.email,
      `${title} — ${data.client_name}`,
      `<p>A new bulk order <strong>${data.order_id}</strong> for client <strong>${data.client_name}</strong> has been created.</p>
       <p>Please log in to pack and dispatch this order.</p>`,
    ),
    insertInAppNotification(user.id, 'bulk_order_created', title, msg, { order_id: data.order_id, client_name: data.client_name }),
  ]);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { notificationQueue, reportQueue };
export default notificationQueue;
