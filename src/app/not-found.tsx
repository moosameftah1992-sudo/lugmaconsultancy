import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { getT } from "@/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="grid min-h-screen place-items-center px-6 py-16">
      <div className="max-w-md text-center">
        <Link href="/" aria-label="Luqma" className="inline-block">
          <Logo size="lg" />
        </Link>
        <h1 className="mt-10 text-3xl font-semibold text-navy-900">{t("This page is not on the menu", "هذه الصفحة ليست في القائمة")}</h1>
        <p className="mt-3 text-muted">
          {t("The address may be mistyped, or the page may have moved.", "قد يكون العنوان مكتوبًا بشكل خاطئ، أو أن الصفحة نُقلت.")}
        </p>
        <Link href="/" className="btn btn-primary mt-8">
          {t("Back to the home page", "العودة إلى الصفحة الرئيسية")}
        </Link>
      </div>
    </main>
  );
}
