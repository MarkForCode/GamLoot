module.exports = {
  reactStrictMode: true,
  transpilePackages: ['@repo/ui', '@repo/api-client'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  },
};