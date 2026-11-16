import { useId } from "react";

/**
 * Luqma logo. The mark is drawn as inline SVG so it stays crisp at every size and
 * needs no network request. To use the original artwork instead, drop the file in
 * /public/brand/ and replace <LogoMark /> with an <img>.
 */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  const leaf = "M0 0C-5-8-5-20 0-28 5-20 5-8 0 0Z";
  // Unique gradient ids per instance: a page can hold several logos, and a gradient
  // defined inside a hidden one would otherwise blank out the visible ones.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids = { leaf: `lq-leaf-${uid}`, bar: `lq-bar-${uid}`, swoosh: `lq-swoosh-${uid}` };
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={ids.leaf} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FBC043" />
          <stop offset="1" stopColor="#EC7A08" />
        </linearGradient>
        <linearGradient id={ids.bar} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#15A858" />
          <stop offset="1" stopColor="#0B6A4C" />
        </linearGradient>
        <linearGradient id={ids.swoosh} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0A7A47" />
          <stop offset="1" stopColor="#1CC062" />
        </linearGradient>
      </defs>
      <path d="M18 24c0-7 5-12 12-12h6v40L18 62z" fill="#0B2545" />
      <path d="M14 80c0-5 3-9 7-11l17-9v12h46c-2 9-9 14-19 14H24c-6 0-10-2-10-6z" fill="#0B2545" />
      <path d="M44 60l7-2.5V70h-7zM55 53l7-2.5V70h-7zM66 46l7-2.5V70h-7z" fill={`url(#${ids.bar})`} />
      <g fill={`url(#${ids.leaf})`}>
        <path d={leaf} transform="translate(45 45) rotate(-12) scale(.95)" />
        <path d={leaf} transform="translate(45 45) rotate(13) scale(1.1)" />
        <path d={leaf} transform="translate(45 45) rotate(38)" />
        <path d={leaf} transform="translate(45 45) rotate(61) scale(.76)" />
      </g>
      <path
        d="M4 84C6 54 64 40 78 23C74 44 26 56 10 88Z"
        fill={`url(#${ids.swoosh})`}
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinejoin="round"
        paintOrder="stroke"
      />
    </svg>
  );
}

export function Logo({ tagline = false, size = "md" }: { tagline?: boolean; size?: "sm" | "md" | "lg" }) {
  const mark = size === "lg" ? "size-14" : size === "sm" ? "size-8" : "size-10";
  const word = size === "lg" ? "text-4xl" : size === "sm" ? "text-xl" : "text-[1.65rem]";
  return (
    // The brand name is always set left-to-right, in both languages.
    <span dir="ltr" className="inline-flex items-center gap-2">
      <LogoMark className={`${mark} shrink-0`} />
      <span className="flex flex-col">
        <span className={`${word} leading-none font-bold tracking-tight text-navy-900`}>Luqma</span>
        {tagline && (
          <span className="mt-1.5 flex items-center gap-1.5 text-[11px] leading-none font-medium text-navy-700">
            <span className="h-0.5 w-3 rounded-full bg-emerald-500" />
            Restaurant Solutions &amp; Operations
            <span className="h-0.5 w-3 rounded-full bg-emerald-500" />
          </span>
        )}
      </span>
    </span>
  );
}
