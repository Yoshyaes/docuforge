/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // Enable for Docker deployment
  async redirects() {
    return [
      {
        source: '/docs',
        destination: 'https://docs.getdeckle.dev',
        permanent: true,
      },
      {
        source: '/docs/:path*',
        destination: 'https://docs.getdeckle.dev/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
