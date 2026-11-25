"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contracts, packages, services } from "@/db/schema";
import { adminAction, flag, FormError, int, money, oneOf, required, str, uuid } from "@/server/form";
import { BILLING_CYCLES, type ActionResult } from "@/types";

export async function saveService(fd: FormData): Promise<ActionResult> {
  return adminAction("services", async (_admin, t) => {
    const titleMsg = t("The service needs a title in both languages.", "يجب إدخال عنوان الخدمة باللغتين.");
    await db
      .update(services)
      .set({
        titleEn: required(fd, "titleEn", titleMsg, 160),
        titleAr: required(fd, "titleAr", titleMsg, 160),
        summaryEn: str(fd, "summaryEn", 400),
        summaryAr: str(fd, "summaryAr", 400),
        descriptionEn: str(fd, "descriptionEn", 2000),
        descriptionAr: str(fd, "descriptionAr", 2000),
        deliverablesEn: str(fd, "deliverablesEn", 2000),
        deliverablesAr: str(fd, "deliverablesAr", 2000),
        isActive: flag(fd, "isActive"),
        updatedAt: new Date(),
      })
      .where(eq(services.id, uuid(fd, "id")));
    return { ok: true, message: t("Service saved.", "تم حفظ الخدمة.") };
  });
}

/** Creates or updates a priced package / retainer for a service. */
export async function savePackage(fd: FormData): Promise<ActionResult> {
  return adminAction("services", async (_admin, t) => {
    const values = {
      nameEn: required(fd, "nameEn", t("Give the package an English name.", "أدخل اسم الباقة بالإنجليزية."), 120),
      nameAr: str(fd, "nameAr", 120),
      descriptionEn: str(fd, "descriptionEn", 400),
      descriptionAr: str(fd, "descriptionAr", 400),
      featuresEn: str(fd, "featuresEn", 2000),
      featuresAr: str(fd, "featuresAr", 2000),
      priceBhd: money(fd, "priceBhd", t("Enter the price in BHD, e.g. 250 or 249.500.", "أدخل السعر بالدينار البحريني، مثل 250 أو 249.500.")),
      billingCycle: oneOf(fd, "billingCycle", BILLING_CYCLES, "monthly"),
      isActive: flag(fd, "isActive"),
      isFeatured: flag(fd, "isFeatured"),
      sortOrder: int(fd, "sortOrder", 0, 9999, 0),
    };
    if (str(fd, "id", 40)) {
      await db.update(packages).set(values).where(eq(packages.id, uuid(fd, "id")));
    } else {
      const [service] = await db.select({ id: services.id }).from(services).where(eq(services.id, uuid(fd, "serviceId"))).limit(1);
      if (!service) throw new FormError(t("This service no longer exists.", "هذه الخدمة لم تعد موجودة."));
      await db.insert(packages).values({ ...values, serviceId: service.id });
    }
    return { ok: true, message: t("Package saved.", "تم حفظ الباقة.") };
  });
}

export async function deletePackage(fd: FormData): Promise<ActionResult> {
  return adminAction("services", async (_admin, t) => {
    // Existing orders keep their own name / price snapshot, so removing a package is safe.
    await db.delete(packages).where(eq(packages.id, uuid(fd, "id")));
    return { ok: true, message: t("Package deleted.", "تم حذف الباقة.") };
  });
}

/** Updates an SLA. The version increases whenever the wording changes. */
export async function saveContract(fd: FormData): Promise<ActionResult> {
  return adminAction("contracts", async (admin, t) => {
    const [current] = await db.select().from(contracts).where(eq(contracts.id, uuid(fd, "id"))).limit(1);
    if (!current) throw new FormError(t("This agreement no longer exists.", "هذه الاتفاقية لم تعد موجودة."));
    const bodyMsg = t("The agreement text is required in both languages.", "نص الاتفاقية مطلوب باللغتين.");
    const next = {
      titleEn: required(fd, "titleEn", bodyMsg, 200),
      titleAr: required(fd, "titleAr", bodyMsg, 200),
      bodyEn: required(fd, "bodyEn", bodyMsg, 30000),
      bodyAr: required(fd, "bodyAr", bodyMsg, 30000),
    };
    const changed = next.bodyEn !== current.bodyEn || next.bodyAr !== current.bodyAr;
    await db
      .update(contracts)
      .set({ ...next, version: changed ? current.version + 1 : current.version, updatedBy: admin.name, updatedAt: new Date() })
      .where(eq(contracts.id, current.id));
    return {
      ok: true,
      message: changed
        ? t(`Agreement saved as version ${current.version + 1}. New requests will accept this version.`, `تم حفظ الاتفاقية كإصدار ${current.version + 1}. ستوافق الطلبات الجديدة على هذا الإصدار.`)
        : t("Agreement saved.", "تم حفظ الاتفاقية."),
    };
  });
}
