/** @type {import("next").NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: "/service", destination: "/tone-check", permanent: false }, { source: "/dashboard", destination: "/tone-check", permanent: false }];
  },
};

export default nextConfig;
