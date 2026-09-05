/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicit Turbopack section avoids Next 16 build failure when webpack config is also present.
  turbopack: {},
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      bufferutil: 'commonjs bufferutil',
    });
    return config;
  },
};

module.exports = nextConfig;
