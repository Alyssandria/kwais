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

  async sendCareRequestToPatient(to: string, patientFirstName: string, doctorName: string, details: string, message: string | null) {
    await deliver({
      to,
      subject: `${doctorName} wants to follow your K-WAIS records`,
      text: [
        `Hi ${patientFirstName},`,
        '',
        `${doctorName}${details ? ` (${details})` : ''} asked to see your K-WAIS meals, lab results and targets.`,
        ...(message ? ['', `Their message: "${message}"`] : []),
        '',
        `Nothing is shared unless you approve. Sign in and open Settings, then Care team: ${env.CLIENT_URL}/patient/settings`,
        '',
        'These details were entered by the doctor; K-WAIS has not checked them. If you do not know this person, decline the request.',
      ].join('\n'),
    });
  },

  async sendCareInviteToDoctor(to: string, patientName: string, message: string | null) {
    await deliver({
      to,
      subject: `${patientName} invited you to follow their kidney diet records`,
      text: [
        'Hello,',
        '',
        `${patientName} uses K-WAIS to log meals for chronic kidney disease, and invited you to see their records.`,
        ...(message ? ['', `Their message: "${message}"`] : []),
        '',
        `Sign in and accept it under Patients, then Requests: ${env.CLIENT_URL}/doctor/dashboard`,
        '',
        `If you do not know ${patientName}, decline it. Nothing is shared until you accept.`,
      ].join('\n'),
    });
  },

  async sendCareInviteToNewDoctor(to: string, patientName: string, token: string, validDays: number, message: string | null) {
    const link = `${env.CLIENT_URL}/doctor/invite?token=${encodeURIComponent(token)}`;
    await deliver({
      to,
      subject: `${patientName} invited you to follow their kidney diet records`,
      text: [
        'Hello,',
        '',
        `${patientName} uses K-WAIS to log meals for chronic kidney disease, and invited you to see their records:`,
        'meals, estimated sodium, potassium, phosphorus and protein, and lab results.',
        ...(message ? ['', `Their message: "${message}"`] : []),
        '',
        'Sign up as a doctor (or sign in) and accept:',
        link,
        '',
        `The link works for ${validDays} days. If you do not know ${patientName}, ignore this email. Nothing is shared until you accept.`,
      ].join('\n'),
    });
  },
};
