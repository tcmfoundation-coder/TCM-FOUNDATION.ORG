import { getSiteSettings } from "@/lib/api/site-settings";
import { TcmHubPopupDialog } from "./tcm-hub-popup-dialog";

export interface TcmHubPopupConfig {
  title: string;
  body?: string;
  ctaLabel: string;
  url: string;
}

// Admin-entered free-form JSON (Admin → Settings → Advanced Configuration),
// so nothing in it is trusted. An absent, disabled, or malformed config
// renders no popup at all rather than a broken or placeholder advert — the
// same rule SiteSettingsService applies to its URL fields ("null means not
// supplied yet, never a guessed link").
function parseConfig(value: unknown): TcmHubPopupConfig | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;

  // Opt-in: a config left in place with `enabled: false` retires the
  // campaign without the admin having to delete and retype it later.
  if (raw.enabled !== true) return null;

  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  if (!/^https?:\/\/\S+$/i.test(url)) return null;

  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!title) return null;

  const body = typeof raw.body === "string" && raw.body.trim() ? raw.body.trim() : undefined;
  const ctaLabel =
    typeof raw.ctaLabel === "string" && raw.ctaLabel.trim() ? raw.ctaLabel.trim() : "Visit TCM Hub";

  return { title, body, ctaLabel, url };
}

// The brief asks for a "pop up advert with link to TCM Hub", noting the Hub
// is a separate site — so this is purely an outbound referral, never an
// embedded surface. Config lives in SiteSettings rather than in code so TCM
// can start, reword, or retire a campaign without a deploy.
export async function TcmHubPopup() {
  const settings = await getSiteSettings();
  const config = parseConfig(settings.tcmHubPopup);
  if (!config) return null;

  return <TcmHubPopupDialog {...config} />;
}
