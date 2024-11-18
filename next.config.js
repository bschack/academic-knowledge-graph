/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    ACCOUNT_ID: process.env.ACCOUNT_ID,
    PRIVATE_KEY: process.env.PRIVATE_KEY,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    },
  },
}

module.exports = nextConfig 