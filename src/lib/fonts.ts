import localFont from "next/font/local";

/**
 * خط ثمانية Thmanyah Typeface
 * Sans: النصوص العامة والواجهات (الخط الأساسي)
 * Serif Display: العناوين الكبيرة والهيرو
 */

export const thmanyahSans = localFont({
  variable: "--font-sans",
  display: "swap",
  src: [
    { path: "../fonts/thmanyahsans-Light.woff2", weight: "300", style: "normal" },
    { path: "../fonts/thmanyahsans-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/thmanyahsans-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/thmanyahsans-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/thmanyahsans-Black.woff2", weight: "900", style: "normal" },
  ],
});

export const thmanyahDisplay = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    { path: "../fonts/thmanyahserifdisplay-Light.woff2", weight: "300", style: "normal" },
    { path: "../fonts/thmanyahserifdisplay-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/thmanyahserifdisplay-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/thmanyahserifdisplay-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/thmanyahserifdisplay-Black.woff2", weight: "900", style: "normal" },
  ],
});
