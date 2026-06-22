import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root to this app (avoids "multiple lockfiles" mis-detection).
  turbopack: { root: __dirname },
};

export default nextConfig;
