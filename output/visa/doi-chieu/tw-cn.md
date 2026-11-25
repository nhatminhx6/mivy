# Đối chiếu bảng copy FotoDocs với form gốc — Đài Loan & Trung Quốc

Ngày kiểm: 2026-11-18. Hồ sơ mẫu: Lê Thu Hà (HC C7654321). Không sửa code.
File tải về / trích chữ: `output/visa/doi-chieu/form-goc/` (tw-*, cn-*).

---

## 1. Đài Loan (ROC) — visawebapp.boca.gov.tw, "General Visa Application"

### Nguồn
| # | Nguồn | Ghi chú |
|---|---|---|
| T1 | BOCA, *新版簽證線上填寫系統 QA / New Online Application Form System FAQ* — https://visawebapp.boca.gov.tw/BOCA_EVISA/csi/pdf/gvisa_QA.pdf (`tw-gvisa_QA.pdf`) | Bản hiện hành. Q4: ngày nhập tay theo **YYYY/MM/DD**; Q6: ô **"DOMESTIC ID No."** = số căn cước nước mình; Q3: chỉ có tên thì để trống ô họ. |
| T2 | Trang bước 1 của form gVisa (lấy 2026-11-18) — https://visawebapp.boca.gov.tw/BOCA_EVISA/MRV01FORM.do (`tw-visawebapp-buoc1-trich.txt`) | Bản hiện hành. "The name field must be in English. All other fields accept English or Chinese." Quốc tịch chọn ở **bước 1** từ danh sách: `VIET NAM, SOCIALIST REPUBLIC OF(越南)`. Bước 2 trở đi có CAPTCHA chặn, **không xem được trực tiếp**. |
| T3 | TECO tại Ấn Độ, *On-line Visa Application Form* (2012, ảnh chụp form) — https://roc-taiwan.org/uploads/sites/15/2018/04/241813241571.pdf (`tw-guide-241813241571.pdf`) | Ảnh chụp form cũ (trang 1–2/4). |
| T4 | TECO Brisbane, *Online Visa Application Form Tutorial* (ảnh 2015) — https://www.roc-taiwan.org/public/AUbnf_en_visa/58287561071.pdf (`tw-au-online-guide.pdf`) | Ảnh chụp đoạn đầu mục Applicant's Details. |
| T5 | TECO Việt Nam, *Hướng dẫn thủ tục xin Visa Du lịch Đài Loan* — https://www.roc-taiwan.org/vn_vi/post/1437.html | Xác nhận kênh: khai ở visawebapp.boca.gov.tw (General Visa), in ra ký. |

Không tìm thấy bản PDF trống của form ROC do cơ quan chính thức đăng. Thứ tự/nhãn ô lấy từ ảnh chụp T3, T4 (2012–2015). Hệ thống "new online application form" (T1) có thể đã đổi bố cục, nên mọi kết luận chỉ dựa vào T3/T4 đều để **CHƯA CHẮC**.

Thứ tự trên form (T3+T4): *Bước 1:* Nationality → nơi nộp → loại visa → số lần nhập cảnh. *Applicant's details:* Surname → Given Name(s) → Chinese Name → Former/Other Name → Former/Other Nationality → ID No. → Sex (M/F/X) → Date of Birth (năm/tháng/ngày) → Place of Birth (City/State or Province + Country) → tên và ngày sinh của cha, mẹ → Marital Status (danh sách) → Occupation (danh sách) → Name and Address of Employer or School → Address & Tel in Taiwan → Address & Tel in Home Country (Permanent Address / Telephone) → Current Address & Tel → Email. *Trang 2, Applicant's Passport:* Passport Type → Passport No. → Date of Expiry → Date of Issue → Place of Issue.

### Bảng đối chiếu
| Ô trên app | Ô trên form gốc (số/mục) | App ghi | Form yêu cầu | Kết luận | Nguồn |
|---|---|---|---|---|---|
| Surname / Family name | 姓 Surname (Applicant's Details) | LE | Tiếng Anh; chỉ có tên thì để trống | ĐÚNG | T2, T1-Q3, T3 |
| Given name(s) | 名 Given Name(s) | THU HA | Tiếng Anh | ĐÚNG | T2, T3 |
| Sex | 性別 Sex: 男(M) / 女(F) / 其他(X) | FEMALE | Ô chọn F | ĐÚNG (bấm "女(F)") | T4 |
| Date of birth | 出生日期 Date of Birth | 1995/07/21 | YYYY/MM/DD (ảnh 2015 là 3 ô chọn năm/tháng/ngày) | ĐÚNG | T1-Q4, T4 |
| Place of birth | 出生地點 Place of Birth: City/State or Province **+ Country** | TP HO CHI MINH | Hai ô: thành phố/tỉnh và quốc gia | CHƯA CHẮC: thiếu phần quốc gia (VIET NAM); "TP" là viết tắt tiếng Việt, nên ghi HO CHI MINH CITY | T4 (2015) |
| Nationality | 國籍 Nationality, **bước 1**, ô chọn | VIETNAMESE | Chọn `VIET NAM, SOCIALIST REPUBLIC OF(越南)` | LỆCH: chữ khác lựa chọn trong danh sách, ô nằm ở bước 1 chứ không ở mục cá nhân | T2 |
| National identity number | **DOMESTIC ID No.** (form cũ: 身分證號 ID No.) | 079195004321 | Số căn cước nước mình | LỆCH nhãn: form hiện hành gọi là "DOMESTIC ID No."; giá trị đúng | T1-Q6, T4 |
| Passport number | 護照號碼 Passport No. | C7654321 | — | ĐÚNG | T3 |
| Place of issue / Issuing authority | 發照地點 **Place of Issue** (form không có ô cơ quan cấp riêng) | IMMIGRATION DEPARTMENT | Nơi cấp như trên hộ chiếu | CHƯA CHẮC: hộ chiếu VN ghi nơi cấp là "Cục QLXNC" nên có thể dùng được; nên đổi nhãn app thành "Place of Issue" | T3 |
| Date of issue | 發照日期 Date of Issue | 2021/08/10 | YYYY/MM/DD | ĐÚNG | T1-Q4, T3 |
| Date of expiry | 效期屆滿日 Date of Expiry | 2031/08/10 | YYYY/MM/DD | ĐÚNG (form đặt ô này **trước** Date of Issue) | T1-Q4, T3 |
| Home address | 本國住址及電話 Address and Telephone Number in Home Country → Permanent Address | 45 NGUYEN HUE, … HO CHI MINH CITY | Tiếng Anh hoặc tiếng Trung | ĐÚNG giá trị; CHƯA CHẮC nhãn (form ghi "Permanent Address") | T2, T3 |
| Telephone / Mobile | Telephone Number (đi kèm từng ô địa chỉ) | 0912 345 678 | — | CHƯA CHẮC: không có nguồn chính thức về mã nước hay dấu cách | T3 |
| E-mail | 電子郵件 Email | thuha.le@gmail.com | — | ĐÚNG | T3 |
| Marital status | 婚姻狀況 Marital Status (ô chọn, vd "Single/未婚") | SINGLE | Chọn trong danh sách | ĐÚNG | T3 |
| Current occupation | 職業 Occupation (**ô chọn**, vd "student/學生") | ACCOUNTANT | Chọn trong danh sách | CHƯA CHẮC: không biết danh sách có mục "Accountant" không | T3 |
| Employer / School name | 服務機關或就讀學校地址 **Name and Address** of Employer or School (một ô) | PHO XUA COMPANY LIMITED | Cả tên lẫn địa chỉ | THIẾU địa chỉ: hồ sơ có employerAddress nhưng app không ghép vào | T3 |
| — | 目前住址及電話 Current Address and Telephone | — | Địa chỉ hiện tại | THIẾU (CHƯA CHẮC): có thể dùng `address` | T3 |
| — | 護照種類 Passport Type: Diplomatic/Official/**Regular**/Other | — | Regular | THIẾU (giá trị cố định, các nước khác trong app đã có) | T3 |
| (thứ tự) | — | sex→dob→birthplace→nationality→ID→passport→address→phone→email→marital→occupation→employer | Form: ID No. trước Sex; Marital/Occupation/Employer trước địa chỉ; hộ chiếu ở trang 2, theo thứ tự No.→Expiry→Issue→Place | CHƯA CHẮC (theo ảnh 2012/2015) | T3, T4 |

Ghi chú: TECO TP.HCM có hệ thống **xét duyệt trước online (Travel Authorization)** cho công dân VN đủ điều kiện (https://www.roc-taiwan.org/vnsgn_vi/post/736.html). Đây là kênh và form khác, app chưa có.

### Sửa cho Đài Loan
1. Nationality: đổi giá trị thành `VIET NAM, SOCIALIST REPUBLIC OF(越南)`, ghi chú là chọn ở bước 1 và đưa lên đầu bảng.
2. Đổi nhãn "National identity number" thành **"DOMESTIC ID No."**.
3. Thêm ô **Passport Type = REGULAR**.
4. Gộp Employer thành **"Name and Address of Employer or School"** = tên + địa chỉ, hoặc thêm ô địa chỉ ngay sau.
5. Place of Birth: tách City (HO CHI MINH CITY) và Country (VIET NAM), bỏ "TP".
6. Đổi nhãn "Home address" thành "Permanent Address (Home Country)", thêm "Current Address" (lấy cùng địa chỉ).
7. Đổi nhãn ô nơi cấp thành "Place of Issue"; xếp ô hộ chiếu theo thứ tự No. → Expiry → Issue → Place, cuối bảng (cần xác nhận trên form hiện hành).
8. Occupation: ghi chú là chọn từ danh sách.

---

## 2. Trung Quốc (PRC)

### Nguồn
| # | Nguồn | Ghi chú |
|---|---|---|
| C1 | Đại sứ quán TQ tại VN, *启用中国签证在线办理的通知* (25/06/2025) — https://vn.china-embassy.gov.cn/lsyw/202506/t20250625_11658812.htm | Từ 30/06/2025, khai online qua **website Trung tâm dịch vụ visa TQ**: https://bio.visaforchina.cn/HAN3_VI/qianzhengyewu (Hà Nội), …/DAD3_VI/… (Đà Nẵng). Không nhắc cova.mfa.gov.cn. |
| C2 | Hệ thống thị thực online mới của BNG TQ — https://consular.mfa.gov.cn/VISA/ (app-version 1.0.48), nhãn ô trích từ JS công khai (`cn-consular-mfa-nhan-o-trich.txt`) | Bản hiện hành. Có câu "nơi nộp đã chọn sẽ chuyển sang COVA" hoặc "sẽ chuyển sang trang Trung tâm dịch vụ visa", tuỳ nơi nộp. Có 2 biến thể đánh số mục 1.x (xem dưới). |
| C3 | Chinese Visa Application Service Center Kathmandu, *Guidance to fill out the Chinese visa online application form* (2023, có ảnh chụp form) — https://bio.visaforchina.cn/KTM3_ZH/upload/20240315/c39069129fdd441cb15dd4b08e1c2692.pdf (`cn-vfc-KTM3-20240315.pdf`) | Ảnh chụp: "1.2A Date of birth (yyyy-MM-dd)", "1.7F Issuing date - (yyyy-MM-dd)", 1.7D Issuing place, 1.7E Issuing authority. |
| C4 | Visa Center Jakarta, *Guidance for submitting online application* (07/2025) — https://biohk.visaforchina.cn/JKT3_EN/upload/20250714/079419ac248d4cf7a72d8f7934871ac6.pdf (`cn-vfc-JKT3-20250714.pdf`) | Ảnh chụp 2025: 1.1A Family name, 1.1B Given name(s), 1.1C Other/former names, 1.1D Chinese name. |
| C5 | Tổng lãnh sự quán TQ tại New York, *Guidelines for China Online Visa Application* (24/09/2025) — https://newyork.china-consulate.gov.cn/eng/tzgg/202509/t20250924_11714475.htm | Form có 9 mục; khai bằng tiếng Trung hoặc tiếng Anh. |

Form giấy **V.2013**: không tìm được bản do đại sứ quán hay trung tâm visa đăng (chỉ có bản ở trang bên thứ ba), và ở VN đã được thay bằng form online (C1), nên không dùng.

Thứ tự trên form (C2/C3): **1.1A** họ → **1.1B** tên → 1.1C tên khác → 1.1D tên chữ Hán (biến thể visa centre: 1.1C tên, 1.1D tên khác, **1.1E Full Name in Native Alphabet**) → **1.2A** ngày sinh → **1.3** giới tính (Female/Male) → **1.4A** nước sinh / **1.4B** tỉnh / **1.4C** thành phố / 1.4D quận-huyện → **1.5A** hôn nhân → **1.6A** quốc tịch hiện tại (ô chọn) / **1.6B** số căn cước nước mình → **1.7A** loại hộ chiếu / **1.7B** số / **1.7C** nước cấp / **1.7D** nơi cấp / **1.7E** cơ quan cấp / **1.7F** ngày cấp / **1.7G** ngày hết hạn (biến thể MFA rút gọn: 1.7D nơi cấp, 1.7E ngày hết hạn) → mục 2 (loại visa) → **3.1** nghề nghiệp hiện tại / **3.2B** tên công ty + địa chỉ + điện thoại công ty → mục 4 (học vấn) → **5.1** địa chỉ nhà / **5.2** điện thoại / **5.3** di động / **5.4** email → 5.5 gia đình…

### Bảng đối chiếu
| Ô trên app | Ô trên form gốc (số/mục) | App ghi | Form yêu cầu | Kết luận | Nguồn |
|---|---|---|---|---|---|
| (kênh) "Khai online COVA ở cova.mfa.gov.cn" | — | cova.mfa.gov.cn | VN (ĐSQ Hà Nội, Đà Nẵng): khai trên **bio.visaforchina.cn** | LỆCH với khu vực ĐSQ; khu vực TLSQ TP.HCM CHƯA CHẮC (không vào được trang TLSQ) | C1, C2 |
| Surname / Family name | 1.1A Family name (as shown on your passport) | LE | Theo hộ chiếu | ĐÚNG | C3, C4 |
| Given name(s) | 1.1B (biến thể cũ: 1.1C) Given name(s) | THU HA | Theo hộ chiếu | ĐÚNG | C3, C4 |
| — | 1.1E Full Name in Native Alphabet (本族裔语言姓名), có trong biến thể của visa centre | — | LÊ THU HÀ (`fullNameVN`) | THIẾU (CHƯA CHẮC trang VN có ô này không) | C2, C3 |
| Sex | 1.3A Gender: Female / Male | FEMALE | Ô chọn | ĐÚNG | C3 |
| Date of birth | 1.2A Date of birth (**yyyy-MM-dd**) | 1995/07/21 | 1995-07-21 (ô năm nhập tay + chọn tháng, ngày) | LỆCH: sai dấu phân cách; form đặt ô này trước Sex | C3, C2 |
| Country of birth | 1.4A Country / Region (ô chọn) | VIET NAM | Chọn trong danh sách | ĐÚNG (CHƯA CHẮC chữ trong danh sách) | C3 |
| Place of birth | 1.4B Province/State + 1.4C City (+1.4D District) | TP HO CHI MINH | Tách tỉnh / thành phố | LỆCH: form tách nhiều ô; "TP" là tiếng Việt | C2, C3 |
| Nationality | 1.6A Current nationality (ô chọn) | VIETNAMESE | Chọn quốc gia trong danh sách | CHƯA CHẮC: không thấy được danh sách; ô này đứng **sau** 1.5 hôn nhân | C2, C3 |
| National identity number | 1.6B National ID number (国籍国身份证件号码) | 079195004321 | Số căn cước nước mình | ĐÚNG | C2, C3 |
| — | 1.7A Type of passport: **Ordinary** | — | Ordinary | THIẾU | C3 |
| Passport number | 1.7B Passport/travel document number | C7654321 | — | ĐÚNG | C3 |
| — | 1.7C Issuing country or region | — | VIET NAM | THIẾU | C2, C3 |
| Place of issue / Issuing authority | **Hai ô riêng**: 1.7D Issuing place, 1.7E Issuing authority | IMMIGRATION DEPARTMENT (một dòng) | Ảnh mẫu: 1.7D "JAKARTA SELATAN", 1.7E "IMMIGRATION OF JAKARTA SELATAN" | LỆCH: phải tách hai dòng; giá trị cho 1.7D (nơi cấp) CHƯA CHẮC | C3 |
| Date of issue | 1.7F Issuing date (**yyyy-MM-dd**); biến thể MFA rút gọn không có ô này | 2021/08/10 | 2021-08-10 | LỆCH: sai dấu phân cách | C3, C2 |
| Date of expiry | 1.7G (biến thể MFA: 1.7E) Expiration date (**yyyy-MM-dd**) | 2031/08/10 | 2031-08-10 | LỆCH: sai dấu phân cách | C3, C2 |
| Marital status | 1.5A Marital status: Married/Divorced/Single/Widowed/Other | SINGLE | Ô chọn | ĐÚNG giá trị; LỆCH thứ tự (form đặt ngay sau nơi sinh, trước quốc tịch và hộ chiếu) | C3, C2 |
| Home address | 5.1 Current home address (现家庭住址) | 45 NGUYEN HUE, … | Tiếng Trung hoặc tiếng Anh | ĐÚNG giá trị; nằm ở mục 5, **sau** mục 3 công việc | C2, C5 |
| Telephone / Mobile | **5.2 Phone** và **5.3 Mobile** (hai ô) | 0912 345 678 | — | CHƯA CHẮC: form có hai ô; không có nguồn về định dạng số | C2 |
| E-mail | 5.4 Email | thuha.le@gmail.com | — | ĐÚNG | C2 |
| Current occupation | 3.1 Current occupation (chọn trong danh sách; không có thì chọn "other" rồi ghi rõ) | ACCOUNTANT | Chọn trong danh sách | CHƯA CHẮC | C3 |
| Employer / School name | 3.2B Name of company/organization (ghi tên đầy đủ, không viết tắt) | PHO XUA COMPANY LIMITED | Tên đầy đủ | ĐÚNG (mục 3.2 là kinh nghiệm làm việc 5 năm, không có "School") | C2, C5 |
| Employer / School address | 3.2B Company address (单位/公司的地址) | 12 LE LOI, … | — | ĐÚNG | C2 |
| (thứ tự) | 1.2→1.3→1.4→1.5→1.6→1.7 → 3.x → 5.x | sex trước dob; marital sau hộ chiếu; địa chỉ/điện thoại/email trước nghề nghiệp | — | LỆCH | C2, C3 |

### Sửa cho Trung Quốc
1. Đổi kênh: "Khai online trên website Trung tâm dịch vụ visa TQ (bio.visaforchina.cn, chọn Hà Nội / Đà Nẵng / TP.HCM)". Bỏ cova.mfa.gov.cn, hoặc chỉ ghi là kênh phụ cho nơi nộp được chuyển sang COVA.
2. Ngày tháng cho TQ dùng **yyyy-MM-dd** (1995-07-21). Cần thêm kiểu `ymdDash` vào `DayDate.Style`.
3. Tách ô nơi cấp thành **1.7D Issuing place** và **1.7E Issuing authority** (IMMIGRATION DEPARTMENT); thêm **1.7A Type = ORDINARY** và **1.7C Issuing country = VIET NAM**.
4. Place of birth: tách 1.4B Province / 1.4C City, bỏ "TP".
5. Thêm **1.1E Full Name in Native Alphabet = LÊ THU HÀ** (fullNameVN), ghi chú "nếu form có ô này".
6. Sắp lại thứ tự: họ → tên → (tên bản ngữ) → ngày sinh → giới tính → nước/tỉnh/thành sinh → hôn nhân → quốc tịch → căn cước → hộ chiếu (A→G) → nghề nghiệp → công ty + địa chỉ công ty → địa chỉ nhà → điện thoại → di động → email.
7. Gắn số mục (1.1A, 1.2A…) vào nhãn để người dùng dễ tìm ô. Đổi "Employer / School name" thành "Name of company/organization".
