/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This project is a backend/API layer. Route handlers must never be statically
  // optimised, since every one of them reads request-scoped auth state.
  experimental: {},
};

export default nextConfig;
