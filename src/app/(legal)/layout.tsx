import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/brand/logo";
import { getBranding } from "@/lib/branding";

/**
 * تخطيط الصفحات القانونية (الخصوصية والشروط) — عام بلا تسجيل دخول.
 * روابطها مطلوبة علناً لتوثيق تطبيق Google OAuth، ولأي جهة تشغّل نسختها.
 */
export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const { branding } = await getBranding();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-5">
          <Link href="/">
            <Logo size="sm" logo={branding.logo} name={branding.name} tagline={branding.tagline} />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-sm text-muted">
          <Link href="/" className="hover:text-brand hover:underline">
            العودة للرئيسية
          </Link>
          <span className="flex gap-4">
            <Link href="/privacy" className="hover:text-brand hover:underline">
              سياسة الخصوصية
            </Link>
            <Link href="/terms" className="hover:text-brand hover:underline">
              شروط الاستخدام
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
