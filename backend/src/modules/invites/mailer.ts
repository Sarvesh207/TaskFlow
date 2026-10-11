import { ApiError, ErrorCode } from "../../utils";

/**
 * Everything that sends email lives here, so tests can replace this one module
 * with `mock.module` and never reach the network (like auth/google.ts).
 *
 * Mail goes through Resend's HTTP API. Without RESEND_API_KEY, development
 * logs the invite link instead, so the whole flow works locally with no email
 * account; production refuses rather than silently dropping invites.
 */

export interface InviteEmail {
  to: string;
  projectName: string;
  inviterName: string;
  role: "admin" | "member";
  link: string;
}

const RESEND_URL = "https://api.resend.com/emails";
// Resend's shared test sender: works before a domain is verified, but then only
// delivers to the address that owns the Resend account.
const DEFAULT_FROM = "TaskFlow <onboarding@resend.dev>";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderInvite({ projectName, inviterName, role, link }: InviteEmail) {
  const roleLabel = role === "admin" ? "an admin" : "a member";
  const subject = `${inviterName} invited you to ${projectName} on TaskFlow`;
  const text = [
    `${inviterName} invited you to join "${projectName}" on TaskFlow as ${roleLabel}.`,
    "",
    `Accept the invite: ${link}`,
    "",
    "The link works for 7 days. If you weren't expecting this, you can ignore this email.",
  ].join("\n");

  const project = escapeHtml(projectName);
  const inviter = escapeHtml(inviterName);
  const href = escapeHtml(link);
  const html = `<!doctype html>
<html><body style="margin:0;background:#f4f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#252a3c">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e3e8ef;border-radius:16px;padding:32px">
        <tr><td>
          <p style="margin:0 0 24px;font-size:18px;font-weight:700">Task<span style="color:#327cf6">Flow</span></p>
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3">You're invited to ${project}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#556277">
            <strong style="color:#252a3c">${inviter}</strong> invited you to join
            <strong style="color:#252a3c">${project}</strong> as ${roleLabel}.
          </p>
          <a href="${href}" style="display:inline-block;background:#327cf6;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px">Accept invite</a>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b">
            Or paste this link into your browser:<br>
            <a href="${href}" style="color:#327cf6;word-break:break-all">${href}</a>
          </p>
          <p style="margin:24px 0 0;font-size:12px;color:#8a94a6">
            The link works for 7 days. If you weren't expecting this, you can ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject, text, html };
}

export async function sendInviteEmail(email: InviteEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(503, "Email is not configured on this server", [], {
        code: ErrorCode.SERVICE_UNAVAILABLE,
      });
    }
    console.info(`[invites] RESEND_API_KEY not set; invite link for ${email.to}: ${email.link}`);
    return;
  }

  const { subject, text, html } = renderInvite(email);
  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [email.to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend responded ${response.status}: ${await response.text()}`);
  }
}
