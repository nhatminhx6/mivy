# Deploy Mivy lên Mac Mini (bản IN môi giới, không gen ảnh AI)

> Chạy trên **Mac Mini** (máy server 24/7), KHÔNG phải MacBook code.
> Luồng: khách → **Cloudflare Tunnel (https)** → web Next.js `:3009` → rewrite `/v1/*` → FastAPI `:8019` → SQLite.
> Backend chỉ nghe `127.0.0.1` (không hở ra ngoài). Cloudflare chỉ trỏ tới web `:3009`.

---

## 0. Đưa code sang Mac Mini
`git clone` repo (hoặc copy cả thư mục `mivy/`) vào Mac Mini. Các lệnh dưới chạy trong thư mục gốc repo.

## 1. Cài công cụ (1 lần)
```bash
brew install node python@3.12 cloudflared
npm install -g pm2
```

## 2. Dựng backend + frontend
```bash
cd back-end && python3.12 -m venv .venv && .venv/bin/pip install -e . && cd ..
cd web && npm ci && cd ..
```

## 3. Điền ENV thật (bắt buộc — thiếu là khách không chuyển tiền được)

**`web/.env.local`** — VietQR nhúng vào trang lúc build, PHẢI điền TRƯỚC khi build:
```
# Reverse proxy: production next start đọc biến này
API_URL=http://127.0.0.1:8019/v1/:path*
# Ngân hàng nhận cọc + nạp ví (VietQR)
NEXT_PUBLIC_BANK_BIN=        # mã BIN hoặc mã ngắn, vd 970436 / vcb
NEXT_PUBLIC_BANK_ACCOUNT=    # số tài khoản
NEXT_PUBLIC_BANK_NAME=       # vd Vietcombank
NEXT_PUBLIC_BANK_OWNER=      # tên chủ TK (IN HOA không dấu)
NEXT_PUBLIC_MIVY_ZALO=0976999864
```

**`back-end/.env`** (copy từ `.env.example` nếu chưa có) — chỉ cần phần tài khoản + báo đơn:
```
ADMIN_EMAILS=minh.nn1@pharmacity.vn   # email để mở /studio/admin
TELEGRAM_BOT_TOKEN=                    # (nên có) báo Telegram khi có đơn mới
TELEGRAM_CHAT_ID=
SITE_URL=                             # điền URL sau khi có domain, để tin báo có link admin
```
> `APP_ENV=production` và `COOKIE_SECURE=true` đã được set sẵn trong `ecosystem.config.js` (pm2), khỏi sửa trong `.env`.

## 4. Build web
```bash
cd web && npm run build && cd ..
```

## 5. Chạy nền bằng pm2 (tự restart khi crash)
```bash
pm2 start ecosystem.config.js   # chạy mivy-api (:8019) + mivy-web (:3009) + mivy-awake (chống ngủ)
pm2 save
pm2 startup                     # IN ra 1 lệnh `sudo ...` → copy chạy để tự bật lại khi reboot
```
Kiểm tra: `pm2 list`, `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3009` → `200`.

## 6. Hở ra Internet bằng Cloudflare Tunnel

**Giai đoạn test (chưa có domain):**
```bash
cloudflared tunnel --url http://localhost:3009
```
→ in ra URL `https://xxx.trycloudflare.com` — mở bằng 4G điện thoại để test.
⚠️ URL này **đổi mỗi lần chạy lại**. Chỉ dùng để test.

**Khi đã mua domain (URL cố định + tự chạy nền):**
```bash
cloudflared tunnel login                       # chọn domain trên Cloudflare
cloudflared tunnel create mivy
cloudflared tunnel route dns mivy mivy.vn
# tạo ~/.cloudflared/config.yml trỏ hostname mivy.vn -> http://localhost:3009
cloudflared tunnel run mivy                    # (hoặc: sudo cloudflared service install để chạy nền)
```
Rồi điền `SITE_URL=https://mivy.vn` vào `back-end/.env` và `pm2 restart mivy-api`.

## 7. Cấu hình Mac Mini chạy "trâu bò" (System Settings)
- **Energy**: bật **"Start up automatically after a power failure"** + **"Prevent automatic sleeping..."**.
- **Users & Groups → Login Options**: bật **Automatic login** (để sau reboot pm2 resurrect chạy lại).
- Chống ngủ ở mức process đã có sẵn qua `mivy-awake` (caffeinate) trong pm2.

## 8. Backup dữ liệu (đã có sẵn script)
Cài cron chạy 2h sáng mỗi ngày (gói `mivy.db` + đơn in + uploads, giữ 14 bản):
```bash
( crontab -l 2>/dev/null | grep -v "mivy/scripts/backup-data.sh"; \
  echo "0 2 * * * /bin/sh $(pwd)/scripts/backup-data.sh >> \$HOME/mivy-backups/backup.log 2>&1" ) | crontab -
```

## 9. Nghiệm thu (chân 2 — chạy thật 1 đơn)
Mở URL Cloudflare bằng **4G điện thoại** (không dùng Wi-Fi nhà) → tạo thử 1 đơn in → phải thấy **QR cọc** + nhận **Telegram báo đơn** (nếu đã set). OK là sẵn sàng chạy đơn thật với xưởng.

---

## Gotcha đã xử lý sẵn trong code
- `web/src/lib/api.ts`: production gọi **same-origin** `/v1/*` (không gọi thẳng `:8000` — cổng đó không hở qua tunnel).
- `next.config` rewrite production đọc `API_URL` → đã trỏ `:8019` (khớp backend, không còn fallback `:8000`).
- `ecosystem.config.js`: backend chỉ `127.0.0.1`, set `APP_ENV=production` + `COOKIE_SECURE=true`.
