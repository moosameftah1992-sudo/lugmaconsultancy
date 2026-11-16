import nodemailer from "nodemailer";
import { db } from "@/db";
import { emailLog } from "@/db/schema";
import type { Locale } from "@/types";

export type EmailStatus = "sent" | "failed" | "not_configured";

export const emailConfigured = (): boolean => Boolean(process.env.SMTP_HOST && process.env.EMAIL_FROM);

interface Message {
  to: string;
  kind: string;
  locale: Locale;
  subject: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function render(m: Message): { html: string; text: string } {
  const rtl = m.locale === "ar";
  const body = m.paragraphs
    .map((p) => `<p style="margin:0 0 14px;line-height:1.7;color:#33415c;font-size:15px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const cta = m.cta
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(m.cta.url)}" style="display:inline-block;background:#0b1f3d;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600">${escapeHtml(m.cta.label)}</a></p>`
    : "";
  const html = `<!doctype html><html lang="${m.locale}" dir="${rtl ? "rtl" : "ltr"}"><body style="margin:0;background:#faf8f4;font-family:Tahoma,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e6e2d9;border-radius:16px">
<tr><td style="padding:24px 28px;border-bottom:3px solid #12a857;text-align:${rtl ? "right" : "left"}"><span style="font-size:22px;font-weight:700;color:#0b1f3d;letter-spacing:-0.3px">Luqma</span></td></tr>
<tr><td style="padding:28px;text-align:${rtl ? "right" : "left"}"><h1 style="margin:0 0 16px;font-size:20px;color:#0b1f3d">${escapeHtml(m.heading)}</h1>${body}${cta}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e6e2d9;color:#7a8499;font-size:12px;text-align:${rtl ? "right" : "left"}">Luqma — Restaurant Solutions &amp; Operations · Bahrain</td></tr>
</table></td></tr></table></body></html>`;
  const text = [m.heading, "", ...m.paragraphs, ...(m.cta ? ["", `${m.cta.label}: ${m.cta.url}`] : [])].join("\n");
  return { html, text };
}

/**
 * Sends a transactional e-mail over SMTP and records the outcome in email_log.
 * Never throws: callers get the real delivery status and can show it to the admin.
 */
export async function sendEmail(message: Message): Promise<EmailStatus> {
  let status: EmailStatus = "not_configured";
  let error: string | null = null;

  if (emailConfigured()) {
    try {
      const port = Number(process.env.SMTP_PORT ?? 587);
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
      });
      const { html, text } = render(message);
      await transport.sendMail({ from: process.env.EMAIL_FROM, to: message.to, subject: message.subject, html, text });
      status = "sent";
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message.slice(0, 500) : "Unknown error";
      console.error("[email] delivery failed:", error);
    }
  }

  try {
    await db.insert(emailLog).values({ toEmail: message.to, subject: message.subject, kind: message.kind, status, error });
  } catch (e) {
    console.error("[email] could not write log", e);
  }
  return status;
}

/** Internal heads-up for the Luqma team (new inquiry / new order). Silent when not configured. */
export async function notifyTeam(subject: string, paragraphs: string[], url?: string): Promise<void> {
  const to = process.env.ADMIN_NOTIFY_EMAIL?.trim();
  if (!to || !emailConfigured()) return;
  await sendEmail({
    to,
    kind: "team",
    locale: "en",
    subject,
    heading: subject,
    paragraphs,
    cta: url ? { label: "Open", url } : undefined,
  });
}
