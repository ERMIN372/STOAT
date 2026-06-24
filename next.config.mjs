/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Real product photography is uploaded to Sanity and served from its CDN.
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
    // Local fallback/placeholder art is SVG, which next/image blocks by
    // default. We only allow it for our own trusted assets; Sanity photos
    // (JPG/PNG/WebP) go through the optimizer normally.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
