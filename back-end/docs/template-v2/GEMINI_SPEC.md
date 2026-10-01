Chào anh, em đã lập bản đặc tả kỹ thuật (Specification) theo yêu cầu. Dưới đây là thiết kế chi tiết để triển khai các bước tiếp theo.

### 1. Typed Proposed Contract & Field Schemas
Em mở rộng `MarketingState` và định nghĩa cấu trúc dữ liệu riêng cho 3 ngành đợt 1, giữ nguyên controls ảnh hiện hành.

```typescript
// 1. Định danh concept đợt 1
export type ConceptId = 
  | 'job_posting' | 'team_profile' // Tuyển dụng
  | 'hero_architecture' | 'brochure_gallery' // BĐS
  | 'hero_dish' | 'menu_combo'; // Ẩm thực

// 2. Schema dữ liệu 3 ngành
export interface RecruitmentData {
  position: string;
  salary?: string;
  location: string;
  requirements: string[]; 
  benefits: string[];
  contact: string;
}

export interface PropertyData {
  propertyType: string;
  price: string;
  area: string;
  address: string;
  bedrooms?: string | number;
  amenities: string[];
  contact: string;
}

export interface FoodData {
  itemOrCombo: string;
  price: string;
  description: string;
  offer?: string;
  addressOrOrder: string;
}

export type IndustrySpecificData = 
  | { type: 'recruitment'; data: RecruitmentData }
  | { type: 'property'; data: PropertyData }
  | { type: 'food'; data: FoodData };

// 3. Cập nhật MarketingState
export interface MarketingState {
  industry: IndustryId;
  categoryId?: string;
  conceptId?: ConceptId; 
  industryData?: IndustrySpecificData; 

  // Controls hình ảnh hiện tại (giữ nguyên)
  image?: string;
  cutout?: string;
  bgUrl?: string;
  mainImageFit?: "cover" | "contain";
  mainImageZoom?: number;
  mainImageX?: number;
  mainImageY?: number;
  backgroundImage?: string;
  backgroundDim?: number;
  backgroundBlur?: number;
  backgroundX?: number;
  backgroundY?: number;
  
  aspect: AspectRatio;
  theme: ThemeId;
  outputLanguage?: OutputLanguage;
  
  // Legacy support
  layoutMode?: LayoutMode;
  selected: PosterKind;
  copies: Record<PosterKind, CopyItem>;
}
```

### 2. Sáu Concept Layout & Quy tắc Hình ảnh (Blueprints)
Hai lớp ảnh (Background & Main image) hoàn toàn độc lập, giữ nguyên các thuộc tính zoom/pan/fit, không tráo đổi vai trò. Các layout tự reflow lưới khi đổi tỷ lệ (1:1, 4:5, 9:16), không kéo giãn sai tỷ lệ.
* **Tuyển dụng**:
  1. `job_posting` (Thông báo tuyển dụng): Text-heavy. Khối title (Vị trí + Lương) nổi bật đỉnh/giữa. Yêu cầu/Quyền lợi chia 2 cột (ngang) hoặc trên/dưới (dọc).
  2. `team_profile` (Hồ sơ đội ngũ): Main image (nhân sự cắt nền) vươn ra chiếm phần lớn diện tích. Title nhỏ lại, nhấn mạnh văn hóa và Quyền lợi ở không gian còn lại.
* **Bất động sản**:
  3. `hero_architecture` (Ảnh kiến trúc lớn): Dành 70-80% khung cho ảnh gốc. Dải thông số overlay bán trong suốt chứa Giá, Diện tích, Phòng ngủ đè lên ảnh.
  4. `brochure_gallery` (Brochure nhiều ảnh): Bố cục chia dạng lưới (dùng bg làm ảnh tổng thể, main photo làm điểm nhấn). Các tiện ích xếp thành lưới biểu tượng/bullet nhỏ, call-to-action to rõ.
* **Ẩm thực**:
  5. `hero_dish` (Hero món ăn): Dùng cutout mạnh. Main image căn giữa, rực rỡ lấn át nền. Tên món to bản, giá nằm trong badge/sticker nổi bật.
  6. `menu_combo` (Menu/Combo): Layout chia dạng thẻ (card). Dành nhiều không gian cho text liệt kê mô tả và ưu đãi, ảnh lùi lại làm minh họa góc.

### 3. Xử lý No-image và Long-content
* **No-image**: Nếu thiếu Main Image, layout sẽ flex-grow các mảng nội dung hoặc dùng placeholder pattern trang trí phù hợp ngành lấp khoảng trống. Không để lại mảng trống không cân đối.
* **Long-content**: 
  - Kích hoạt phân trang: Nếu text quá dài, chia nhỏ mảng array (như requirements/amenities) thành nhiều trang thay vì nhồi nhét.
  - Không tự tiện cắt cụt (truncate) làm rớt thông tin liên hệ hay giá.
  - Hỗ trợ VI/EN chuẩn dấu ngã/nặng. Font phải được tải hoàn toàn trước khi vẽ.

### 4. Migrate Draft & Mock Data
* **Context Store**: Lưu draft dưới dạng object phân tách theo ngành.
* **Flow**: Khi chuyển ngành, hệ thống tự động lưu draft hiện tại và nạp draft của ngành tương ứng (nếu có). Không map chéo trường dữ liệu sai lệch.
* **Preview**: Dùng hard-code mock data riêng theo đúng ngữ cảnh ngành (JD cho Tuyển dụng, Nhà cửa cho BĐS) khi xem trước ở thư viện mẫu, tuyệt đối không chèn dữ liệu này vào chiến dịch thật.

### 5. Tiêu chí Nghiệm thu (Acceptance Cases)
1. **Data Isolation**: Lưu và khôi phục draft thành công khi đổi qua lại giữa các ngành; dữ liệu mẫu không bị rò rỉ vào bài thiết kế thật.
2. **Render bao phủ**: Pass đủ 18 case (3 ngành × 2 concept × 3 tỷ lệ). Test với cả 4 cấu hình: Không ảnh / Chỉ nền / Chỉ ảnh chính / Đầy đủ 2 ảnh.
3. **Export Quality**: Xuất PNG chuẩn tỷ lệ, đúng crop/zoom/pan, đủ số lượng trang (nếu nội dung dài), font không bị vỡ dấu tiếng Việt.
4. **Visual Hierarchy**: 6 mẫu khác biệt rõ ràng về cấu trúc, hierarchy và ảnh (anh sẽ trực tiếp review contact sheet để duyệt chất lượng hình ảnh cuối cùng, không phụ thuộc vào việc chỉ pass test code).

### 6. Lộ trình Bounded Coding (Các bước code)
* **Task 1**: Cập nhật Types/Contract mới (khai báo 3 schema, thêm ConceptId, mock data).
* **Task 2**: Xây dựng logic Context/Store giữ draft tách biệt theo ngành, quản lý trạng thái.
* **Task 3**: Làm UI Dynamic Form tự thay đổi các trường (fields) theo schema tương ứng của ngành.
* **Task 4**: Code CSS/Canvas Renderer cho Tuyển dụng (`job_posting`, `team_profile`) kèm logic phân trang nội dung dài.
* **Task 5**: Code Layout Renderer cho Bất động sản (reflow theo 3 tỷ lệ).
* **Task 6**: Code Layout Renderer cho Ẩm thực (xử lý logic No-image fallback).
* **Task 7**: Hoàn thiện luồng Export (cắt cup ảnh, nạp fonts, xử lý PNG/ZIP).

Bản đặc tả đã sẵn sàng, anh xem xét để duyệt trước khi thực hiện các task code tiếp theo nhé!

## Issues
