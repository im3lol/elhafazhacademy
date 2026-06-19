import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // إخراج مستقلّ (standalone) لصورة Docker خفيفة تعمل بـ `node server.js`
  output: "standalone",
};

export default nextConfig;
