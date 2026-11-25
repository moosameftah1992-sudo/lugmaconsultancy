/** Only allow post-login redirects back into the client portal (prevents open redirects). */
export function safeNext(next: string | undefined): string {
  if (next && /^\/portal(\/[\w\-./?=&%]*)?$/.test(next) && !next.includes("//") && !next.startsWith("/portal/login") && !next.startsWith("/portal/register")) {
    return next;
  }
  return "/portal";
}
