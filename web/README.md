# Mivy Studio — Web Frontend (Next.js 14 App Router)

Ứng dụng Frontend độc lập cho **Mivy Studio**, được viết lại toàn bộ bằng **Next.js (App Router, TypeScript, Tailwind CSS)**, tối ưu chuẩn SEO 100% cho thị trường Việt Nam.

---

## 1. Cấu Trúc Dự Án

```text
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout: Metadata SEO, Preloaded Google Fonts, JSON-LD Schema
│   │   ├── page.tsx           # SEO Landing Page (SSR) giới thiệu tính năng, bảng giá 0đ
│   │   ├── sitemap.ts         # Tự động sinh sitemap.xml
│   │   ├── robots.ts          # Tự động sinh robots.txt
│   │   ├── globals.css        # Tailwind directives & Dark Studio styling
│   │   ├── studio/
│   │   │   ├── layout.tsx     # Studio Shell layout (Sidebar, Header, Breadcrumbs)
│   │   │   ├── page.tsx       # Studio Dashboard tổng quan
│   │   │   ├── marketing/     # Bộ công cụ Tạo Quảng Cáo & Poster đa ngành (Canvas Engine)
│   │   │   │   └── page.tsx
│   │   │   ├── image/         # Studio Tạo Ảnh nghệ thuật / sản phẩm
│   │   │   │   └── page.tsx
│   │   │   └── drafts/        # Quản lý bản nháp chiến dịch
│   │   │       └── page.tsx
│   │   └── lab/               # Image API Lab cho lập trình viên
│   │       └── page.tsx
│   ├── lib/
│   │   ├── design-engine.ts   # Canvas Poster Engine (Recruitment, Education, Service, General)
│   │   ├── marketing-zip.ts   # Engine nén ZIP 0-dependency
│   │   └── api.ts             # Typed API client kết nối FastAPI
│   └── types/
│       └── index.ts           # Type definitions
├── public/                    # Assets tĩnh, font, logo
├── next.config.mjs            # Cấu hình Next.js + API rewrites proxy về port 8000
├── tailwind.config.ts         # Design tokens & bảng màu Mivy
├── tsconfig.json              # Cấu hình TypeScript ES2020
└── package.json
```

---

## 2. Điểm Nhấn Tối Ưu SEO (SEO Best Practices)

- **Server-Side Rendering (SSR) & SSG:** Trang chủ `/` render trực tiếp từ server, chứa đầy đủ thẻ Semantic HTML (`<header>`, `<main>`, `<section>`, `<article>`, `<footer>`).
- **Metadata API:** Đầy đủ `title`, `description`, `keywords`, canonical URL, favicon và Open Graph metadata (`og:title`, `og:image`, `og:locale=vi_VN`).
- **Structured Data (JSON-LD):** Khai báo schema `WebSite` và `SoftwareApplication` giúp Google hiển thị Rich Snippets.
- **Tự động sinh Search Bot Directives:**
  - `sitemap.xml`: `/sitemap.xml`
  - `robots.txt`: `/robots.txt`
- **Tối ưu Core Web Vitals:** Tải trước bộ font `Be Vietnam Pro`, `Plus Jakarta Sans`, `Caveat` giúp điểm Cumulative Layout Shift (CLS) = 0.

---

## 3. Cách Khởi Chạy

### Chế độ Dev:
```bash
cd web
npm run dev
```
Truy cập: `http://localhost:3009`

### Build Production:
```bash
cd web
npm run build
npm run start
```

### Kết nối Backend:
Mặc định `next.config.mjs` tự động rewrite các request `/v1/:path*` về backend tại `http://127.0.0.1:8000/v1/:path*`.
Nếu chạy trên môi trường khác, cấu hình biến môi trường:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```
