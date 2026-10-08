import { getDb, id } from './db.ts';
import { emitToUser } from './realtime.ts';

export type NotificationType =
  | 'outbid'
  | 'won'
  | 'lost'
  | 'sold'
  | 'not_sold'
  | 'payment_reminder'
  | 'payment_received'
  | 'unpaid'
  | 'shipped'
  | 'completed'
  | 'question'
  | 'answer'
  | 'ending_soon'
  | 'rejected'
  | 'dispute'
  | 'review';

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  auctionId?: string;
  orderId?: string;
}

/**
 * Stores the notification and pushes it over the socket. Call it after the
 * surrounding transaction commits so we never announce something rolled back.
 * Push/email delivery would hook in here (FCM/APNs via Expo push, SES...).
 */
export function notify(userId: string, input: NotificationInput) {
  const row = {
    id: id(),
    userId,
    type: input.type,
    title: input.title,
    body: input.body,
    auctionId: input.auctionId ?? null,
    orderId: input.orderId ?? null,
    read: false,
    createdAt: Date.now(),
  };
  getDb().run(
    'INSERT INTO notifications (id, user_id, type, title, body, auction_id, order_id, read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)',
    row.id, userId, row.type, row.title, row.body, row.auctionId, row.orderId, row.createdAt,
  );
  emitToUser(userId, 'notification', row);
  return row;
}
