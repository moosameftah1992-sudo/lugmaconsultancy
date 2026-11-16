import type { Metadata } from "next";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

/** The management area is never indexed and is not linked from any public or client page. */
export const metadata: Metadata = {
  title: "Luqma Management",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return children;
}
