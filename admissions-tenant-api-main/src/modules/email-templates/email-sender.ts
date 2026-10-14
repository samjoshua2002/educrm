import { MailerService } from '../notifications/mailer.service.js';

export interface OrgEmailAttachment {
  name: string;
  url: string;
  type?: string;
}

export interface OrgEmailResult {
  ok: boolean;
  messageId?: string;
  /** SMTP server rejected the recipient permanently (5xx) */
  bounced?: boolean;
  error?: string;
}

const escapeHtml = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** Treats the body as HTML when it contains tags; otherwise escapes it and keeps line breaks. */
export function bodyToHtml(body: string): string {
  if (/<\/?[a-z][\s\S]*>/i.test(body || '')) return body;
  return `<div style="white-space: pre-line;">${escapeHtml(body || '')}</div>`;
}

export function htmlToText(html: string): string {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h\d|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Standard branded wrapper used by compose / scheduled / test emails. */
export function buildEmailHtml(opts: {
  subject: string;
  body: string;
  header?: string | null;
  footer?: string | null;
  signature?: string | null;
  category?: string | null;
  senderName?: string | null;
  applicationNo?: string | null;
  preHeader?: string | null;
  extraFooterHtml?: string | null;
}): string {
  return `
      ${opts.preHeader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preHeader)}</div>` : ''}
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #1e293b; line-height: 1.6; font-size: 14px; background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        ${opts.header ? `<div style="margin-bottom: 16px;">${bodyToHtml(opts.header)}</div>` : ''}
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 18px; font-weight: 700;">${escapeHtml(opts.subject)}</h2>
          ${
            opts.category
              ? `<span style="display:inline-block; margin-top: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; background: #eff6ff; color: #1d4ed8; padding: 2px 8px; border-radius: 9999px;">${escapeHtml(opts.category)}</span>`
              : ''
          }
        </div>
        <div style="margin-bottom: 24px;">${bodyToHtml(opts.body)}</div>
        ${opts.signature ? `<div style="margin-bottom: 20px; color: #334155;">${bodyToHtml(opts.signature)}</div>` : ''}
        ${
          opts.footer
            ? `<div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-bottom: 20px; font-size: 12px; color: #64748b;">${bodyToHtml(opts.footer)}</div>`
            : ''
        }
        <div style="border-top: 1px solid #f1f5f9; padding-top: 14px; font-size: 12px; color: #64748b;">
          <p style="margin: 0;">Sent by: <strong>${escapeHtml(opts.senderName || 'Admissions Desk')}</strong></p>
          ${opts.applicationNo ? `<p style="margin: 2px 0 0 0;">Application Ref: ${escapeHtml(opts.applicationNo)}</p>` : ''}
          ${opts.extraFooterHtml || ''}
        </div>
      </div>
    `;
}

/**
 * Sends through the organization's SMTP (MailerService.getTransporterForOrg)
 * with attachments (by URL) and custom headers (List-Unsubscribe).
 */
export async function sendOrgEmail(
  mailer: MailerService,
  opts: {
    organizationId?: string | null;
    to: string;
    subject: string;
    html: string;
    text?: string;
    fromName?: string | null;
    attachments?: OrgEmailAttachment[];
    headers?: Record<string, string>;
  },
): Promise<OrgEmailResult> {
  try {
    const { transporter, fromEmail, fromName } = await mailer.getTransporterForOrg(opts.organizationId || undefined);
    const info: any = await transporter.sendMail({
      from: `"${opts.fromName || fromName || 'Admissions Desk'}" <${fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || htmlToText(opts.html),
      headers: opts.headers,
      attachments: (opts.attachments || [])
        .filter((a) => a?.url)
        .map((a) => ({ filename: a.name || a.url.split('/').pop() || 'attachment', path: a.url })),
    });
    const rejected: any[] = Array.isArray(info?.rejected) ? info.rejected : [];
    if (rejected.length > 0) {
      return { ok: false, bounced: true, messageId: info?.messageId, error: `Recipient rejected: ${rejected.join(', ')}` };
    }
    return { ok: true, messageId: info?.messageId };
  } catch (err: any) {
    const code = Number(err?.responseCode) || 0;
    return { ok: false, bounced: code >= 500 && code < 600, error: err?.message || String(err) };
  }
}
