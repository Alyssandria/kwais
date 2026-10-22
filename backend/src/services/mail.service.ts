import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

export interface Message {
  to: string;
  subject: string;
  text: string;
}

let transporter: Transporter | null = null;

function smtp(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
}

function printToConsole(msg: Message) {
  console.log(
    ['', '──── Email (MAIL_TRANSPORT=console: not actually sent) ────', `To:      ${msg.to}`, `Subject: ${msg.subject}`, '', msg.text, '──────────────────────────────────────────────────────────', ''].join('\n'),
  );
}

export async function deliver(msg: Message): Promise<boolean> {
  if (env.NODE_ENV === 'test') return true;
  if (env.MAIL_TRANSPORT === 'console') {
    printToConsole(msg);
    return true;
  }
  try {
    await smtp().sendMail({ from: env.MAIL_FROM, to: msg.to, subject: msg.subject, text: msg.text });
    return true;
  } catch (err) {
    console.error(`Email to ${msg.to} failed: ${(err as Error).message}`);
    return false;
  }
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
