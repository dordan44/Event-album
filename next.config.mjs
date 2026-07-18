/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Media is served straight from R2 (or presigned URLs) — skip Next image optimization.
    unoptimized: true,
  },
};

export default nextConfig;
