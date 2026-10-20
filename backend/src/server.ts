import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { startReminderScheduler } from './services/reminder.service.js';
import { startRetentionScheduler } from './services/retention.service.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`K-WAIS API listening on http://localhost:${env.PORT}/api/v1`);
});
const stopReminders = startReminderScheduler();
const stopRetention = startRetentionScheduler();

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  stopReminders();
  stopRetention();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
