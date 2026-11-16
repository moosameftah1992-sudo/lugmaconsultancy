"use client";

import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { bi } from "@/i18n";
import { useLocale, useT } from "@/i18n/client";
import { biLabel, type PortfolioSlide } from "@/types";

/** Each slide stays on screen for three seconds before the carousel advances. */
const DWELL_MS = 3000;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCED_MOTION);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** Signed distance of slide `i` from the active slide on a circular track. */
function offsetOf(i: number, active: number, n: number): number {
  const half = Math.floor(n / 2);
  return ((((i - active + half) % n) + n) % n) - half;
}

const PROVIDER_LABEL: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  vimeo: "Vimeo",
  tiktok: "TikTok",
};

function SlideCover({ slide }: { slide: PortfolioSlide }) {
  if (slide.cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={slide.cover} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />;
  }
  if (slide.kind === "video") {
    // "#t=0.1" makes browsers paint the first frame as a poster.
    return (
      <video src={`${slide.src}#t=0.1`} muted playsInline preload="metadata" tabIndex={-1} className="absolute inset-0 size-full object-cover" />
    );
  }
  return (
    <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_0%,#1c3560_0%,#0b1f3d_55%,#06132a_100%)]">
      <span dir="ltr" className="absolute start-6 top-16 text-4xl font-bold text-white/10 sm:text-5xl">
        {PROVIDER_LABEL[slide.provider ?? ""] ?? "Luqma"}
      </span>
    </div>
  );
}

function Lightbox({
  slides,
  index,
  onClose,
  onStep,
}: {
  slides: PortfolioSlide[];
  index: number;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const t = useT();
  const rtl = useLocale() === "ar";
  const slide = slides[index];
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onStep(rtl ? -1 : 1);
      else if (e.key === "ArrowLeft") onStep(rtl ? 1 : -1);
      else if (e.key === "Tab") {
        // Keep keyboard focus inside the dialog.
        const items = dialogRef.current?.querySelectorAll<HTMLElement>("button, iframe, video, a[href]");
        if (!items?.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onStep, rtl]);

  const many = slides.length > 1;
  const navButton =
    "grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={slide.title || t("Portfolio item", "عمل من المعرض")}
      className="lq-fade-in fixed inset-0 z-50 flex flex-col bg-navy-950/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
        <p className="min-w-0 truncate text-sm text-white/80">
          {many && (
            <span dir="ltr" className="me-3 tabular-nums text-white/60">
              {index + 1} / {slides.length}
            </span>
          )}
          <span className="font-medium text-white">{slide.title}</span>
        </p>
        <button ref={closeRef} type="button" onClick={onClose} className={navButton} aria-label={t("Close", "إغلاق")}>
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center gap-2 px-2 pb-2 sm:gap-4 sm:px-6">
        {many && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStep(-1);
            }}
            className={`${navButton} max-sm:hidden`}
            aria-label={t("Previous item", "العمل السابق")}
          >
            <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
          </button>
        )}

        <div className="flex h-full min-w-0 flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
          {slide.kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={slide.id} src={slide.src} alt={slide.title} className="max-h-full max-w-full rounded-xl object-contain" />
          )}
          {slide.kind === "video" && (
            <video key={slide.id} src={slide.src} controls autoPlay playsInline className="max-h-full max-w-full rounded-xl bg-black" />
          )}
          {slide.kind === "embed" && (
            <iframe
              key={slide.id}
              src={slide.src}
              title={slide.title || "Embedded media"}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
              allowFullScreen
              className={
                slide.portrait
                  ? "h-full max-h-[780px] w-full max-w-[420px] rounded-xl border-0 bg-white"
                  : "aspect-video max-h-full w-full max-w-5xl rounded-xl border-0 bg-black"
              }
            />
          )}
        </div>

        {many && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStep(1);
            }}
            className={`${navButton} max-sm:hidden`}
            aria-label={t("Next item", "العمل التالي")}
          >
            <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pt-1 pb-4 sm:px-6" onClick={(e) => e.stopPropagation()}>
        <p className="line-clamp-2 min-w-0 flex-1 text-sm leading-relaxed text-white/75">{slide.description}</p>
        {many && (
          <div className="flex gap-2 sm:hidden">
            <button type="button" onClick={() => onStep(-1)} className={navButton} aria-label={t("Previous item", "العمل السابق")}>
              <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onStep(1)} className={navButton} aria-label={t("Next item", "العمل التالي")}>
              <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Portfolio showcase: a circular carousel that advances every 3 seconds. Any item opens
 * instantly in an in-page viewer — uploads play natively, external links (Instagram
 * reels, YouTube…) play in an embedded player without leaving the site.
 */
export function PortfolioCarousel({ slides }: { slides: PortfolioSlide[] }) {
  const t = useT();
  const rtl = useLocale() === "ar";
  const n = slides.length;
  const reducedMotion = usePrefersReducedMotion();

  const [{ active, prev }, go] = useReducer(
    (state: { active: number; prev: number }, target: number | "next" | "prev") => {
      const raw = target === "next" ? state.active + 1 : target === "prev" ? state.active - 1 : target;
      return { prev: state.active, active: ((raw % n) + n) % n };
    },
    { active: 0, prev: 0 },
  );
  /** null = follow the default (auto-play unless the visitor prefers reduced motion). */
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const playing = userPlaying ?? !reducedMotion;
  const running = n > 1 && playing && !engaged && open === null;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => go("next"), DWELL_MS);
    return () => window.clearInterval(timer);
  }, [running, active]);

  if (n === 0) return null;
  const direction = rtl ? -1 : 1;
  const control =
    "grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-white text-navy-900 transition-colors hover:border-navy-300 hover:bg-navy-50";

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={t("Portfolio showcase", "معرض الأعمال")}
      onMouseEnter={() => setEngaged(true)}
      onMouseLeave={() => setEngaged(false)}
      onFocusCapture={() => setEngaged(true)}
      onBlurCapture={() => setEngaged(false)}
    >
      <div className="relative h-[25rem] overflow-hidden sm:h-[31rem]">
        {slides.map((slide, i) => {
          const offset = offsetOf(i, active, n);
          const wrapped = Math.abs(offset - offsetOf(i, prev, n)) > 1;
          const visible = Math.abs(offset) <= 1;
          const isActive = offset === 0;
          return (
            <button
              key={slide.id}
              type="button"
              aria-hidden={!visible}
              tabIndex={visible ? 0 : -1}
              aria-label={`${t("Open", "فتح")}: ${slide.title}`}
              onClick={() => {
                go(i);
                setOpen(i);
              }}
              className="group absolute top-0 left-1/2 h-full w-[78%] cursor-pointer overflow-hidden rounded-3xl bg-navy-900 text-start shadow-lift sm:w-[56%] lg:w-[44%]"
              style={{
                transform: `translateX(calc(-50% + ${offset * direction * 104}%)) scale(${isActive ? 1 : 0.9})`,
                opacity: isActive ? 1 : visible ? 0.45 : 0,
                zIndex: isActive ? 2 : 1,
                pointerEvents: visible ? "auto" : "none",
                transition: wrapped ? "none" : "transform 650ms cubic-bezier(0.22, 0.8, 0.2, 1), opacity 650ms ease",
              }}
            >
              <SlideCover slide={slide} />
              <span className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/10 to-transparent" />
              <span className="absolute start-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-navy-900">
                {bi(t, biLabel("portfolioCategory", slide.category))}
              </span>
              {slide.kind !== "image" && (
                <span className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-amber-400 text-navy-950 shadow-lift transition-transform duration-200 group-hover:scale-110">
                  <Play className="size-6 translate-x-0.5 fill-current" aria-hidden="true" />
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                <span className="block text-lg leading-snug font-semibold text-white sm:text-xl">{slide.title}</span>
                {slide.description && <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-white/80">{slide.description}</span>}
              </span>
              {isActive && n > 1 && (
                <span className="absolute inset-x-0 bottom-0 h-1 bg-white/15">
                  <span
                    key={`${active}-${running}`}
                    className="block h-full bg-amber-400"
                    style={{
                      transformOrigin: rtl ? "right" : "left",
                      animation: running ? `lq-progress ${DWELL_MS}ms linear both` : "none",
                      transform: running ? undefined : "scaleX(0)",
                    }}
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {n > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button type="button" onClick={() => go("prev")} className={control} aria-label={t("Previous item", "العمل السابق")}>
            <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
          </button>
          <p dir="ltr" className="min-w-16 text-center text-sm font-medium text-navy-800 tabular-nums" aria-live="off">
            {String(active + 1).padStart(2, "0")} <span className="text-navy-300">/</span> {String(n).padStart(2, "0")}
          </p>
          <button type="button" onClick={() => go("next")} className={control} aria-label={t("Next item", "العمل التالي")}>
            <ChevronRight className="size-5 rtl:rotate-180" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setUserPlaying(!playing)}
            className={control}
            aria-label={playing ? t("Pause auto-play", "إيقاف التشغيل التلقائي") : t("Start auto-play", "بدء التشغيل التلقائي")}
          >
            {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
          </button>
        </div>
      )}

      {open !== null && (
        <Lightbox
          slides={slides}
          index={open}
          onClose={() => setOpen(null)}
          onStep={(delta) => {
            const next = (((open + delta) % n) + n) % n;
            setOpen(next);
            go(next);
          }}
        />
      )}
    </div>
  );
}
