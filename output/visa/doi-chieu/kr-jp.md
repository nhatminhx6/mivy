# Đối chiếu bảng copy visa — Hàn Quốc & Nhật Bản

Hồ sơ thử: Lê Thu Hà (hộ chiếu C7654321, sinh 21/07/1995, nữ, CCCD 079195004321).
Đầu vào: `output/visa/1-kr/bang-copy.txt`, `output/visa/2-jp/bang-copy.txt`, `VisaForms.swift`, `JapanVisaPDF.swift`, `output/visa/2-jp/JapanVisaForm_LE.pdf` (+ ảnh render trang 1).
Ngày đối chiếu: 18/11/2026.

---

## 1. Hàn Quốc

### Nguồn
- **Chính (bản hiện hành):** 출입국관리법 시행규칙 [별지 제17호서식] <개정 2022. 2. 7.> 사증발급신청서 / VISA APPLICATION FORM, Korea Visa Portal: https://www.visa.go.kr/downfile/VisaapplicationForm_EN.pdf (PDF 5 trang, tạo 2023-06-19, nguồn Bộ Pháp chế). Đã lưu: `form-goc/kr-visa.go.kr-VisaapplicationForm_EN.pdf`.
- **Phụ:** bản Word do ĐSQ Hàn tại Việt Nam đăng: https://overseas.mofa.go.kr/upload/cntnts/vn-vi/Mau_don_xin_cap_visa.docx (Annex 17, file tạo 27/08/2015, tức **bản cũ trước sửa đổi 2022**: số mục và vài nhãn khác, ví dụ 5.1 ghi "Never married" thay vì "Single"). Đã lưu: `form-goc/kr-vn-Mau_don_xin_cap_visa.docx`.
- `form-goc/kr-visa.go.kr-CcviApplicationForm.pdf` là Annex 21 (xin Giấy xác nhận cấp visa), **không phải** form visa. Chỉ để tham khảo, không dùng để đối chiếu.
- KVAC Việt Nam không đăng form riêng. Form được tạo từ e-Form trên visa.go.kr, hoặc dùng bản giấy Annex 17 như trên.

Form ghi rõ định dạng ngày **yyyy/mm/dd** ở mục 1.4. Ở 3.5/3.6 form không ghi định dạng. Toàn bộ form phải viết "in block letters either in English or Korean". Giới tính, loại hộ chiếu, hôn nhân và nghề nghiệp (7.1) là **ô tick**, không phải ô chữ.

### Bảng đối chiếu

| Ô trên app | Ô trên form gốc (số) | App ghi | Form yêu cầu | Kết luận | Nguồn |
|---|---|---|---|---|---|
| Family name | 1.1 Family Name | LE | Tên như hộ chiếu, chữ in | ĐÚNG | Annex 17 (2022) tr.1 |
| Given names | 1.1 Given Names | THU HA | như trên | ĐÚNG | nt |
| Sex | 1.3 Sex: Male[ ] / Female[ ] | FEMALE | tick Female | ĐÚNG (là ô tick) | nt |
| Date of birth | 1.4 Date of Birth (yyyy/mm/dd) | 1995/07/21 | yyyy/mm/dd | ĐÚNG | nt |
| Nationality | 1.5 Nationality | VIETNAMESE | Form không quy định cách ghi | CHƯA CHẮC: không có hướng dẫn chính thức giữa "VIETNAMESE" và "VIET NAM" | nt |
| Country of birth | 1.6 Country of Birth | VIET NAM | Tên nước | ĐÚNG | nt |
| National identity number | 1.7 National Identity No. | 079195004321 | Số giấy tờ quốc gia | ĐÚNG | nt |
| Passport type | 3.1 Passport Type: Regular[ ] | REGULAR | tick Regular | ĐÚNG | Annex 17 tr.2 |
| Passport number | 3.2 Passport No. | C7654321 | | ĐÚNG | nt |
| Country of passport | 3.3 Country of Passport | VIET NAM | | ĐÚNG | nt |
| Place of issue / Issuing authority | 3.4 **Place of Issue** | IMMIGRATION DEPARTMENT | Nhãn trên form chỉ ghi "Place of Issue". Form không có ô "Issuing authority" | LỆCH (nhãn). Giá trị: CHƯA CHẮC, vì không có hướng dẫn nên ghi cơ quan (như mục Nơi cấp trên hộ chiếu VN) hay ghi thành phố | nt |
| Date of issue | 3.5 Date of Issue | 2021/08/10 | Form không ghi định dạng | ĐÚNG (dùng yyyy/mm/dd giống 1.4) | nt |
| Date of expiry | 3.6 Date Of Expiry | 2031/08/10 | nt | ĐÚNG | nt |
| Address in home country | 4.1 **Home Country Address of the applicant** | 45 NGUYEN HUE, BEN NGHE WARD, DISTRICT 1, HO CHI MINH CITY | Tiếng Anh/Hàn, chữ in | LỆCH nhẹ (nhãn theo bản 2015 "Address in Your Home Country"). Giá trị ĐÚNG | Annex 17 2022 so với docx 2015 |
| (không có) | 4.2 Current Residential Address (chỉ ghi nếu khác 4.1) | — | Ghi khi địa chỉ đang ở khác địa chỉ thường trú | CHƯA CHẮC: hồ sơ chỉ có 1 địa chỉ (thường trú theo CCCD). Nên nhắc người dùng | nt |
| Cell phone No. | 4.3 Cell Phone No. hoặc Telephone No. | 0912 345 678 | Form không quy định định dạng | CHƯA CHẮC: không ghi mã nước (+84). Form không yêu cầu | nt |
| E-mail | 4.4 E-mail | thuha.le@gmail.com | | ĐÚNG | nt |
| Marital status | 5.1 Current Marital Status: Married / Divorced / **Single** | SINGLE | tick 1 trong 3 ô | ĐÚNG. Lưu ý: form **không có ô Widowed**. Hồ sơ góa thì app sẽ ra "WIDOWED" mà không có ô nào để tick (CHƯA CHẮC cách xử lý) | Annex 17 tr.2 |
| Current job | 7.1 "Current personal circumstances" (**ô tick**: Entrepreneur / Self-Employed / Civil Servant / Student / Employed / Retired / Unemployed / Other) **và** 7.2 b) Position/Course | ACCOUNTANT | Form không có ô chữ "Current job". 7.1 là tick, chức danh ghi ở 7.2 b) | LỆCH | Annex 17 tr.3 |
| Company / Institute / School name | 7.2 a) Name of Company/Institute/School | PHO XUA COMPANY LIMITED | | ĐÚNG | nt |
| Employer / School address | 7.2 c) **Address of Company/Institute/School** | 12 LE LOI, DISTRICT 1, HO CHI MINH CITY | | LỆCH nhẹ (nhãn). Giá trị ĐÚNG | nt |
| Thứ tự | 1.1→1.7, 3.1→3.6, 4.1, 4.3, 4.4, 5.1, 7.x | | | ĐÚNG, trừ "Current job" đứng trước 7.2 a). Trên form, chức danh (7.2 b) nằm **giữa** tên công ty (a) và địa chỉ (c) | nt |

- THIẾU: không có. Form Hàn không có ô Nơi sinh (chỉ có 1.6 Nước sinh) nên app bỏ Nơi sinh là đúng. 1.2 là tên chữ Hán, không áp dụng.
- THỪA: không có hàng thừa hẳn. "Current job" là hàng sai chỗ (xem trên).

### Cần sửa (Hàn)
1. `korea` → `occupation`: đổi nhãn thành **"7.2 b) Position/Course"**, chuyển xuống sau `employer`. Thêm 1 dòng gợi ý cho 7.1: tick "Employed / Self-Employed / Student…". Có thể suy ra "Employed" khi có employer. Không còn ô chữ "Current job".
2. `issuePlace` (Hàn): nhãn → **"Place of Issue"** (bỏ "/ Issuing authority").
3. `address` (Hàn): nhãn → **"Home Country Address"**. Thêm gợi ý: "4.2 Current Residential Address chỉ ghi nếu đang ở chỗ khác".
4. `employerAddress` (Hàn): nhãn → **"Address of Company/Institute/School"**.
5. Có thể đánh số mục form vào nhãn (1.1, 1.3…, 7.2 c) cho dễ dò. Hôn nhân "góa" không có ô trên form Hàn nên cần xử lý riêng (chưa có nguồn chính thức nói phải ghi thế nào).

---

## 2. Nhật Bản

### Nguồn
- **Form:** MOFA "VISA APPLICATION FORM TO ENTER JAPAN" (tiếng Anh), link từ https://www.mofa.go.jp/j_info/visit/visa/index.html → https://www.mofa.go.jp/files/000124525.pdf (Last-Modified 23/10/2026, 273.622 byte, SHA-1 `462168a9…84bf`). **Trùng từng byte với file app đang bundle** (`japan-visa-form.pdf`, LiveCycle, tạo 08/02/2023, sửa 16/03/2023). Đã lưu: `form-goc/jp-mofa-000124525.pdf`.
- TLSQ Nhật tại TP.HCM (https://www.hcmcgj.vn.emb-japan.go.jp/itpr_vi/thithuc.html) dẫn "Mẫu Đơn xin visa" tới đúng file MOFA trên.
- ĐSQ Nhật tại VN (https://www.vn.emb-japan.go.jp/itpr_ja/VN_SVisaTOUR.html, 17/01/2024) có hai file: "Mẫu tờ khai xin visa" (files/100475031.pdf) và **"Điểm lưu ý khi điền"** (files/100415806.pdf, 3 MB). **Chưa đọc được** hai file này: domain emb-japan.go.jp trả 403 với curl/WebFetch, và lệnh tải qua trình duyệt bị chặn quyền. Vì vậy mọi kết luận về định dạng chỉ dựa trên chữ in trên form MOFA. Những điểm form không ghi rõ được để CHƯA CHẮC.

Form in sẵn định dạng ngày **(Day)/(Month)/(Year)** cho ngày sinh, ngày cấp và ngày hết hạn. Nơi sinh chia 3 cột **(City) (State or Province) (Country)**. Giới tính, hôn nhân (Single / Married / Widowed / Divorced) và loại hộ chiếu là ô tick.

### Bảng đối chiếu (bảng copy + PDF app tự điền)

| Ô trên app | Ô trên form gốc | App ghi | Form yêu cầu | Kết luận | Nguồn |
|---|---|---|---|---|---|
| Surname (as shown in passport) | Surname (as shown in passport) | LE | như hộ chiếu | ĐÚNG (PDF đúng ô) | MOFA form tr.1 |
| Given and middle names | Given and middle names (as shown in passport) | THU HA | | ĐÚNG | nt |
| Date of birth | Date of birth (Day)/(Month)/(Year) | 21/07/1995 | DD/MM/YYYY | ĐÚNG | nt |
| Place of birth (City, Country) | Place of birth (City) (State or Province) (Country) | Bảng copy: "TP HO CHI MINH, VIET NAM". PDF: "TP HO CHI MINH" dưới (City), "VIET NAM" dưới (Country) | 3 cột City / State or Province / Country | LỆCH nhẹ (nhãn thiếu cột State or Province). Giá trị CHƯA CHẮC: "TP" là viết tắt tiếng Việt, trong khi app ghi "HO CHI MINH CITY" ở ô địa chỉ. Với nơi sinh là **tỉnh** (vd. NGHE AN), code luôn đặt vào cột (City) dù form có cột (State or Province) | nt; `JapanVisaPDF.birthTexts` |
| Sex | Sex: Male / Female | FEMALE | tick | ĐÚNG (PDF tick Female, state 1 ở x=171 cạnh nhãn Female) | nt |
| Marital status | Marital status: Single / Married / Widowed / Divorced | SINGLE | tick | ĐÚNG. Đã kiểm tra mapping state: 0 Single, 1 Married, 3 Widowed (x=457), 2 Divorced (x=523), khớp code | nt |
| Nationality | **Nationality or citizenship** | Bảng copy: **VIETNAMESE**. PDF: **VIET NAM** | Form không quy định | LỆCH nhẹ (nhãn). Giá trị CHƯA CHẮC, nhưng **bảng copy và PDF tự mâu thuẫn** | nt; `VisaForms.japan` dùng `nationalityEN`, `JapanVisaPDF` dùng `countryEN` |
| ID No. issued by your government | ID No. issued **to you** by your government | 079195004321 | | ĐÚNG (nhãn thiếu "to you", vẫn dễ tìm) | nt |
| Passport type | Passport type: Diplomatic / Official / Ordinary / Other | ORDINARY | tick | ĐÚNG (PDF tick state 2 = Ordinary) | nt |
| Passport No. | Passport No. | C7654321 | | ĐÚNG | nt |
| Place of issue | Place of issue | IMMIGRATION DEPARTMENT | Form tách "Place of issue" với "Issuing authority" | CHƯA CHẮC: app ghi giống hệt 2 ô. Chưa đọc được "Điểm lưu ý khi điền" của ĐSQ để biết ô này ghi thành phố hay ghi theo mục "Nơi cấp" trên hộ chiếu | nt |
| Date of issue | Date of issue (Day)/(Month)/(Year) | 10/08/2021 | DD/MM/YYYY | ĐÚNG | nt |
| Issuing authority | Issuing authority | IMMIGRATION DEPARTMENT | | ĐÚNG (bản tiếng Anh tên cơ quan) | nt |
| Date of expiry | Date of expiry (Day)/(Month)/(Year) | 10/08/2031 | DD/MM/YYYY | ĐÚNG | nt |
| Applicant's current residential address | **Your** current residential address → Address (có nhiều địa chỉ thì ghi hết) | 45 NGUYEN HUE, … HO CHI MINH CITY | Địa chỉ **đang ở** | LỆCH nhẹ (nhãn). Giá trị CHƯA CHẮC: app lấy địa chỉ thường trú trên CCCD, form hỏi chỗ đang ở | nt |
| (không có) | → Tel. (điện thoại nhà) | — | | Không có dữ liệu, bỏ trống là đúng | nt |
| Mobile No. | → Mobile No. | 0912 345 678 | | ĐÚNG (định dạng số: CHƯA CHẮC, form không quy định) | nt |
| E-mail | → E-Mail | thuha.le@gmail.com | | ĐÚNG | nt |
| Current profession or occupation | Current profession or occupation **and position** | ACCOUNTANT | nghề và chức vụ | ĐÚNG (nhãn thiếu "and position") | nt |
| Name of employer | Name and address of employer → Name | PHO XUA COMPANY LIMITED | | ĐÚNG | nt |
| Address of employer | → Address | 12 LE LOI, DISTRICT 1, HO CHI MINH CITY | | ĐÚNG | nt |
| Thứ tự | | | | ĐÚNG, trùng thứ tự in trên form | nt |

- **PDF tự điền:** đã soi ảnh render trang 1. Mọi giá trị nằm đúng ô, đúng dòng kẻ, ngày đúng DD/MM/YYYY, tick đúng ô. Không có ô nào bỏ trống trong khi hồ sơ có dữ liệu. Các ô còn trống (Other names, Former nationalities, Tel. nhà, Tel. công ty, phần chuyến đi, trang 2) đều là dữ liệu hồ sơ không có. (Ảnh thẻ trong file mẫu là ảnh nam stock, chỉ là dữ liệu test.)
- THIẾU: không có.
- THỪA: không có.

### Cần sửa (Nhật)
1. **Thống nhất quốc tịch** giữa bảng copy và PDF: `VisaForms.japan` (`nationality` → `nationalityEN` = VIETNAMESE) đang khác `JapanVisaPDF.texts` `T50[0]` (`countryEN` = VIET NAM). Chọn 1 cách cho cả hai, và đổi nhãn thành **"Nationality or citizenship"**.
2. **Nơi sinh:** đổi nhãn thành "Place of birth (City / State or Province / Country)". Đổi "TP HO CHI MINH" thành "HO CHI MINH CITY" cho khớp `Latin.address`. Trong PDF, tên **tỉnh** nên đặt ở cột (State or Province) thay vì (City).
3. Nhãn: "ID No. issued to you by your government", "Your current residential address", "Current profession or occupation and position". Thêm gợi ý "ghi địa chỉ đang ở, nếu khác thường trú thì ghi cả hai".
4. **Place of issue:** cần đọc file "Điểm lưu ý khi điền" của ĐSQ (vn.emb-japan.go.jp/files/100415806.pdf) để chốt. Hiện app ghi trùng Issuing authority.
