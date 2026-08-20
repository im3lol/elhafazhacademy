import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/brand/logo";
import { getBranding } from "@/lib/branding";

// أول ما يراه أي زائر. بلا تمرير الهوية كان `Logo` يقع على قيمه الافتراضية
// فيظهر شعار «الحفظة» واسمها في نسخة كل جهة.
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { branding } = await getBranding();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/">
          <Logo size="sm" logo={branding.logo} name={branding.name} tagline={branding.tagline} />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-start justify-center px-6 py-8 sm:items-center">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
