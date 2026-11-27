import type { MetadataRoute } from "next";
import { listServices } from "@/lib/data";
import { getBaseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getBaseUrl();
  const services = await listServices();
  const now = new Date();

  const serviceRoutes: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${baseUrl}/services/${service.slug}`,
    lastModified: service.updatedAt ?? now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...serviceRoutes,
  ];
}