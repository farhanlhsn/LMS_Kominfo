import { Injectable, Logger } from "@nestjs/common";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.from = process.env.SMTP_FROM ?? "LMS Platform <noreply@example.com>";
    this.enabled = Boolean(host && user && pass);

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Email service ready (SMTP ${host}:${port})`);
    } else {
      this.logger.warn("Email service disabled — set SMTP_HOST, SMTP_USER, SMTP_PASS to enable");
    }
  }

  async sendPasswordReset(to: string, name: string | null, resetUrl: string): Promise<void> {
    await this.send({
      to,
      subject: "Reset your password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin-bottom:8px">Reset your password</h2>
          <p>Hi ${name ?? "there"},</p>
          <p>We received a request to reset your password. Click the button below to choose a new one.</p>
          <a href="${resetUrl}"
            style="display:inline-block;margin:20px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Reset Password
          </a>
          <p style="color:#888;font-size:12px">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
          <p style="color:#888;font-size:12px">Or copy this link: ${resetUrl}</p>
        </div>
      `,
    });
  }

  async sendOrganizationInvite(
    to: string,
    inviterName: string,
    orgName: string,
    loginUrl: string,
    message?: string,
  ): Promise<void> {
    await this.send({
      to,
      subject: `You've been invited to join ${orgName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin-bottom:8px">You're invited!</h2>
          <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on LMS Platform.</p>
          ${message ? `<p style="background:#f4f4f5;padding:12px;border-radius:6px;font-style:italic">"${message}"</p>` : ""}
          <a href="${loginUrl}"
            style="display:inline-block;margin:20px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Accept Invitation
          </a>
          <p style="color:#888;font-size:12px">If you didn't expect this invitation, you can ignore this email.</p>
        </div>
      `,
    });
  }

  async sendWelcome(to: string, name: string | null, orgName: string, loginUrl: string): Promise<void> {
    await this.send({
      to,
      subject: `Welcome to ${orgName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="margin-bottom:8px">Welcome to ${orgName}!</h2>
          <p>Hi ${name ?? "there"}, your account has been created.</p>
          <a href="${loginUrl}"
            style="display:inline-block;margin:20px 0;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
            Sign in now
          </a>
        </div>
      `,
    });
  }

  private async send(options: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.enabled || !this.transporter) {
      this.logger.debug(`Email skipped (disabled): to=${options.to} subject="${options.subject}"`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, ...options });
      this.logger.debug(`Email sent: to=${options.to} subject="${options.subject}"`);
    } catch (err) {
      this.logger.error(`Email send failed: ${String(err)}`);
    }
  }
}
