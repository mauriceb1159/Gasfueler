import 'server-only';

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

function getEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || 'GasBite <onboarding@resend.dev>',
  };
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const { apiKey, from } = getEmailConfig();

  if (!apiKey) {
    return { sent: false as const, reason: 'missing_api_key' as const };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Email send failed: ${response.status} ${details}`);
  }

  return { sent: true as const };
}
