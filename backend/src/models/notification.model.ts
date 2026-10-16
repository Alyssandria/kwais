import type { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';

const select = {
  id: true,
  type: true,
  title: true,
  body: true,
  link: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

export type NotificationRecord = Prisma.NotificationGetPayload<{ select: typeof select }>;

export const NotificationModel = {
  list(userId: string, limit: number): Promise<NotificationRecord[]> {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit, select });
  },

  countUnread(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, readAt: null } });
  },

  create(userId: string, data: { type: NotificationType; title: string; body: string; link: string | null }): Promise<NotificationRecord> {
    return prisma.notification.create({ data: { ...data, userId }, select });
  },

  existsSince(userId: string, type: NotificationType, since: Date): Promise<boolean> {
    return prisma.notification.count({ where: { userId, type, createdAt: { gte: since } } }).then((n) => n > 0);
  },

  async markRead(userId: string, id: string): Promise<number> {
    const r = await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
    return r.count;
  },

  async markAllRead(userId: string): Promise<number> {
    const r = await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return r.count;
  },

  exists(userId: string, id: string): Promise<boolean> {
    return prisma.notification.count({ where: { id, userId } }).then((n) => n > 0);
  },
};
