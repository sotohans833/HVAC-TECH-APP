import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The design system ships TypeScript source rather than a build step, so Next
  // compiles it alongside the app. One less pipeline to keep in sync.
  transpilePackages: ['@manifold/ui'],
};

export default withNextIntl(nextConfig);
