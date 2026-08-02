import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // إخراج مستقلّ (standalone) لصورة Docker خفيفة تعمل بـ `node server.js`.
  // على Vercel لا يلزم (المنصة تتولّى التجميع بنفسها) وقد يربك خطوة البناء.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
