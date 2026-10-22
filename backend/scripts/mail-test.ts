import { env } from '../src/config/env.js';
import { deliver } from '../src/services/mail.service.js';

const to = process.argv[2];
if (!to) {
  console.error('Usage: pnpm mail:test you@example.com');
  process.exit(1);
}

console.log(`Sending a test email to ${to} with MAIL_TRANSPORT=${env.MAIL_TRANSPORT}${env.MAIL_TRANSPORT === 'smtp' ? ` via ${env.SMTP_HOST}:${env.SMTP_PORT}` : ''}`);
const ok = await deliver({
  to,
  subject: 'K-WAIS test email',
  text: 'If you can read this, K-WAIS can send email. Nothing else to do.',
});
console.log(ok ? 'Done.' : 'Failed. Check SMTP_USER, SMTP_PASS and that MAIL_FROM uses a sender verified in Brevo.');
process.exitCode = ok ? 0 : 1;
