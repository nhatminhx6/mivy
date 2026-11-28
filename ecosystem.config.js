// pm2 config — chạy Mivy nền 24/7 trên Mac Mini (bản IN, không gen ảnh AI).
// Dùng: pm2 start ecosystem.config.js  →  pm2 save  →  (chạy lệnh pm2 startup in ra)
// Backend chỉ nghe 127.0.0.1 (không hở ra ngoài); web :3009 proxy /v1/* sang backend; Cloudflare chỉ trỏ web.
const ROOT = __dirname; // thư mục chứa file này = gốc repo (portable, chạy máy nào cũng đúng path)

module.exports = {
  apps: [
    {
      name: 'mivy-api',
      cwd: `${ROOT}/back-end`,
      script: './.venv/bin/python',
      args: '-m uvicorn app.main:app --host 127.0.0.1 --port 8019',
      interpreter: 'none',
      autorestart: true,
      max_restarts: 15,
      env: {
        APP_ENV: 'production',
        // Cloudflare Tunnel luôn là HTTPS tới khách → cookie login cần Secure.
        COOKIE_SECURE: 'true',
        // Sau khi có URL cố định (mua domain) thì điền để tin Telegram đính link admin:
        // SITE_URL: 'https://mivy.vn',
      },
    },
    {
      name: 'mivy-web',
      cwd: `${ROOT}/web`,
      script: 'npm',
      args: 'run start',
      autorestart: true,
      max_restarts: 15,
      env: { NODE_ENV: 'production' },
    },
    {
      // Giữ Mac Mini không ngủ (không cần sudo). Mac Mini luôn cắm điện nên -s là đủ.
      name: 'mivy-awake',
      script: 'caffeinate',
      args: '-s',
      interpreter: 'none',
      autorestart: true,
    },
  ],
};
