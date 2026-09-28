/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: { serverActions: { bodySizeLimit: '5mb' } }, // long transcripts + CSV imports
};
export default nextConfig;
