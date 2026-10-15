import { env } from '../config/env.js';

/**
 * Outgoing email. In v0 there is no mail server: messages are printed to the backend
 * console so password reset works in development. Swap `deliver` for an SMTP or
 * email-API client before real users sign up.
 */

interface Message {
  to: string;
  subject: string;
  text: string;
}

async function deliver(msg: Message): Promise<void> {
  if (env.NODE_ENV === 'test') return;
  // eslint-disable-next-line no-console
  console.log(
    ['', '──── Email (development: not actually sent) ────', `To:      ${msg.to}`, `Subject: ${msg.subject}`, '', msg.text, '────────────────────────────────────────────────', ''].join('\n'),
  );
}

export const MailService = {
  async sendPasswordReset(to: string, firstName: string | undefined, token: string, ttlMinutes: number) {
    const link = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
    await deliver({
      to,
      subject: 'Reset your K-WAIS password',
      text: [
        `Hi${firstName ? ` ${firstName}` : ''},`,
        '',
        'Someone asked to reset the password for this K-WAIS account. If it was you, open this link:',
        link,
        '',
        `The link works once and expires in ${ttlMinutes} minutes.`,
        'If you did not ask for this, you can ignore this email; your password will not change.',
      ].join('\n'),
    });
  },
};
