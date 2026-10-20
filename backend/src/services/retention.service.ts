import { env } from '../config/env.js';
import { PrivacyModel } from '../models/privacy.model.js';

const DAY_MS = 86_400_000;
const TOKEN_GRACE_DAYS = 7;

export interface RetentionResult {
  meals: number;
  auditEntries: number;
  tokens: number;
}

export const RetentionService = {
  async run(now = new Date()): Promise<RetentionResult> {
    const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS);
    const meals = await PrivacyModel.purgeDeletedMeals(daysAgo(env.SOFT_DELETE_RETENTION_DAYS));
    const audit = await PrivacyModel.purgeAuditBefore(daysAgo(env.AUDIT_RETENTION_DAYS));
    const tokens = await PrivacyModel.purgeSpentTokens(daysAgo(TOKEN_GRACE_DAYS));
    return { meals: meals.count, auditEntries: audit.count, tokens };
  },
};

export function startRetentionScheduler(everyMs = DAY_MS): () => void {
  const tick = () => {
    RetentionService.run()
      .then((r) => {
        if (r.meals || r.auditEntries || r.tokens) console.log('Retention purge', r);
      })
      .catch((err) => console.error('Retention purge failed', err));
  };
  const first = setTimeout(tick, 60_000);
  const timer = setInterval(tick, everyMs);
  first.unref();
  timer.unref();
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}
