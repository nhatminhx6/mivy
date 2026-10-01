# Tài Liệu Thiết Kế Tham Chiếu (Design References)

**Ngày lập:** 25/09/2026  
**Mục đích:** Cung cấp chuẩn mực tham chiếu thiết kế thương mại (commercial design benchmarks) cho 3 case pilot theo mục 5 `PLAN_FOR_GEMINI.md`.

---

## 1. Case: `recruitment-mixed` (Lead / Senior Fullstack Developer)

### Tham chiếu 1: Linear.app & Stripe Career Editorial Posters
- **Nguồn phong cách:** Thiết kế công khai của Linear.app / Stripe Engineering Campaigns.
- **Concept:** Dark theme kỹ thuật cao cấp, tương phản mạnh mẽ giữa nền than chì (`#0b0f19`) và điểm nhấn neon/emerald (`#10b981`), phong cách "crafted for engineers".
- **Nhịp bố cục (Layout Rhythm):**
  - Phần trên: Brand tag và Headline vị trí lớn (`LEAD / SENIOR FULLSTACK DEVELOPER`), font Sans-serif dứt khoát kết hợp Monospace cho các từ khóa công nghệ.
  - Phần thân: Danh sách tiêu chí kỹ thuật được phân tầng rõ rệt, mỗi tiêu chí là một hàng độc lập với badge số thứ tự (`01`, `02`...) hoặc tag chuyên môn (`TECH STACK`, `SYSTEM ARCHITECTURE`), padding thoáng đãng.
  - Phần chân: Khối liên hệ/CTA tinh tế, có mũi tên định hướng hành động.
- **Hình chủ đạo & Chi tiết:** Lưới đồ họa tinh vi (subtle technical grid lines), ánh sáng lan tỏa nhẹ (radial glow), tuyệt đối không dùng hình minh họa 3D hoạt hình hoặc stock người cầm laptop giả tạo.

### Tham chiếu 2: Monzo / Spotify Engineering Design Broadside
- **Nguồn phong cách:** Spotify Design & Monzo Tech Hiring Broadside.
- **Concept:** Bố cục dạng tạp chí kỹ thuật đương đại (Technical Editorial Broadside), chú trọng tối đa vào vẻ đẹp typography và khả năng đọc nhanh trên thiết bị di động.
- **Nhịp bố cục:** Cột nội dung trung tâm có lề an toàn rộng (60–80px), typography phân cấp 4 cấp rõ rệt (Kicker -> Headline -> Criteria Items -> Action Footer).
- **Chi tiết học được:** Căn chỉnh số thứ tự và tiêu đề theo cùng một trục tim ngang (`centerY`), chữ dài tự động xuống dòng và co giãn kích thước hài hòa để không bao giờ bị đè chữ.

---

## 2. Case: `product-vi` (Quảng cáo giày thể thao — Bước đi theo cách riêng)

### Tham chiếu 1: Nike Running & Adidas Adizero Dynamic Key Visuals
- **Nguồn phong cách:** Chiến dịch quảng cáo giày thể thao thương mại quốc tế (Nike / Adidas Key Visuals).
- **Concept:** Concept chuyển động bứt phá (motion & momentum), kết hợp ánh sáng studio kịch tính (dramatic rim lighting) làm nổi bật kết cấu đế giày và upper mesh.
- **Nhịp bố cục:**
  - Sản phẩm (đôi giày) là tâm điểm thị giác tuyệt đối, chiếm 60–70% khung hình, đặt ở góc nghiêng 20° tạo cảm giác đang lao về phía trước.
  - Tiêu đề "BƯỚC ĐI THEO CÁCH RIÊNG" đặt ở 1/3 trên hoặc cạnh sản phẩm, font chữ đậm, sắc sảo, truyền cảm hứng hành động.
  - Nút kêu gọi hành động "Xem sản phẩm" / "Khám phá bộ sưu tập" gọn gàng ở góc dưới.
- **Chi tiết cốt lõi:** Tuyệt đối giữ nguyên vẹn 100% hình dáng, màu sắc, logo 3 sọc và chi tiết của đôi giày gốc trong asset (`fixtures/product_shoe.jpg`); nền đồ họa được sinh xung quanh để tôn sản phẩm, không biến dạng vật thể.

### Tham chiếu 2: On Running & Salomon Minimalist Technical Campaign
- **Nguồn phong cách:** On Running Cloudmonster / Salomon Sportstyle Lookbook.
- **Concept:** Tối giản phong cách Bắc Âu / Thụy Sĩ, phông nền gradient chuyển sắc hữu cơ hoặc địa hình trừu tượng (abstract topography contours).
- **Nhịp bố cục:** Không gian thở (negative space) chiếm >40% khung hình giúp sản phẩm nổi bật tinh tế, đẳng cấp thương mại cao.

---

## 3. Case: `course-en` (Light & Story — Photography Workshop)

### Tham chiếu 1: Leica Akademie & Magnum Photos Workshop Posters
- **Nguồn phong cách:** Leica Akademie Global Workshops / Magnum Learn Series.
- **Concept:** Nhiếp ảnh nghệ thuật thực hành đích thực (Authentic Editorial Photography), nhấn mạnh vào "ánh sáng tự nhiên" và "kể chuyện bằng hình ảnh".
- **Nhịp bố cục:**
  - Nửa trên (50% khung hình): Bức ảnh nghệ thuật có chiều sâu ánh sáng (cinematic natural light), không dùng stock ảnh văn phòng/lớp học sáo rỗng.
  - Nửa dưới (50% khung hình): Nền tối sạch sẽ với typography phân cấp thanh lịch (kết hợp tiêu đề Serif hiện đại "LIGHT & STORY" và phụ đề Sans-serif sắc nét).
  - Chi tiết thông số: "4 sessions · Small group practice", "Starts 18 October 2026" đặt trong khung thông tin rõ ràng, trang nhã.

### Tham chiếu 2: Aperture Foundation & MasterClass Workshop Broadside
- **Nguồn phong cách:** Aperture Foundation Exhibition & MasterClass Creative Series.
- **Concept:** Tinh tế, chuẩn mực xuất bản sách ảnh nghệ thuật (Artbook Publishing Aesthetic).
- **Nhịp bố cục:** Đường kẻ phân cách siêu mảnh (1px hairline dividers), nhịp điệu chữ có khoảng thở thoáng, cúp chữ và khoảng cách dòng chuẩn mực tạo cảm giác uy tín học thuật.
