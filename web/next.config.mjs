/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // transformers.js (SAM chọn vật thể) chỉ chạy trên trình duyệt — bỏ các bản Node khỏi bundle
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, sharp$: false, 'onnxruntime-node$': false };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: process.env.API_URL || 'http://127.0.0.1:8000/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
