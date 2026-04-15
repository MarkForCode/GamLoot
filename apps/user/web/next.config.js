const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

module.exports = withNextIntl({
  reactStrictMode: true,
  transpilePackages: ['@repo/ui', '@repo/api-client'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  },
});