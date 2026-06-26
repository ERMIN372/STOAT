/** @type {import('next').NextConfig} */

// Product photos are served from an S3-compatible object store in the RF
// (Yandex Object Storage / VK Cloud / Selectel) or a CDN in front of it. Allow
// whichever host(s) are configured so next/image can optimise them.
function imageHosts() {
  const patterns = [];
  for (const raw of [process.env.S3_PUBLIC_URL, process.env.S3_ENDPOINT]) {
    if (!raw) continue;
    try {
      const { hostname } = new URL(raw);
      if (!patterns.some((p) => p.hostname === hostname)) {
        patterns.push({ protocol: "https", hostname });
      }
    } catch {
      // ignore malformed URLs
    }
  }
  return patterns;
}

const nextConfig = {
  images: {
    remotePatterns: imageHosts(),
    // Local fallback/placeholder art is SVG, which next/image blocks by
    // default. We only allow it for our own trusted assets; real photos
    // (JPG/PNG/WebP) go through the optimizer normally.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
