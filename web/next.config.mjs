/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /v1/tryon chờ AI tạo ảnh 30–60s (có khi xếp hàng) → nới thời gian chờ của proxy
  experimental: { proxyTimeout: 400_000 },
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
