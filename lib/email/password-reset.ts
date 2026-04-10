import 'server-only';

import { sendEmail } from './send';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const safeUrl = escapeHtml(resetUrl);
  const subject = 'Reset your GasBite password';
  const text = [
    'We received a request to reset your GasBite password.',
    '',
    `Reset your password: ${resetUrl}`,
    '',
    'This link expires in 1 hour.',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <h1 style="margin: 0 0 16px; font-size: 28px;">Reset your password</h1>
      <p style="margin: 0 0 16px; line-height: 1.6;">
        We received a request to reset your GasBite password.
      </p>
      <p style="margin: 0 0 24px;">
        <a
          href="${safeUrl}"
          style="display: inline-block; background: #ea580c; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 999px; font-weight: 600;"
        >
          Reset password
        </a>
      </p>
      <p style="margin: 0 0 16px; line-height: 1.6;">
        Or paste this link into your browser:
      </p>
      <p style="margin: 0 0 16px; word-break: break-all; color: #475569;">
        ${safeUrl}
      </p>
      <p style="margin: 0; color: #64748b; line-height: 1.6;">
        This link expires in 1 hour. If you did not request this, you can ignore this email.
      </p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    text,
  });
}
