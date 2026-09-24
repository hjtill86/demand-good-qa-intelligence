/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true,
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "demandgoodqa.com" }],
        destination: "https://www.demandgoodqa.com/:path*",
        permanent: false,
      },
    ];
  },
};
export default nextConfig;
