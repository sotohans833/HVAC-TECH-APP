import path from 'node:path';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The design system ships TypeScript source rather than a build step, so Next
  // compiles it alongside the app. One less pipeline to keep in sync.
  transpilePackages: ['@manifold/ui'],
  // Pin the workspace root. Without this, Next walks up looking for a lockfile
  // and can latch onto an unrelated one outside the repo (a stray
  // package-lock.json in the home directory), which it warns about on every
  // start and which throws off file tracing in the build.
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  // Lets a phone on the same Wi-Fi load the dev server by the PC's LAN address
  // (http://192.168.x.x:3000) to try the camera flow. Development only.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*', '*.local'],
};

export default withNextIntl(nextConfig);
