import nodemailer from "nodemailer";
import { Resend } from "resend";
import { getJiaLogoAttachment } from "./jia-logo";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends transactional emails using SMTP in development and Resend in production.
 */
export class EmailService {
  /**
   * Delivers one email using the configured provider for the current environment.
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      await this.sendWithResend(options);
      return;
    }

    await this.sendWithSmtp(options);
  }

  /** Sends email through Resend (production). */
  private async sendWithResend(options: SendEmailOptions): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(apiKey);
    const from = process.env.EMAIL_FROM ?? "onboarding@company.com";

    const logo = getJiaLogoAttachment();

    const { error } = await resend.emails.send({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: [
        {
          filename: logo.filename,
          content: logo.content,
          contentId: logo.contentId,
        },
      ],
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /** Sends email through SMTP (development — e.g. Gmail at smtp.gmail.com:587). */
  private async sendWithSmtp(options: SendEmailOptions): Promise<void> {
    const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.EMAIL_FROM ?? user ?? "onboarding@company.com";

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    const logo = getJiaLogoAttachment();

    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: [
        {
          filename: logo.filename,
          path: logo.path,
          cid: logo.cid,
        },
      ],
    });
  }
}
