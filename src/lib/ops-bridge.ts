export interface OpsIntakePayload {
  businessName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  pillarSlug?: string;
  pillarNum?: number;
  tierName?: string;
  notes?: string;
}

/**
 * Forwards consultation inquiries or client portal service requests to
 * Luqma Ops Hub (/api/intake) when LUQMA_OPS_HUB_URL is configured.
 * Non-blocking: never fails user submission if Ops Hub is offline or unconfigured.
 */
export async function pushToOpsHub(payload: OpsIntakePayload): Promise<void> {
  const baseUrl = (process.env.LUQMA_OPS_HUB_URL || "").trim().replace(/\/+$/, "");
  if (!baseUrl) return;

  const secret = (process.env.LUQMA_INTAKE_SECRET || "").trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) {
    headers["x-luqma-intake-key"] = secret;
  }

  try {
    await fetch(`${baseUrl}/api/intake`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("Ops Hub push skipped/failed:", err);
  }
}
