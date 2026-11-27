"use client";

import { useEffect } from "react";
import { trackMetaEvent } from "@/components/MetaPixel";

export function ServiceViewTracker({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  useEffect(() => {
    trackMetaEvent("ViewContent", {
      content_name: title,
      content_category: "service",
      content_ids: [slug],
      content_type: "product_group",
    });
  }, [slug, title]);

  return null;
}