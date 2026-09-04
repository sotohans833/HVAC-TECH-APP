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
};

export default withNextIntl(nextConfig);
