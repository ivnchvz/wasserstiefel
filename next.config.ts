import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * The homepage halftones gallery uploads by reading them from public/ on
   * disk. On Vercel, public/ is served from the CDN and isn't part of the
   * server function, so the build could draw them but the first cache
   * refresh afterwards would find nothing and fall back to a blank tile.
   * Tracing them in keeps them next to the function that reads them.
   */
  outputFileTracingIncludes: {
    "/": ["./public/gallery/**/*"],
  },
};

export default nextConfig;
