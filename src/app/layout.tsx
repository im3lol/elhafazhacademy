import type { Metadata } from "next";
import { thmanyahSans, thmanyahDisplay } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "أكاديمية الحفظة — لتحفيظ وتعليم القرآن الكريم",
  description:
    "منصة أكاديمية الحفظة لتحفيظ القرآن وتعليم التجويد: حصص مباشرة، متابعة الحفظ والمراجعة، وتقارير تقدم.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${thmanyahSans.variable} ${thmanyahDisplay.variable} h-full antialiased`}
    >
      <head>
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
