/**
 * A single Qur'anic phrase used as a cultural accent, not decoration.
 *
 * Only the phrase تَعَارَفُوا is shown — the full verse is deliberately not
 * reproduced, because doing so responsibly needs an authoritative translation
 * the client has approved rather than one chosen here. The short English gloss
 * below it is the meaning of this phrase, and the reference is cited so a
 * reader can check it.
 *
 * `lang="ar"` and `dir="rtl"` are load-bearing rather than cosmetic: they tell
 * the browser to shape the letters and place the tashkeel correctly, and tell a
 * screen reader to switch to Arabic pronunciation. The Arabic is NOT
 * aria-hidden — it carries meaning, so hiding it from assistive tech would
 * treat scripture as ornament, which is exactly what this avoids.
 */
export function ArabicAccent({
  className = "",
  tone = "light",
}: {
  className?: string;
  /** `light` for dark backgrounds, `dark` for pale ones. */
  tone?: "light" | "dark";
}) {
  const arabicColor = tone === "light" ? "text-white" : "text-brand-800";
  const glossColor = tone === "light" ? "text-white/70" : "text-stone-500";

  return (
    <figure className={`flex flex-col items-center gap-2 text-center ${className}`}>
      <p
        lang="ar"
        dir="rtl"
        className={`font-arabic text-3xl leading-[1.9] md:text-4xl ${arabicColor}`}
      >
        تَعَارَفُوا
      </p>
      <figcaption className={`flex flex-col gap-1 ${glossColor}`}>
        <span className="text-xs font-medium uppercase tracking-[0.14em]">
          So that you may know one another
        </span>
        <cite className="text-xs not-italic opacity-80">Qur&apos;an 49:13</cite>
      </figcaption>
    </figure>
  );
}
