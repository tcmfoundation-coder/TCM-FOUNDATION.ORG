import {
  renderEmailHtml,
  renderEmailText,
  type EmailContent,
} from './email-layout';
import type { SendEmailOptions } from '../mail.service';

/**
 * The two transactional emails the application actually sends today. No
 * speculative templates: anything else would be unused code in an
 * authentication path.
 *
 * Subjects, destination URLs, and expiry wording are carried over verbatim
 * from the previous inline plain-text bodies — this changed presentation
 * only, never the meaning or the security guidance.
 */

function build(
  to: string,
  subject: string,
  content: EmailContent,
): SendEmailOptions {
  return {
    to,
    subject,
    text: renderEmailText(content),
    html: renderEmailHtml(content),
  };
}

export function emailVerificationEmail(
  to: string,
  verifyUrl: string,
): SendEmailOptions {
  return build(to, 'Verify your TCM Foundation account email', {
    heading: 'Verify your email address',
    intro:
      'An administrator created a TCM Foundation account for this email address. Confirm it belongs to you to finish setting the account up.',
    actionLabel: 'Verify email address',
    actionUrl: verifyUrl,
    securityNote:
      'This link expires in 24 hours. If you were not expecting this, you can safely ignore this email.',
  });
}

export function passwordResetEmail(
  to: string,
  resetUrl: string,
): SendEmailOptions {
  return build(to, 'Reset your TCM Foundation password', {
    heading: 'Reset your password',
    intro:
      'We received a request to reset the password for your TCM Foundation account.',
    actionLabel: 'Reset password',
    actionUrl: resetUrl,
    securityNote:
      "This link expires in 1 hour and can only be used once. If you didn't request this, ignore this email — your password will not change.",
  });
}
