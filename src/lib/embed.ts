/**
 * Turns an external media link (Instagram Reel, YouTube, Vimeo, TikTok, or a direct
 * image / video file) into something the platform can play in place — without sending
 * the visitor to another site.
 */

export type EmbedProvider = "youtube" | "instagram" | "vimeo" | "tiktok" | "image" | "video";

export interface ExternalMedia {
  provider: EmbedProvider;
  kind: "embed" | "image" | "video";
  /** iframe URL for embeds, file URL for direct media. */
  src: string;
  thumbnail: string | null;
  portrait: boolean;
}

export const SUPPORTED_SOURCES = "Instagram (reel / post), YouTube, Vimeo, TikTok, or a direct https link to an image or video file";

export function parseExternalUrl(raw: string | null | undefined): ExternalMedia | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  // http would be blocked as mixed content on a production (https) site.
  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  const path = url.pathname;

  if (host === "youtu.be" || host === "youtube.com" || host === "youtube-nocookie.com" || host.endsWith(".youtube.com")) {
    let id: string | null = null;
    let portrait = false;
    if (host === "youtu.be") id = path.slice(1).split("/")[0];
    else if (path === "/watch") id = url.searchParams.get("v");
    else {
      const m = path.match(/^\/(shorts|embed|live)\/([\w-]+)/);
      if (m) {
        id = m[2];
        portrait = m[1] === "shorts";
      }
    }
    if (!id || !/^[\w-]{6,20}$/.test(id)) return null;
    return {
      provider: "youtube",
      kind: "embed",
      src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      portrait,
    };
  }

  if (host === "instagram.com" || host === "instagr.am") {
    const m = path.match(/^\/(?:[\w.]+\/)?(reels?|p|tv)\/([\w-]+)/);
    if (!m) return null;
    const type = m[1] === "p" ? "p" : m[1] === "tv" ? "tv" : "reel";
    return {
      provider: "instagram",
      kind: "embed",
      src: `https://www.instagram.com/${type}/${m[2]}/embed/`,
      thumbnail: null,
      portrait: true,
    };
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = path.match(/^\/(?:video\/)?(\d+)/);
    if (!m) return null;
    return {
      provider: "vimeo",
      kind: "embed",
      src: `https://player.vimeo.com/video/${m[1]}?autoplay=1&playsinline=1`,
      thumbnail: null,
      portrait: false,
    };
  }

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const m = path.match(/\/video\/(\d+)/);
    if (!m) return null;
    return {
      provider: "tiktok",
      kind: "embed",
      src: `https://www.tiktok.com/embed/v2/${m[1]}`,
      thumbnail: null,
      portrait: true,
    };
  }

  if (/\.(jpe?g|png|webp|gif|avif)$/i.test(path)) {
    return { provider: "image", kind: "image", src: url.toString(), thumbnail: url.toString(), portrait: false };
  }
  if (/\.(mp4|webm|mov|m4v)$/i.test(path)) {
    return { provider: "video", kind: "video", src: url.toString(), thumbnail: null, portrait: false };
  }

  return null;
}

export const PROVIDER_NAMES: Record<EmbedProvider, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  vimeo: "Vimeo",
  tiktok: "TikTok",
  image: "Image link",
  video: "Video link",
};
