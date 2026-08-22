import { renderEmailHtml, renderEmailText } from './email-layout';
import type { SendEmailOptions } from '../mail.service';

/**
 * Newsletter transactional email. Shares the layout with the auth templates
 * so both read as coming from the same organisation.
 *
 * The unsubscribe link ships inside the confirmation rather than being left
 * for later: the published privacy policy promises subscribers can withdraw
 * consent, and putting the link in the message that confirms the
 * subscription is the only way that promise reliably reaches them. It sits
 * in the footer, where recipients expect it, so it does not compete with the
 * message's actual purpose.
 */
export function newsletterConfirmationEmail(
  to: string,
  siteUrl: string,
  unsubscribeUrl: string,
): SendEmailOptions {
  const content = {
    heading: 'Thank you for subscribing',
    intro:
      "You're subscribed to updates from TCM Foundation. We'll keep you posted on our events, programmes, and the services we offer to Muslim women growing their careers, businesses, and leadership.",
    actionLabel: 'Visit TCM Foundation',
    actionUrl: siteUrl,
    securityNote:
      "You received this because this address was used to subscribe on our website. If that wasn't you, or you change your mind later, use the unsubscribe link below — no account or password needed.",
    footerLink: { label: 'Unsubscribe', url: unsubscribeUrl },
  };

  return {
    to,
    subject: 'Thank you for subscribing to TCM Foundation',
    text: renderEmailText(content),
    html: renderEmailHtml(content),
  };
}
