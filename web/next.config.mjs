/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /v1/tryon chờ AI tạo ảnh 30–60s (có khi xếp hàng) → nới thời gian chờ của proxy
  experimental: { proxyTimeout: 400_000 },
  // transformers.js (SAM chọn vật thể) chỉ chạy trên trình duyệt — bỏ các bản Node khỏi bundle
  webpack: (config, { isServer }) => {
    config.resolve.alias = { ...config.resolve.alias, sharp$: false, 'onnxruntime-node$': false };
    // onnxruntime-web có export condition "node" trỏ tới dist/ort.node.min.mjs; bản build server
    // chọn đúng file này rồi webpack parse lỗi ("import/export outside module"). transformers chỉ
    // chạy ở browser nên server không cần onnxruntime-web → stub rỗng ở server (client giữ nguyên).
    if (isServer) {
      config.resolve.alias['onnxruntime-web'] = false;
    }
    // onnxruntime-web (do @imgly/background-removal kéo vào, tách nền ở client) ship file .mjs
    // trong node_modules; webpack mặc định coi là non-module → "import/export outside module".
    // Ép coi .mjs trong node_modules là ESM để parse đúng.
    config.module.rules.push({
      test: /\.m?js$/,
      include: /node_modules/,
      type: 'javascript/auto',
      resolve: { fullySpecified: false },
    });
    return config;
  },
  async rewrites() {
    const destination = process.env.NODE_ENV === 'development'
      ? 'http://127.0.0.1:8019/v1/:path*'
      : process.env.API_URL || 'http://127.0.0.1:8000/v1/:path*';
    return [
      {
        source: '/v1/:path*',
        destination,
      },
    ];
  },
};

export default nextConfig;
