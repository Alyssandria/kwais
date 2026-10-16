import { HttpError } from '../lib/http-error.js';
import { NotificationModel, type NotificationRecord } from '../models/notification.model.js';

export interface NotificationView {
  id: string;
  type: NotificationRecord['type'];
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const toView = (n: NotificationRecord): NotificationView => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  link: n.link,
  read: n.readAt != null,
  createdAt: n.createdAt.toISOString(),
});

export const NotificationService = {
  async list(userId: string, limit = 50): Promise<{ items: NotificationView[]; unread: number }> {
    const [rows, unread] = await Promise.all([NotificationModel.list(userId, limit), NotificationModel.countUnread(userId)]);
    return { items: rows.map(toView), unread };
  },

  async markRead(userId: string, id: string): Promise<void> {
    if ((await NotificationModel.markRead(userId, id)) === 0 && !(await NotificationModel.exists(userId, id))) {
      throw HttpError.notFound('Notification not found');
    }
  },

  async markAllRead(userId: string): Promise<number> {
    return NotificationModel.markAllRead(userId);
  },
};
