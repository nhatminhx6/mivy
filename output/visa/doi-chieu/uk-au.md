# Đối chiếu bảng copy visa — Anh (Standard Visitor) & Úc (Visitor 600)

Hồ sơ mẫu: Lê Thu Hà, hộ chiếu C7654321. Bảng app: `output/visa/7-uk/bang-copy.txt`, `output/visa/8-au/bang-copy.txt`; code: `FotoDocsCore/VisaForms.swift` (`uk`, `australia`).

Ghi chú chung: form online thật (UKVI "Apply for a UK visit visa", ImmiAccount) phải đăng nhập/bắt đầu hồ sơ mới thấy câu hỏi, nên không đọc trực tiếp được. Phần đối chiếu dựa trên form giấy/hướng dẫn chính thức gần nhất (liệt kê dưới). Trang immi.homeaffairs.gov.au và homeaffairs.gov.au chặn tải tự động (HTTP 401/403) cho cả PDF 1419 lẫn trang hướng dẫn, nên phía Úc phải dùng bản form 1419 do Đại sứ quán Úc (embassy.gov.au) đăng.

---

## 1. Anh — Standard Visitor visa (online)

### Nguồn
- [UK-1] gov.uk, "Visit the UK as a Standard Visitor: Apply for a Standard Visitor visa" — https://www.gov.uk/standard-visitor/apply-standard-visitor-visa (không ghi ngày cập nhật). Nộp online, form không mô tả từng ô; có liệt kê: địa chỉ nhà hiện tại + đã ở bao lâu, tên/ngày sinh cha mẹ, thu nhập năm, thông tin nơi làm việc.
- [UK-2] gov.uk, "Visiting the UK: guide to supporting documents" (cập nhật 8/10/2026) — https://www.gov.uk/government/publications/visitor-visa-guide-to-supporting-documents/guide-to-supporting-documents-visiting-the-uk . Không nói gì về CCCD/định dạng ô.
- [UK-3] Home Office, "VAF Guidance (Generic April 2014)" — hướng dẫn từng câu của form xin visa giấy VAF, **đã lưu trữ ngày 25/11/2019** — https://assets.publishing.service.gov.uk/media/5ddbbbc6ed915d015c54829b/VAF2-8b-Guidance-Notes.pdf (đã lưu: `form-goc/uk-VAF-guidance-notes-generic-2014.pdf`). Đây là nguồn chính thức duy nhất tìm được có ghi số câu và cách điền từng ô; form online hiện tại có thể đặt câu chữ khác.
- Không có bản VAF1A nào còn đăng trên gov.uk (chỉ còn bản copy ở trang bên thứ ba, không dùng).

### Bảng đối chiếu

| Ô trên app | Câu hỏi trên form gốc (số) | App ghi | Form yêu cầu | Kết luận | Nguồn |
|---|---|---|---|---|---|
| Given names | 1.1 Given name(s) (as shown in your passport) | THU HA | Mọi tên được đặt lúc sinh trừ họ, giống hộ chiếu, không có danh xưng | ĐÚNG | UK-3 |
| Family name | 1.2 Family name | LE | Họ như trong hộ chiếu | ĐÚNG | UK-3 |
| — | 1.3 Other names | — | Tên khác (vd tên khai sinh nếu khác) | ĐÚNG (không có dữ liệu; tên có dấu không phải "tên khác") | UK-3 |
| Sex | 1.4 Sex | FEMALE | Giới tính lúc nộp đơn | ĐÚNG | UK-3 |
| Marital status | 1.5 What is your marital status? | SINGLE | Single / Married / Civil partnership / Unmarried partner / Separated / Divorced… | ĐÚNG (form online có thể gọi là "Relationship status": CHƯA CHẮC về nhãn) | UK-3 |
| Date of birth | 1.6 Date of Birth | 21/07/1995 | DD/MM/YYYY, như hộ chiếu | ĐÚNG | UK-3 |
| Place of birth | 1.7 Place of Birth | TP HO CHI MINH | Làng/thị trấn/thành phố **và** bang/tỉnh nơi sinh | CHƯA CHẮC — "TP" là chữ viết tắt tiếng Việt; nên ghi kiểu tiếng Anh (HO CHI MINH CITY) hoặc đúng như hộ chiếu. Hướng dẫn không nói rõ | UK-3 |
| Country of birth | 1.8 Country of Birth | VIET NAM | Đúng như trang thông tin hộ chiếu | ĐÚNG (form online là danh sách chọn: chọn "Vietnam") | UK-3 |
| Nationality | 1.9 Nationality | VIETNAMESE | Khớp cơ quan cấp hộ chiếu | ĐÚNG | UK-3 |
| National identity number | (không có trong VAF 2014) | 079195004321 | Form online hiện tại có thể hỏi về CCCD nhưng không xem được câu chữ/vị trí | CHƯA CHẮC — chưa có nguồn chính thức nào xác nhận có câu này hay không, hay câu nằm ở đâu | UK-1, UK-3 |
| Passport number | 2.1 Current passport or travel document number | C7654321 | Như in trong hộ chiếu | ĐÚNG | UK-3 |
| — | 2.2 Place of Issue | — | **Cả thành phố và quốc gia** cấp hộ chiếu | THIẾU — app chỉ đưa ra "Issuing authority", không có ô Place of issue (profile có `passportIssuePlace`; cần thêm thành phố + VIET NAM). Form online có thể đã bỏ câu này | UK-3 |
| Issuing authority | 2.3 Issuing Authority | IMMIGRATION DEPARTMENT | Cơ quan cấp hộ chiếu cấp quốc gia, theo thông tin trong hộ chiếu | CHƯA CHẮC — đúng ý nghĩa; nên ghi đúng như in trong hộ chiếu | UK-3 |
| Date of issue | 2.4 Date of Issue | 10/08/2021 | DD/MM/YYYY | ĐÚNG | UK-3 |
| Date of expiry | 2.5 Date of Expiry | 10/08/2031 | DD/MM/YYYY | ĐÚNG | UK-3 |
| Home address | 3.1 Your full address and postal code | 45 NGUYEN HUE, BEN NGHE WARD, DISTRICT 1, HO CHI MINH CITY | Địa chỉ đầy đủ gồm **mã bưu chính và quốc gia** | LỆCH — thiếu mã bưu chính và "VIET NAM" | UK-3 |
| — | 3.2 How long have you lived at this address? | — | Thời gian ở địa chỉ này | (không có dữ liệu trong profile) | UK-1, UK-3 |
| Telephone / Mobile | 3.3 Home (landline) / 3.4 Mobile telephone number | 0912 345 678 | Di động **kèm mã quốc gia**; số bàn riêng một câu | LỆCH — thiếu +84 (nên ghi +84 912 345 678); nhãn app gộp 2 câu | UK-3 |
| E-mail | 3.5 Email address | thuha.le@gmail.com | Email hợp lệ | ĐÚNG | UK-3 |
| Current occupation | 5.2 What is your present work or job or occupation? | ACCOUNTANT | Công việc hiện tại | ĐÚNG | UK-3 |
| Employer / School name | 5.3 Name of the company or organisation you work for | PHO XUA COMPANY LIMITED | Tên công ty | ĐÚNG | UK-3 |
| Employer / School address | 5.5 What is your work address? | 12 LE LOI, DISTRICT 1, HO CHI MINH CITY | Địa chỉ đầy đủ **gồm mã bưu chính** | LỆCH — thiếu mã bưu chính và quốc gia | UK-3 |

Thứ tự: khớp thứ tự VAF (Phần 1 → 2 → 3 → 5), trừ ô CCCD (không có trên VAF; app đặt giữa Nationality và Passport number). Thứ tự trên form online: CHƯA CHẮC.

### Cần sửa (Anh)
1. Điện thoại: thêm mã quốc gia (+84, bỏ số 0 đầu) — VAF 3.4.
2. Địa chỉ nhà và nơi làm việc: thêm quốc gia (VIET NAM) và mã bưu chính, hoặc nhắc người dùng tự thêm — VAF 3.1, 5.5.
3. Thêm dòng "Place of issue" (thành phố + quốc gia) tách khỏi "Issuing authority" — VAF 2.2/2.3.
4. Nơi sinh: không để chữ "TP" tiếng Việt; dùng tên tiếng Anh/như hộ chiếu (chưa có nguồn bắt buộc, chỉ là gợi ý).
5. Ô CCCD: cần xác minh trên form online thật (cần đăng nhập) xem có hỏi không và ở vị trí nào.

---

## 2. Úc — Visitor visa subclass 600 (ImmiAccount)

### Nguồn
- [AU-1] Form 1419 "Application for a Visitor visa – Tourist stream", bản song ngữ Anh–Tây Ban Nha **1419 SPA (Design date 12/14)**, © Commonwealth of Australia 2014, do Đại sứ quán Úc tại Chile đăng — https://chile.embassy.gov.au/files/scle/1419spa.pdf (đã lưu: `form-goc/au-1419spa-design-12-14-embassy-chile.pdf`). Phần tiếng Anh giống bản gốc. Có bản mới hơn (Design date 09/21), nhưng bản đó ở https://immi.homeaffairs.gov.au/form-listing/forms/1419.pdf, trang này chặn tải tự động (401/403) nên không đọc được. Số câu/câu chữ có thể đã đổi.
- Không đọc được: trang visitor-600 và hướng dẫn ImmiAccount trên immi.homeaffairs.gov.au (403). Cách nhập tên/ngày trên ImmiAccount (vd định dạng "DD MMM YYYY") vì vậy **chưa được xác minh**.

### Bảng đối chiếu

| Ô trên app | Câu hỏi trên form gốc (số) | App ghi | Form yêu cầu | Kết luận | Nguồn |
|---|---|---|---|---|---|
| Family name | 7 Family name ("exactly as they appear in your passport") | LE | Như hộ chiếu, tiếng Anh, chữ in | ĐÚNG | AU-1 |
| Given names | 7 Given names | THU HA | Như hộ chiếu | ĐÚNG | AU-1 |
| Sex | 7 Sex (Male/Female) | FEMALE | Male/Female | ĐÚNG | AU-1 |
| Date of birth | 7 Date of birth (ô DAY / MONTH / YEAR) | 21 JUL 1995 | Thứ tự ngày-tháng-năm | ĐÚNG về thứ tự; CHƯA CHẮC việc dùng tên tháng viết tắt "JUL" (form giấy là ô số; ImmiAccount không xem được) | AU-1 |
| Passport number | 7 Passport number | C7654321 | Như hộ chiếu | ĐÚNG | AU-1 |
| Country of passport | 7 Country of passport | VIET NAM | Quốc gia cấp | ĐÚNG | AU-1 |
| Nationality | 7 Nationality of passport holder | VIETNAMESE | Quốc tịch người mang hộ chiếu | ĐÚNG về nội dung; nhãn ngắn hơn form. Trên ImmiAccount là danh sách chọn quốc gia (CHƯA CHẮC) | AU-1 |
| Date of issue | 7 Date of issue | 10 AUG 2021 | Ngày-tháng-năm | ĐÚNG (như DOB) | AU-1 |
| Date of expiry | 7 Date of expiry | 10 AUG 2031 | Ngày-tháng-năm | ĐÚNG | AU-1 |
| Place of issue / issuing authority | 7 Place of issue/issuing authority | IMMIGRATION DEPARTMENT | Như hộ chiếu | CHƯA CHẮC — nên khớp đúng chữ in trong hộ chiếu | AU-1 |
| National identity card number | **16** Identity card/number: Family name, Given names, **Type of document**, Identity number, **Country of issue** | 079195004321 (chỉ số) | 5 ô | LỆCH thứ tự (app để trước câu 8 và 9; form để sau 15) + THIẾU 4 ô con: LE / THU HA / NATIONAL IDENTITY CARD / VIET NAM | AU-1 |
| Town / City of birth | 8 Place of birth — Town/city | TP HO CHI MINH | Viết **bằng tiếng Anh**, chữ in | LỆCH — "TP" là tiếng Việt; nên ghi HO CHI MINH CITY / HO CHI MINH | AU-1 (hướng dẫn trang 5) |
| — | 8 Place of birth — State/province | — | Tỉnh/bang | THIẾU — app không có dòng này (lấy được từ cùng `placeOfBirth`, vd HO CHI MINH) | AU-1 |
| Country of birth | 8 Place of birth — Country | VIET NAM | Quốc gia | ĐÚNG | AU-1 |
| Marital status | **9 Relationship status**: Married / Engaged / De facto / Separated / Divorced / Widowed / Never married or been in a de facto relationship | SINGLE | Không có lựa chọn "Single" | LỆCH — nhãn phải là "Relationship status"; SINGLE → "NEVER MARRIED OR BEEN IN A DE FACTO RELATIONSHIP" | AU-1 |
| Home address | 20 Your current residential address (+ POSTCODE, Country) | 45 NGUYEN HUE, … HO CHI MINH CITY | Địa chỉ nhà (không nhận hộp thư), mã bưu chính, quốc gia | LỆCH — thiếu postcode và "VIET NAM" | AU-1 |
| Telephone / Mobile | 22 Contact telephone numbers: COUNTRY CODE / AREA CODE / NUMBER × Home / Office / Mobile | 0912 345 678 | Mã quốc gia tách riêng | LỆCH — cần 84 + 912345678 (bỏ số 0 đầu) | AU-1 |
| E-mail | 23 Email address (sau câu đồng ý liên lạc qua email) | thuha.le@gmail.com | Email | ĐÚNG | AU-1 |
| Current occupation | 40 Employment status → Employed: **Position you hold** | ACCOUNTANT | Chức danh | CHƯA CHẮC về nhãn (form giấy: "Position you hold"; nhãn trên ImmiAccount không xem được); giá trị ĐÚNG | AU-1 |
| Employer / School name | 40 Employer/business name | PHO XUA COMPANY LIMITED | Tên công ty | ĐÚNG | AU-1 |
| — | 40 Address (+ POSTCODE) của nơi làm việc | — | Địa chỉ công ty | THIẾU — profile có `employerAddress`, app Úc bỏ (bảng Anh có) | AU-1 |

Thứ tự: câu 7 khớp đúng từng ô. Sau đó form đi 8 (nơi sinh) → 9 (relationship) → 16 (CCCD) → 20 (địa chỉ) → 22 (điện thoại) → 23 (email) → 40 (việc làm). App đưa CCCD lên trước 8 và 9 → LỆCH thứ tự.

### Cần sửa (Úc)
1. Đổi nhãn "Marital status" → "Relationship status"; map SINGLE → "NEVER MARRIED OR BEEN IN A DE FACTO RELATIONSHIP" (married → MARRIED, divorced → DIVORCED, widowed → WIDOWED) — câu 9.
2. CCCD: dời xuống sau Relationship status; thêm các dòng Type of document = NATIONAL IDENTITY CARD, Family name, Given names, Country of issue = VIET NAM — câu 16.
3. Nơi sinh: bỏ "TP", ghi tiếng Anh; thêm dòng State/province — câu 8 (form yêu cầu viết bằng tiếng Anh).
4. Điện thoại: tách mã quốc gia 84, bỏ số 0 đầu — câu 22.
5. Địa chỉ nhà: thêm postcode + VIET NAM — câu 20.
6. Thêm `employerAddress` (Employer address) vào bảng Úc; cân nhắc đổi nhãn nghề thành "Position you hold" — câu 40.
7. Định dạng ngày "21 JUL 1995": giữ được thứ tự D-M-Y; cần ai có ImmiAccount xác minh trường ngày nhận dạng gì.
