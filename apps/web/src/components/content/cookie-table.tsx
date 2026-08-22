/**
 * Every row here is a cookie this application verifiably sets. Names,
 * durations and flags were read from the implementation, not from a template:
 *
 *   - access_token / refresh_token / mfa_pending_token
 *       apps/api/src/modules/identity/auth/cookie.util.ts (flags)
 *       apps/api/src/modules/identity/auth/auth.constants.ts (names, TTLs)
 *   - tcm-consent      apps/web/src/lib/consent.ts
 *   - ab-hero-cta      apps/web/src/proxy.ts
 *   - _ga / _ga_*      set by Google's gtag.js, not by this codebase — listed
 *                      because they appear on TCM's domain, and marked as
 *                      Google's so the distinction is visible to the reader.
 *
 * Deliberately absent: retention obligations, lawful bases, and jurisdiction —
 * those are legal determinations, not facts readable from the code.
 *
 * If a cookie is added, changed or removed in code, update this table in the
 * same change: it is the published description of what the site does.
 */

const ROWS: {
  name: string;
  purpose: string;
  duration: string;
  necessity: "Required" | "Optional";
}[] = [
  {
    name: "access_token",
    purpose: "Keeps a signed-in editor authenticated in the content management system.",
    duration: "15 minutes",
    necessity: "Required",
  },
  {
    name: "refresh_token",
    purpose: "Renews an editor's session without asking them to sign in again.",
    duration: "30 days",
    necessity: "Required",
  },
  {
    name: "mfa_pending_token",
    purpose: "Holds an editor's part-completed sign-in between password and two-factor steps.",
    duration: "5 minutes",
    necessity: "Required",
  },
  {
    name: "tcm-consent",
    purpose: "Records your cookie choice so the site can honour it and stop asking.",
    duration: "1 year",
    necessity: "Required",
  },
  {
    name: "ab-hero-cta",
    purpose:
      "Keeps you on one version of the homepage call-to-action wording so the comparison stays consistent.",
    duration: "30 days",
    necessity: "Optional",
  },
  {
    name: "_ga, _ga_*",
    purpose: "Google Analytics: measures how visitors use the site. Set by Google.",
    duration: "Set by Google Analytics",
    necessity: "Optional",
  },
];

export function CookieTable() {
  return (
    // Scrolls within its own container so a narrow screen never makes the
    // whole page scroll sideways.
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <caption className="sr-only">Cookies used by the TCM Foundation website</caption>
        <thead>
          <tr className="border-b border-stone-300 text-left">
            <th scope="col" className="py-2 pr-4 font-medium text-stone-900">
              Name
            </th>
            <th scope="col" className="py-2 pr-4 font-medium text-stone-900">
              Purpose
            </th>
            <th scope="col" className="py-2 pr-4 font-medium text-stone-900">
              Duration
            </th>
            <th scope="col" className="py-2 font-medium text-stone-900">
              Consent
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.name} className="border-b border-stone-200 align-top">
              <td className="py-3 pr-4 font-mono text-xs text-stone-800">{row.name}</td>
              <td className="py-3 pr-4 text-stone-700">{row.purpose}</td>
              <td className="py-3 pr-4 whitespace-nowrap text-stone-700">{row.duration}</td>
              <td className="py-3">
                <span
                  className={
                    row.necessity === "Required"
                      ? "whitespace-nowrap rounded-sm bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700"
                      : "whitespace-nowrap rounded-sm bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800"
                  }
                >
                  {row.necessity}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
