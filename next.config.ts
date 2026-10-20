import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: false,
  partialPrefetching: false,
  // PDF kapak görseli üretimi Node API'leri ve yerel binary kullanır; bundle edilmesin.
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
