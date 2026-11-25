# Đối chiếu bảng copy: Mỹ (DS-160) + Schengen

Hồ sơ giả: Lê Thu Hà, hộ chiếu C7654321, sinh 21/07/1995, nữ, CCCD 079195004321.
Đầu vào: `output/visa/5-us/bang-copy.txt`, `output/visa/6-schengen/bang-copy.txt`, `FotoDocsCore/VisaForms.swift` (`usa`, `schengen`), `VisaProfile.swift` (`Latin.*`).
Ngày đối chiếu: 18/11/2026.

---

## 1. Schengen

### Nguồn
- **Nguồn chính:** Regulation (EU) 2019/1155 (Official Journal L 188/25, 12.7.2019), **Annex I – Harmonised application form "APPLICATION FOR SCHENGEN VISA"** (thay Annex I của Regulation (EC) No 810/2009). Bản PDF lấy từ EUR-Lex: https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32019R1155, lưu ở `form-goc/eurlex-32019R1155.pdf` (form ở trang 22–25 của file).
- **Bản đối chứng:** form do Đại sứ quán Thuỵ Điển tại Rabat phát hành (swedenabroad.se), lưu ở `form-goc/schengen-form-swedenabroad-rabat.pdf`. Số ô và nhãn khớp bản EUR-Lex.
- Không tải được bản trực tiếp từ home-affairs.ec.europa.eu (tìm kiếm không ra link PDF). Bản EUR-Lex là văn bản pháp lý gốc nên đủ dùng.
- Câu trên form có liên quan: "Fields 1-3 shall be filled in in accordance with the data in the travel document."

### Bảng đối chiếu

| Ô trên app | Ô trên form gốc (số/trang) | App ghi | Form yêu cầu | Kết luận | Nguồn |
|---|---|---|---|---|---|
| Surname (Family name) | 1. Surname (Family name) | LE | Theo giấy tờ đi lại | ĐÚNG | Annex I, ô 1 + câu "Fields 1-3…" |
| — | **2. Surname at birth (Former family name(s))** | (không có) | Họ khi sinh / họ cũ | THIẾU | Annex I, ô 2. Hồ sơ có `surname`, và người Việt không đổi họ khi kết hôn, nên điền được LE |
| First name(s) (Given name(s)) | 3. First name(s) (Given name(s)) | THU HA | Theo giấy tờ đi lại | ĐÚNG | Annex I, ô 3 |
| Date of birth | 4. Date of birth (day-month-year) | 21-07-1995 | ngày-tháng-năm | ĐÚNG | Annex I, ô 4 |
| Place of birth | 5. Place of birth | TP HO CHI MINH | Không quy định cách viết | CHƯA CHẮC | Form không quy định. "TP" là chữ viết tắt tiếng Việt; khi viết tiếng Anh, chính app đổi nó thành "HO CHI MINH CITY" (`Latin.address`) |
| Country of birth | 6. Country of birth | VIET NAM | — | ĐÚNG | Annex I, ô 6 |
| Current nationality | 7. Current nationality | VIETNAMESE | Không quy định dạng | ĐÚNG | Annex I, ô 7. Ô phụ "Nationality at birth, if different" và "Other nationalities" bỏ trống |
| Sex | 8. Sex: Male / Female (ô tick) | FEMALE | Tick 1 ô | ĐÚNG | Annex I, ô 8 |
| Civil status | 9. Civil status: Single / Married / Registered Partnership / Separated / Divorced / Widow(er) / Other | SINGLE | Tick 1 ô | ĐÚNG | Annex I, ô 9. App ghi WIDOWED, form ghi "Widow(er)", vẫn nhận ra được |
| National identity number | 11. National identity number, where applicable | 079195004321 | Số định danh | ĐÚNG | Annex I, ô 11 |
| Type of travel document | 12. Type of travel document: Ordinary passport… | ORDINARY PASSPORT | Tick "Ordinary passport" | ĐÚNG | Annex I, ô 12 |
| Number of travel document | 13. Number of travel document | C7654321 | — | ĐÚNG | Annex I, ô 13 |
| Date of issue | 14. Date of issue | 10-08-2021 | Form không quy định dạng (ô 4 dùng ngày-tháng-năm) | ĐÚNG | Annex I, ô 14 |
| Valid until | 15. Valid until | 10-08-2031 | như trên | ĐÚNG | Annex I, ô 15 |
| Issued by (country) | 16. Issued by (country) | VIET NAM | Tên nước | ĐÚNG | Annex I, ô 16 |
| Applicant's home address and e-mail address | 19. Applicant's home address and e-mail address | 45 NGUYEN HUE, BEN NGHE WARD, DISTRICT 1, HO CHI MINH CITY | Địa chỉ **và** email (cùng 1 ô) | ĐÚNG | Annex I, ô 19. Hàng này của app chỉ có địa chỉ, email ở hàng sau |
| E-mail | 19. (phần e-mail của ô 19) | thuha.le@gmail.com | — | ĐÚNG | Annex I, ô 19. Trên form không có ô "E-mail" riêng; nên ghi rõ là ô 19 |
| Telephone number(s) | 19. … **Telephone no.:** | 0912 345 678 | Không quy định dạng | LỆCH (chỉ nhãn) | Annex I, ô 19 ghi "Telephone no.", không phải "Telephone number(s)". Có nên thêm +84 không: CHƯA CHẮC, form không nói |
| Current occupation | *21. Current occupation | ACCOUNTANT | — | ĐÚNG | Annex I, ô 21 |
| Employer and employer's address | *22. Employer and employer's address **and telephone number**. For students, name and address of educational establishment | PHO XUA COMPANY LIMITED, 12 LE LOI, DISTRICT 1, HO CHI MINH CITY | Tên + địa chỉ + **SĐT** nơi làm | LỆCH (nhãn thiếu "and telephone number") | Annex I, ô 22. Hồ sơ không có SĐT công ty nên phần SĐT người dùng phải tự điền |

**Thứ tự:** 1→3→4→5→6→7→8→9→11→12→13→14→15→16→19→21→22, khớp form (chỉ thiếu ô 2). Các ô 10, 17, 18, 20, 23 trở đi không lấy được từ hồ sơ nên bỏ là đúng.
**Hàng thừa:** không có.
**Lưu ý:** nhiều nước Schengen bắt khai online trên cổng riêng (France-Visas, VIDEX…), nhãn và danh sách chọn có thể khác Annex I. Lần này chưa đối chiếu các cổng đó.

### Sửa đề xuất (Schengen)
1. Thêm hàng **"2. Surname at birth (Former family name(s))"** = `surname` (gợi ý: "Họ khi sinh — người Việt thường giống ô 1"), đặt giữa ô 1 và ô 3.
2. Đổi nhãn `Telephone number(s)` → **"Telephone no."** và nhãn ô 22 → **"Employer and employer's address and telephone number"**. Gợi ý thêm: "Thêm SĐT công ty".
3. Thêm **số ô** vào đầu nhãn ("1. Surname (Family name)", "19. … e-mail address"…) để người dùng tìm ô trên form giấy nhanh hơn. Hàng E-mail và Telephone ghi rõ là "(ô 19)".
4. (Tuỳ chọn) Nơi sinh: viết theo kiểu tiếng Anh, "HO CHI MINH CITY" thay cho "TP HO CHI MINH". Form không bắt buộc.

---

## 2. Mỹ (DS-160)

### Nguồn: CHƯA truy cập được nguồn chính thức
| Nguồn đã thử | Kết quả |
|---|---|
| travel.state.gov – DS-160 FAQs (`/content/travel/en/us-visas/visa-information-resources/forms/ds-160-online-nonimmigrant-visa-application/ds-160-faqs.html`) | HTTP 403, Cloudflare chặn (cả curl, WebFetch lẫn trình duyệt) |
| ceac.state.gov/genniv (form DS-160 thật) | Trang "Performing security verification" (kiểm tra bot). Không được phép vượt nên đã dừng |
| reginfo.gov – OMB 1405-0182 (ảnh chụp các trang DS-160, ICR 201905-1405-001) | Không kết nối được (từ chối kết nối / quá thời gian) |
| vn.usembassy.gov | Không tìm thấy trang hướng dẫn DS-160 (đường dẫn thử trả 404) |
| Bản "DS-160 Exemplar" của Bộ Ngoại giao Mỹ đăng lại trên trang bên thứ ba | Không dùng vì không phải nguồn chính phủ |

Thông tin chính thức duy nhất đọc được là đoạn trích của trang FAQ qua kết quả tìm kiếm (không mở được trang): "All answers must be in English, using English characters only, except when you are asked to provide your full name in your native alphabet."
Vì vậy mọi kết luận về định dạng và thứ tự ô bên dưới là **CHƯA CHẮC**. Cột "Form yêu cầu" ghi theo cấu trúc DS-160 mà người soát biết, **chưa kiểm bằng nguồn chính thức**.

### Bảng đối chiếu

| Ô trên app | Ô trên form gốc (số/trang) | App ghi | Form yêu cầu (chưa kiểm nguồn) | Kết luận | Nguồn |
|---|---|---|---|---|---|
| Surnames | Personal Information 1 – Surnames | LE | Như hộ chiếu | ĐÚNG (theo MRZ) | chưa có nguồn |
| Given Names | Personal Information 1 – Given Names | THU HA | Như hộ chiếu | ĐÚNG (theo MRZ) | chưa có nguồn |
| Full Name in Native Alphabet | Personal Information 1 | LÊ THU HÀ | Tên bằng chữ mẹ đẻ, hoặc tick "Does Not Apply/Technology Not Available" | ĐÚNG | Đoạn trích FAQ travel.state.gov (qua kết quả tìm kiếm): ô này là ngoại lệ của quy định "chỉ dùng chữ tiếng Anh" |
| Sex | Personal Information 1 | FEMALE | MALE/FEMALE | CHƯA CHẮC | chưa có nguồn |
| Marital status | Personal Information 1 – Marital Status | SINGLE | Danh sách chọn | CHƯA CHẮC | chưa có nguồn |
| Date of birth | Personal Information 1 – Date of Birth | 21-JUL-1995 | Ngày (chọn) – Tháng (chọn JAN…DEC) – Năm (gõ) | CHƯA CHẮC | chưa có nguồn |
| City of birth | Personal Information 1 – Place of Birth: City | TP HO CHI MINH | Thành phố bằng chữ tiếng Anh | CHƯA CHẮC | "TP" là chữ viết tắt tiếng Việt |
| — | Personal Information 1 – Place of Birth: **State/Province** | (không có) | Tỉnh/bang, có ô "Does Not Apply" | CHƯA CHẮC (có thể THIẾU) | `placeOfBirth` là tỉnh/thành, nên tỉnh nên vào đây, thành phố để ở City |
| Country of birth | Personal Information 1 – Country/Region | VIET NAM | Danh sách chọn (có thể ghi "VIETNAM") | CHƯA CHẮC | chưa có nguồn |
| Country/Region of Origin (Nationality) | Personal Information 2 | VIET NAM | Danh sách chọn | CHƯA CHẮC | chưa có nguồn |
| National Identification Number | Personal Information 2 | 079195004321 | Số định danh, hoặc "Does Not Apply" | CHƯA CHẮC | chưa có nguồn |
| Passport/Travel Document Number | trang Passport | C7654321 | — | CHƯA CHẮC | chưa có nguồn |
| — | trang Passport – **Passport/Travel Document Type** | (không có) | REGULAR | CHƯA CHẮC (có thể THIẾU) | Hàng Schengen của app có ô loại hộ chiếu, hàng Mỹ thì không |
| — | trang Passport – **Passport Book Number** | (không có) | Hộ chiếu VN không có số này → "Does Not Apply" | CHƯA CHẮC (có thể THIẾU) | chưa có nguồn |
| Country/Authority that Issued Passport | trang Passport | VIET NAM | Danh sách chọn | CHƯA CHẮC | chưa có nguồn |
| City where issued | trang Passport – Where was the Passport Issued? City | **IMMIGRATION DEPARTMENT** | **Tên thành phố** | CHƯA CHẮC, rất có thể sai | Nhãn của chính app hỏi "City" nhưng giá trị là tên cơ quan (`Latin.issuer`). Chưa có nguồn chính thức nên chưa ghi LỆCH |
| — | trang Passport – Where issued: State/Province, **Country/Region** | (không có) | Tỉnh/bang, nước | CHƯA CHẮC (có thể THIẾU) | chưa có nguồn |
| Issuance Date | trang Passport | 10-AUG-2021 | Ngày-Tháng(chọn)-Năm | CHƯA CHẮC | chưa có nguồn |
| Expiration Date | trang Passport | 10-AUG-2031 | như trên | CHƯA CHẮC | chưa có nguồn |
| Home Address | trang Address and Phone | 45 NGUYEN HUE, BEN NGHE WARD, DISTRICT 1, HO CHI MINH CITY (1 chuỗi) | Tách ô: Street Address (Line 1/2), City, State/Province, Postal Zone, Country | CHƯA CHẮC | Chuỗi dài 58 ký tự. Giới hạn ký tự của mỗi dòng chưa kiểm được |
| Primary Phone Number | trang Address and Phone | 0912 345 678 | Có thể không nhận dấu cách | CHƯA CHẮC | chưa có nguồn |
| Email Address | trang Address and Phone | thuha.le@gmail.com | — | CHƯA CHẮC | chưa có nguồn |
| Primary Occupation | trang Present Work/Education/Training | ACCOUNTANT | Danh sách chọn theo ngành (BUSINESS, EDUCATION…, OTHER) | CHƯA CHẮC | Nếu là danh sách chọn thì không có mục "ACCOUNTANT" để chọn |
| Present Employer or School Name | trang Present Work/Education/Training | PHO XUA COMPANY LIMITED | — | CHƯA CHẮC | chưa có nguồn |
| Employer / School address | trang Present Work/Education/Training – Address | 12 LE LOI, DISTRICT 1, HO CHI MINH CITY | Tách ô + SĐT công ty | CHƯA CHẮC | Nhãn không phải chữ trên DS-160 (là nhãn dùng chung `employerAddress`) |

**Thứ tự (CHƯA CHẮC):** theo cấu trúc người soát biết, DS-160 đi theo trang Personal 1 → Personal 2 → **Address and Phone** → **Passport** → … → Present Work. App lại xếp nhóm hộ chiếu **trước** địa chỉ/SĐT/email. Cần kiểm lại bằng nguồn chính thức.
**Hàng thừa:** không thấy hàng nào chắc chắn thừa.

### Sửa đề xuất (DS-160, làm sau khi có nguồn chính thức xác nhận)
1. **City where issued:** đừng ghi "IMMIGRATION DEPARTMENT". Ghi thành phố có cơ quan cấp (Cục QLXNC → HA NOI; phòng QLXNC tỉnh → tên tỉnh). Nếu không suy được thì để trống và gợi ý "Thành phố nơi cấp (xem trang hộ chiếu)".
2. Thêm các hàng: **Passport/Travel Document Type = REGULAR**, **Passport Book Number = Does Not Apply**, **Place of Birth State/Province**, **Where issued Country/Region = VIET NAM**.
3. **City of birth:** bỏ "TP", ghi "HO CHI MINH CITY" (hoặc HO CHI MINH), giống cách `Latin.address` xử lý.
4. **Home Address / Employer address:** tách thành Street, City, State/Province, Postal, Country để người dùng copy từng ô.
5. **Primary Phone Number:** bỏ dấu cách (0912345678).
6. **Primary Occupation:** chỉ ra mục cần chọn trong danh sách (ví dụ kế toán → BUSINESS), để nghề cụ thể ở phần mô tả công việc.
7. Xếp lại thứ tự: Address/Phone/Email lên **trước** nhóm Passport. Đổi nhãn `Employer / School address` thành nhãn đúng của DS-160.
8. Kiểm lại toàn bộ khi mở được ceac.state.gov hoặc FAQ travel.state.gov bằng trình duyệt thường. Cần xem: định dạng ngày, cách viết "VIETNAM" hay "VIET NAM" trong danh sách chọn, giới hạn ký tự địa chỉ, ký tự được phép trong số điện thoại.
