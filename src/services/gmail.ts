export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
}

/**
 * Creates an RFC 2822 multipart/alternative MIME message and encodes it in URL-safe Base64.
 */
export function createRawMimeMessage({
  to,
  subject,
  html,
  text,
  fromName,
}: SendEmailPayload): string {
  const boundary = `__boundary_${Date.now()}_${Math.random().toString(36).substring(2)}__`;
  const cleanSubject = subject.replace(/[\r\n]/g, ' ');
  
  // Clean plain text fallback
  const plainText = text || html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // UTF-8 base64 encoded subject
  const utf8Subject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(cleanSubject)))}?=`;

  const headers = [
    `To: ${to}`,
    fromName ? `From: "${fromName}" <me>` : `From: <me>`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join('\r\n');

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(plainText))),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(html))),
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const fullMessage = `${headers}\r\n\r\n${body}`;

  // RFC 4648 URL-safe Base64 encoding without padding
  return btoa(unescape(encodeURIComponent(fullMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Dispatches an email directly via the official Gmail REST API using the user's OAuth access token.
 */
export async function sendGmailEmail(
  accessToken: string,
  payload: SendEmailPayload
): Promise<{ id: string; threadId: string }> {
  const raw = createRawMimeMessage(payload);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || `Gmail API error (${response.status}: ${response.statusText})`;
    throw new Error(message);
  }

  return response.json();
}

/**
 * Generates a standard mailto: URI for desktop or mobile mail client fallback
 */
export function generateMailtoUrl(to: string, subject: string, bodyText: string): string {
  const params = new URLSearchParams({
    subject,
    body: bodyText,
  });
  return `mailto:${to}?${params.toString().replace(/\+/g, '%20')}`;
}

/**
 * Generates a Gmail Web compose link so the user can open it directly in their web browser
 */
export function generateGmailWebComposeUrl(to: string, subject: string, bodyText: string): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to,
    su: subject,
    body: bodyText,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/**
 * Downloads a complete RFC 2822 .eml file to the user's device for opening in Outlook or Apple Mail
 */
export function downloadEmlFile(payload: SendEmailPayload, filename?: string) {
  const boundary = `__boundary_${Date.now()}__`;
  const plainText = payload.text || payload.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  
  const emlContent = [
    `To: ${payload.to}`,
    `Subject: ${payload.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    plainText,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    payload.html,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  const blob = new Blob([emlContent], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `real_estate_email_${Date.now()}.eml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
