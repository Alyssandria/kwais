import { localDateTime, localDayStart } from '../lib/time.js';
import { MealModel } from '../models/meal.model.js';
import { NotificationModel } from '../models/notification.model.js';
import { PatientProfileModel } from '../models/patient-profile.model.js';
import { ConsentService } from './consent.service.js';

export const REMINDER = {
  title: 'Time to log today’s meals',
  body: 'You haven’t logged anything today. A quick entry keeps your totals and trends accurate.',
  link: '/patient/meals/new',
};

export const ReminderService = {
  async runDue(now = new Date()): Promise<number> {
    let sent = 0;
    for (const p of await PatientProfileModel.withReminderTime()) {
      const localTime = localDateTime(now, p.timezone).slice(11);
      if (localTime < p.reminderTime) continue;
      const dayStart = localDayStart(now, p.timezone);
      if (await NotificationModel.existsSince(p.userId, 'meal_reminder', dayStart)) continue;
      if (!(await ConsentService.current(p.userId)).reminders?.granted) continue;
      if ((await MealModel.countSince(p.id, dayStart)) > 0) continue;
      await NotificationModel.create(p.userId, { type: 'meal_reminder', ...REMINDER });
      sent++;
    }
    return sent;
  },
};

export function startReminderScheduler(everyMs = 5 * 60 * 1000): () => void {
  const tick = () => {
    ReminderService.runDue().catch((err) => console.error('Reminder run failed', err));
  };
  tick();
  const timer = setInterval(tick, everyMs);
  timer.unref();
  return () => clearInterval(timer);
}
