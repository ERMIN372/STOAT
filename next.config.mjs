/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Placeholder product art is shipped as local SVGs in /public/products.
    // SVGs are blocked by next/image by default; we trust our own assets here.
    // When real product photography (JPG/PNG/WebP) replaces them, this flag
    // can be removed and `remotePatterns` added for a CDN / image host.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
