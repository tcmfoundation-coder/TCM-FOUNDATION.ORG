/**
 * Qur'an 57:11, shown in the Donate section.
 *
 * The Arabic is reproduced exactly as the client supplied it, including the
 * Qur'anic orthography most fonts get wrong — alef wasla (U+0671), superscript
 * alef (U+0670), small waw (U+06E5) and small low meem (U+06ED). Do not
 * "clean up", normalise, or retype this string: those marks are part of the
 * text, and a well-meant edit silently changes scripture. The English meaning
 * is the client's own wording, not a translation chosen here.
 *
 * It is a <blockquote> with a real <cite>, not a background image and not
 * decoration: `lang`/`dir` are load-bearing for letter shaping, diacritic
 * placement and screen-reader pronunciation, and nothing is aria-hidden.
 *
 * The layout lets the script sit the way it reads — the Arabic aligned to its
 * own right edge, the English to the left — rather than forcing both into a
 * centred ornament.
 */
export function DonateVerse() {
  return (
    <figure className="m-0 flex flex-col gap-7 rounded-2xl bg-brand-50 px-6 py-9 md:px-10 md:py-12">
      <blockquote className="m-0 flex flex-col gap-7">
        <p
          lang="ar"
          dir="rtl"
          className="font-arabic text-2xl leading-[2.15] text-brand-950 md:text-3xl md:leading-[2.2]"
        >
          مَّن ذَا ٱلَّذِي يُقْرِضُ ٱللَّهَ قَرْضًا حَسَنًا فَيُضَٰعِفَهُۥ لَهُۥ وَلَهُۥٓ أَجْرٌۭ كَرِيمٌۭ
        </p>

        <div className="h-px w-16 bg-brand-200" />

        <p className="max-w-xl font-display text-lg leading-relaxed text-stone-700 md:text-xl">
          &ldquo;Who is it that will lend Allah a good loan so He may multiply it for them, and they will have a
          noble reward?&rdquo;
        </p>
      </blockquote>

      <figcaption>
        <cite className="text-xs font-medium uppercase not-italic tracking-[0.14em] text-brand-700">
          Qur&apos;an 57:11
        </cite>
      </figcaption>
    </figure>
  );
}
