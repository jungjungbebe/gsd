/** @type {import("next").NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: "/service", destination: "/tone-check", permanent: false }];
  },
};

export default nextConfig;
