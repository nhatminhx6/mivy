# Ma Trận Khả Năng & Báo Cáo Khảo Sát Model (Capability Matrix)

**Ngày khảo sát:** 25/09/2026  
**Người thực hiện:** Gemini (Pair-programming cùng anh Minh)  
**Tài liệu quy chiếu:** `back-end/docs/design-benchmark/PLAN_FOR_GEMINI.md`, `GEMINI.md`

---

## 1. Môi Trường Thực Tế & Phần Cứng Hiện Tại

- **Thiết bị:** Apple Mac (Apple M5, 10 CPU cores)
- **Bộ nhớ RAM:** 16 GB Unified Memory (`hw.memsize = 17179869184`)
- **Dung lượng đĩa khả dụng:** ~55 GB (`/System/Volumes/Data`)
- **GPU / VRAM rời:** Không có NVIDIA GPU / CUDA; chỉ có Apple Silicon Metal (MPS).
- **Runtime có sẵn:**
  - Python 3.12 trong `back-end/.venv` (FastAPI backend).
  - Python 3.12 trong `back-end/.comfyui/.venv` (ComfyUI runtime, Pillow, ONNX Runtime, PyTorch MPS).
  - Node.js v20+ trong `web/` (Next.js 14).
- **Cấu hình Credentials (API Keys):**
  - `IDEOGRAM_API_KEY`: **KHÔNG CÓ**
  - `GEMINI_API_KEY` / `GOOGLE_API_KEY`: **KHÔNG CÓ**
  - `DASHSCOPE_API_KEY` (Qwen/Wanx): **KHÔNG CÓ**
  - `OPENAI_API_KEY` / `REPLICATE_API_TOKEN`: **KHÔNG CÓ**
- **Quy định chi phí:** Tuân thủ `GEMINI.md` — 0đ chi phí vận hành, tuyệt đối không tự đăng ký, không tự mua quota, không dùng API trả phí khi chưa có sự phê duyệt từ anh.

---

## 2. Ma Trận Khảo Sát Các Ứng Viên Model

| Ứng viên tham khảo | Tên model / Endpoint chính thức | Docs / URL chính thức | Khả năng Full-Design & Typography | Nhận ảnh tham chiếu (Product / Style) | Hỗ trợ Tiếng Việt | Giấy phép thương mại | Cấu hình chạy thực tế | Chi phí ước tính | Trạng thái hiện tại |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Ideogram 4** *(đề xuất)* | **Ideogram 2.0 / v2a Turbo** *(Không có v4)* | [developer.ideogram.ai](https://developer.ideogram.ai/) | Xuất sắc về typography tiếng Anh & bố cục đồ họa | Có (Style Reference, Image Weight) | Trung bình / Yếu (dấu tiếng Việt hay bị lỗi/sai từ) | Có (gói trả phí / API) | Cloud API | ~$0.08 / ảnh | **BLOCKED** *(Thiếu API key & là API trả phí)* |
| **Gemini image / Nano Banana Pro** | **Imagen 3** (`imagen-3.0-generate-002`) | [ai.google.dev/gemini-api/docs/imagen](https://ai.google.dev/gemini-api/docs/imagen) | Thẩm mỹ rất cao, typography tiếng Anh tốt | Có (qua Vertex AI Inpainting / Editing) | Yếu / Trung bình (chữ tiếng Việt dài hay bị biến dạng) | Có (Google AI Studio / Vertex AI) | Cloud API | Theo token/image của Google | **BLOCKED** *(Thiếu credentials `GEMINI_API_KEY`)* |
| **Qwen Image** | **Tongyi Wanxiang 2.1** (Wanx-v2.1) | [help.aliyun.com (DashScope Wanx)](https://help.aliyun.com/zh/dashscope/developer-reference/tongyi-wanxiang-api-details) | Tốt về phong cách Á Đông, text Trung/Anh | Có (Subject reference qua DashScope) | Kém (không tối ưu cho tiếng Việt) | Có (Alibaba DashScope) | Cloud API hoặc Local (>16GB VRAM CUDA) | Trả phí DashScope | **BLOCKED** *(Thiếu API key; Local không đủ VRAM NVIDIA)* |
| **Local ComfyUI / SD 1.5** | **DreamShaper 8** (`dreamshaper_8.safetensors`) | [huggingface.co/Lykon/DreamShaper](https://huggingface.co/Lykon/DreamShaper) | **KHÔNG THỂ** sinh chữ hoặc full commercial poster | Có (ControlNet, Inpaint) | Hoàn toàn không | CreativeML OpenRAIL-M | Chạy local MPS trên máy | 0đ | **INELIGIBLE** *(Chỉ tạo background; vi phạm quy tắc full-design)* |
| **Pollinations.ai** | Public Flux / SDXL endpoint | [image.pollinations.ai](https://image.pollinations.ai) | Không thể kiểm soát typography 8 ý; không sinh được commercial poster chuẩn | Không giữ nguyên được sản phẩm gốc | Không ổn định | Công cộng | Web HTTP GET | 0đ (Public) | **INELIGIBLE** *(Chỉ tạo minh họa ngẫu nhiên; không đủ chuẩn)* |

---

## 3. Kết Luận Khảo Sát & Giải Pháp Theo PLAN_FOR_GEMINI.md

Theo đúng quy định mục 3 của `PLAN_FOR_GEMINI.md`:
1. **Toàn bộ 3 ứng viên sinh ảnh full-design bằng AI đóng gói (Ideogram, Imagen 3, Qwen/Wanx)** đều đang ở trạng thái **BLOCKED** do:
   - Thiếu API credentials / tokens trong môi trường.
   - Các dịch vụ này đều là dịch vụ trả phí (commercial paid APIs) hoặc yêu cầu quota được cấu hình trước. Em tuân thủ nghiêm ngặt quy tắc `GEMINI.md`: không tự ý dùng API tính phí bên ngoài (0đ chi phí vận hành) và không tự mua quota.
2. **Không đánh tráo khái niệm**:
   - Tuyệt đối không dùng mô hình sinh background (như DreamShaper 8 hay Pollinations) rồi gắn mác "full-design".
   - Tuyệt đối không sinh output giả (mock/fake image) rồi báo là model đã chạy thành công.
3. **Kế hoạch hành động theo spec**:
   - Xây dựng **Harness CLI hoàn chỉnh** (`back-end/scripts/design_benchmark_harness.py`):
     - Định nghĩa Provider interface chuẩn `BaseDesignProvider` với method `generate_full_design()`.
     - Cung cấp adapter sẵn sàng cho Ideogram, Gemini Imagen, Qwen Wanx (để khi anh cấp API key là kích hoạt chạy live ngay lập tức).
     - Tích hợp kiểm tra blocking thực tế và xuất `manifest.json` ghi nhận chính xác trạng thái `BLOCKED` kèm lý do kỹ thuật.
     - Cung cấp bộ test tự động kiểm tra harness, độ tương thích dữ liệu `cases.json`, và kiểm tra sản phẩm fixture.
