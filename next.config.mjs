/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1:3000", "localhost:3000"],
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3", "pdfjs-dist"],
  },
};

export default nextConfig;
