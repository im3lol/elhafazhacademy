import type { Metadata } from "next";
import { thmanyahSans, thmanyahDisplay } from "@/lib/fonts";
import { getBranding, brandCssVars } from "@/lib/branding";
import "./globals.css";

/** العنوان والوصف من هوية المنصة المحفوظة (تتغيّر لكل جهة بلا لمس الكود). */
export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await getBranding();
  return {
    title: `${branding.fullName} — ${branding.tagline}`,
    description: branding.description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { branding } = await getBranding();

  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${thmanyahSans.variable} ${thmanyahDisplay.variable} h-full antialiased`}
    >
      <head>
        {/* ألوان الهوية تُحقن هنا فتسبق قيم globals.css الافتراضية */}
        <style dangerouslySetInnerHTML={{ __html: brandCssVars(branding) }} />
        {/* الافتراضي فاتح؛ لا يصير داكناً إلا إن اختاره المستخدم صراحةً (نطبّقه قبل أول رسم لمنع الوميض) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.toggle('dark',localStorage.getItem('theme')==='dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-background text-foreground min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
