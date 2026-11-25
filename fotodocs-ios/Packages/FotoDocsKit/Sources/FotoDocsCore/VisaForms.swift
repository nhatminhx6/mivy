import Foundation

/// One box on a visa form: its label as printed on the form, a Vietnamese hint, and how to
/// format the profile value the way that form wants it.
public struct VisaFormField: Identifiable, Sendable {
    public let id: String
    public let label: String
    public let hint: String
    public let value: @Sendable (VisaProfile) -> String

    public init(_ id: String, _ label: String, _ hint: String, _ value: @escaping @Sendable (VisaProfile) -> String) {
        self.id = id
        self.label = label
        self.hint = hint
        self.value = value
    }
}

public struct VisaFormSpec: Identifiable, Sendable {
    public let id: String          // matches VisaDestination.id in presets.json
    public let name: String
    public let flag: String
    /// Where the form is filled: shown under the country name.
    public let channel: String
    public let fields: [VisaFormField]
}

/// Personal-detail boxes of each destination's visa form, in the order they appear.
/// Only what the profile holds: trip purpose, itinerary, sponsor… stay with the applicant.
public enum VisaForms {
    public static let all: [VisaFormSpec] = [korea, japan, taiwan, china, usa, schengen, uk, australia]

    public static func spec(_ id: String) -> VisaFormSpec? { all.first { $0.id == id } }

    /// Official forms / guidance each copy table was checked against (18/11/2026), so the user can open the
    /// real form next to the app's values. First entry = the form itself when it is published.
    public static let sources: [String: [(title: String, url: String)]] = [
        "kr": [("Visa Application Form (Annex 17, rev. 2022-02-07) — visa.go.kr", "https://www.visa.go.kr/downfile/VisaapplicationForm_EN.pdf")],
        "jp": [("Visa Application Form to Enter Japan — MOFA", "https://www.mofa.go.jp/files/000124525.pdf"),
               ("Hướng dẫn visa — Tổng lãnh sự quán Nhật tại TP.HCM", "https://www.hcmcgj.vn.emb-japan.go.jp/itpr_vi/thithuc.html")],
        "tw": [("Form visa online (bước 1) — BOCA", "https://visawebapp.boca.gov.tw/BOCA_EVISA/MRV01FORM.do"),
               ("Hỏi đáp form visa online (gvisa_QA.pdf) — BOCA", "https://visawebapp.boca.gov.tw/BOCA_EVISA/csi/pdf/gvisa_QA.pdf"),
               ("Văn phòng Kinh tế - Văn hoá Đài Bắc tại Hà Nội", "https://www.roc-taiwan.org/vn_vi/post/1437.html")],
        "cn": [("Trang khai visa — Trung tâm dịch vụ visa Trung Quốc tại Hà Nội", "https://bio.visaforchina.cn/HAN3_VI/qianzhengyewu"),
               ("Thông báo khai online (25/06/2025) — Đại sứ quán Trung Quốc tại Việt Nam", "https://vn.china-embassy.gov.cn/lsyw/202506/t20250625_11658812.htm"),
               ("Hệ thống khai visa — Bộ Ngoại giao Trung Quốc", "https://consular.mfa.gov.cn/VISA/"),
               ("Hướng dẫn kèm ảnh chụp form (Trung tâm visa Jakarta, 07/2025)", "https://biohk.visaforchina.cn/JKT3_EN/upload/20250714/079419ac248d4cf7a72d8f7934871ac6.pdf")],
        "us": [("DS-160 — Consular Electronic Application Center", "https://ceac.state.gov/genniv/"),
               ("Hướng dẫn DS-160 — travel.state.gov", "https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/forms/ds-160-online-nonimmigrant-visa-application.html")],
        "schengen": [("Harmonised Schengen form — Annex I, Regulation (EU) 2019/1155 (EUR-Lex)", "https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32019R1155")],
        "uk": [("Apply for a Standard Visitor visa — gov.uk", "https://www.gov.uk/standard-visitor/apply-standard-visitor-visa"),
               ("VAF guidance notes (2014) — Home Office", "https://assets.publishing.service.gov.uk/media/5ddbbbc6ed915d015c54829b/VAF2-8b-Guidance-Notes.pdf")],
        "au": [("Form 1419 Visitor visa — Home Affairs", "https://immi.homeaffairs.gov.au/form-listing/forms/1419.pdf"),
               ("Form 1419 (2014) — Australian Embassy Chile", "https://chile.embassy.gov.au/files/scle/1419spa.pdf")],
    ]

    // MARK: Shared builders

    typealias F = VisaFormField

    private static func d(_ k: KeyPath<VisaProfile, DayDate?> & Sendable, _ style: DayDate.Style) -> @Sendable (VisaProfile) -> String {
        { $0[keyPath: k]?.formatted(style) ?? "" }
    }

    // Labels follow the official forms checked on 18/11/2026 (sources: mivy/output/visa/doi-chieu/*.md).
    private static let surname = F("surname", "Surname / Family name", "Họ (in hoa, không dấu)") { $0.surname }
    private static let given = F("given", "Given name(s)", "Tên đệm + tên") { $0.givenNames }
    private static let sex = F("sex", "Sex", "Giới tính") { $0.sex?.en ?? "" }
    private static let marital = F("marital", "Marital status", "Tình trạng hôn nhân") { $0.maritalStatus?.en ?? "" }
    private static let nationality = F("nationality", "Nationality", "Quốc tịch") { $0.nationalityEN }
    private static let birthCountry = F("birthCountry", "Country of birth", "Nước sinh") { $0.countryEN }
    /// in English: "TP Hồ Chí Minh" → "HO CHI MINH CITY" (not the Vietnamese "TP HO CHI MINH")
    private static let birthPlace = F("birthPlace", "Place of birth", "Nơi sinh") { Latin.address($0.placeOfBirth) }
    private static let nationalID = F("nationalID", "National identity number", "Số CCCD") { $0.idNumber }
    private static let passportNo = F("passportNo", "Passport number", "Số hộ chiếu") { $0.passportNumber }
    private static let issuePlace = F("issuePlace", "Place of issue / Issuing authority", "Nơi cấp hộ chiếu") { Latin.issuer($0.passportIssuePlace) }
    private static let address = F("address", "Home address", "Địa chỉ thường trú") { Latin.address($0.address) }
    private static let phone = F("phone", "Telephone / Mobile", "Số điện thoại") { $0.phone }
    private static let email = F("email", "E-mail", "Email") { $0.email }
    private static let occupation = F("occupation", "Current occupation", "Nghề nghiệp") { Latin.upper($0.occupation) }
    private static let employer = F("employer", "Employer / School name", "Nơi làm việc / học") { Latin.company($0.employer) }
    private static let employerAddress = F("employerAddress", "Employer / School address", "Địa chỉ nơi làm việc") { Latin.address($0.employerAddress) }
    private static let issueCityHint = "Thành phố nơi cấp hộ chiếu (Cục QLXNC ở Hà Nội: HA NOI; chi nhánh TP.HCM: HO CHI MINH CITY)"

    private static func dates(_ style: DayDate.Style) -> (dob: F, issue: F, expiry: F) {
        (F("dob", "Date of birth", "Ngày sinh", d(\.dateOfBirth, style)),
         F("issueDate", "Date of issue", "Ngày cấp hộ chiếu", d(\.passportIssueDate, style)),
         F("expiry", "Date of expiry", "Ngày hết hạn hộ chiếu", d(\.passportExpiry, style)))
    }

    // MARK: Countries

    /// Annex 17 visa application form, revised 2022-02-07 (visa.go.kr); dates yyyy/mm/dd as the form states.
    static let korea: VisaFormSpec = {
        let t = dates(.ymdSlash)
        return VisaFormSpec(id: "kr", name: "Hàn Quốc", flag: "🇰🇷", channel: "Form giấy nộp KVAC hoặc e-Form ở visa.go.kr", fields: [
            F("surname", "1.1 Family Name", "Họ", { $0.surname }), F("given", "1.1 Given Names", "Tên đệm + tên", { $0.givenNames }),
            F("sex", "1.3 Sex", "Giới tính", { $0.sex?.en ?? "" }), F("dob", "1.4 Date of Birth (yyyy/mm/dd)", "Ngày sinh", d(\.dateOfBirth, .ymdSlash)),
            F("nationality", "1.5 Nationality", "Quốc tịch", { $0.nationalityEN }),
            F("birthCountry", "1.6 Country of Birth", "Nước sinh", { $0.countryEN }),
            F("nationalID", "1.7 National Identity No.", "Số CCCD", { $0.idNumber }),
            F("passportType", "3.1 Passport Type", "Loại hộ chiếu: tick Regular", { _ in "REGULAR" }),
            F("passportNo", "3.2 Passport No.", "Số hộ chiếu", { $0.passportNumber }),
            F("passportCountry", "3.3 Country of Passport", "Nước cấp hộ chiếu", { $0.countryEN }),
            F("issuePlace", "3.4 Place of Issue", "Nơi cấp hộ chiếu", { Latin.issuer($0.passportIssuePlace) }),
            F("issueDate", "3.5 Date of Issue", "Ngày cấp", d(\.passportIssueDate, .ymdSlash)),
            F("expiry", "3.6 Date of Expiry", "Ngày hết hạn", d(\.passportExpiry, .ymdSlash)),
            F("address", "4.1 Home Country Address", "Địa chỉ ở Việt Nam (4.2 chỉ điền nếu đang ở chỗ khác)", { Latin.address($0.address) }),
            F("phone", "4.4 Cell Phone No.", "Số di động", { $0.phone }), F("email", "4.5 E-mail", "Email", { $0.email }),
            F("marital", "5.1 Marital Status", "Tình trạng hôn nhân: tick Married / Divorced / Single", { $0.maritalStatus?.en ?? "" }),
            F("employed", "7.1 Current Personal Circumstances", "Tick ô này (đang đi làm → Employed)", { $0.employer.isEmpty ? "" : "EMPLOYED" }),
            F("employer", "7.2 a) Name of Company/Institute/School", "Tên công ty / trường", { Latin.company($0.employer) }),
            F("occupation", "7.2 b) Position/Course", "Chức vụ / ngành học", { Latin.upper($0.occupation) }),
            F("employerAddress", "7.2 c) Address of Company/Institute/School", "Địa chỉ công ty / trường", { Latin.address($0.employerAddress) }),
        ])
    }()

    /// MOFA "Visa Application Form to Enter Japan" (mofa.go.jp/files/000124525.pdf, the file the app fills).
    static let japan: VisaFormSpec = {
        let t = dates(.dmySlash)
        return VisaFormSpec(id: "jp", name: "Nhật Bản", flag: "🇯🇵", channel: "Form giấy nộp qua đại lý được uỷ thác / VFS", fields: [
            F("surname", "Surname (as shown in passport)", "Họ", { $0.surname }),
            F("given", "Given and middle names (as shown in passport)", "Tên đệm + tên", { $0.givenNames }),
            t.dob, F("birthPlace", "Place of birth (City / State or Province / Country)", "Nơi sinh", {
                [Latin.address($0.placeOfBirth), $0.countryEN].filter { !$0.isEmpty }.joined(separator: ", ") }),
            sex, marital,
            // the same value the filled PDF prints
            F("nationality", "Nationality or citizenship", "Quốc tịch", { $0.countryEN }),
            F("nationalID", "ID No. issued to you by your government", "Số CCCD", { $0.idNumber }),
            F("passportType", "Passport type", "Loại hộ chiếu", { _ in "ORDINARY" }),
            F("passportNo", "Passport No.", "Số hộ chiếu", { $0.passportNumber }),
            F("issuePlace", "Place of issue", "Nơi cấp", { Latin.issuer($0.passportIssuePlace) }),
            t.issue, F("authority", "Issuing authority", "Cơ quan cấp", { Latin.issuer($0.passportIssuePlace) }), t.expiry,
            F("address", "Your current residential address", "Địa chỉ đang ở (đang ở chỗ khác thường trú thì ghi cả hai)", { Latin.address($0.address) }),
            F("phone", "Mobile No.", "Số di động", { $0.phone }), email,
            F("occupation", "Current profession or occupation and position", "Nghề nghiệp + chức vụ", { Latin.upper($0.occupation) }),
            F("employer", "Name of employer", "Tên nơi làm việc", { Latin.company($0.employer) }),
            F("employerAddress", "Address of employer", "Địa chỉ nơi làm việc", { Latin.address($0.employerAddress) }),
        ])
    }()

    /// BOCA online form (gvisa_QA.pdf: dates YYYY/MM/DD; nationality picked on step 1; "DOMESTIC ID No.").
    static let taiwan: VisaFormSpec = {
        let t = dates(.ymdSlash)
        return VisaFormSpec(id: "tw", name: "Đài Loan", flag: "🇹🇼", channel: "Khai online ở visawebapp.boca.gov.tw", fields: [
            F("nationality", "Nationality (step 1)", "Chọn trong danh sách ở bước 1", { $0.nationalityCode == "VNM" ? "VIET NAM, SOCIALIST REPUBLIC OF" : $0.countryEN }),
            surname, given, sex, t.dob, birthPlace, birthCountry,
            F("nationalID", "DOMESTIC ID No.", "Số CCCD", { $0.idNumber }),
            F("passportType", "Passport Type", "Loại hộ chiếu", { _ in "REGULAR" }),
            passportNo, F("issuePlace", "Place of Issue", "Nơi cấp hộ chiếu", { Latin.issuer($0.passportIssuePlace) }), t.issue, t.expiry,
            address, phone, email, marital, occupation,
            F("employer", "Name and Address of Employer or School", "Tên + địa chỉ nơi làm việc", {
                [Latin.company($0.employer), Latin.address($0.employerAddress)].filter { !$0.isEmpty }.joined(separator: ", ") }),
        ])
    }()

    /// New online system (consular.mfa.gov.cn/VISA, used through bio.visaforchina.cn since 30/06/2025):
    /// section numbers and yyyy-MM-dd dates as the form shows them.
    static let china: VisaFormSpec = {
        let t = dates(.ymdDash)
        return VisaFormSpec(id: "cn", name: "Trung Quốc", flag: "🇨🇳",
                            channel: "Khai online ở bio.visaforchina.cn (khu vực Hà Nội, Đà Nẵng; TP.HCM xem hướng dẫn của Tổng lãnh sự quán)", fields: [
            F("surname", "1.1 Surname", "Họ", { $0.surname }), F("given", "1.1 Given name(s)", "Tên đệm + tên", { $0.givenNames }),
            F("dob", "1.2 Date of birth (yyyy-MM-dd)", "Ngày sinh", t.dob.value),
            F("sex", "1.3 Sex", "Giới tính", { $0.sex?.en ?? "" }),
            F("birthCountry", "1.4A Country of birth", "Nước sinh", { $0.countryEN }),
            F("birthPlace", "1.4B–C Province / City of birth", "Tỉnh / thành nơi sinh", { Latin.address($0.placeOfBirth) }),
            F("marital", "1.5 Marital status", "Tình trạng hôn nhân", { $0.maritalStatus?.en ?? "" }),
            F("nationality", "1.6 Nationality", "Quốc tịch (chọn trong danh sách)", { $0.countryEN }),
            F("nationalID", "1.6B National identity card No.", "Số CCCD", { $0.idNumber }),
            F("passportType", "1.7A Passport type", "Loại hộ chiếu", { _ in "ORDINARY" }),
            F("passportNo", "1.7B Passport No.", "Số hộ chiếu", { $0.passportNumber }),
            F("passportCountry", "1.7C Country of issue", "Nước cấp", { $0.countryEN }),
            F("issueCity", "1.7D Issuing place", issueCityHint, { Latin.issueCity($0.passportIssuePlace) }),
            F("authority", "1.7E Issuing authority", "Cơ quan cấp", { Latin.issuer($0.passportIssuePlace) }),
            F("issueDate", "1.7F Date of issue (yyyy-MM-dd)", "Ngày cấp", t.issue.value),
            F("expiry", "1.7G Date of expiry (yyyy-MM-dd)", "Ngày hết hạn", t.expiry.value),
            F("occupation", "3.1 Current occupation", "Nghề nghiệp (chọn trong danh sách)", { Latin.upper($0.occupation) }),
            F("employer", "3.2 Employer / school", "Nơi làm việc / học", { Latin.company($0.employer) }),
            F("employerAddress", "3.2 Address of employer / school", "Địa chỉ nơi làm việc", { Latin.address($0.employerAddress) }),
            F("address", "5.1 Home address", "Địa chỉ nhà", { Latin.address($0.address) }),
            F("phone", "5.3 Mobile phone", "Số di động", { $0.phone }), F("email", "5.4 E-mail", "Email", { $0.email }),
        ])
    }()

    /// DS-160: not checked against the live form (state.gov blocks automated reading); only the clear fixes.
    static let usa: VisaFormSpec = {
        let t = dates(.dMonYDash)
        return VisaFormSpec(id: "us", name: "Mỹ", flag: "🇺🇸", channel: "Khai online DS-160 ở ceac.state.gov", fields: [
            F("surname", "Surnames", "Họ", { $0.surname }), F("given", "Given Names", "Tên đệm + tên", { $0.givenNames }),
            F("native", "Full Name in Native Alphabet", "Họ tên có dấu", { $0.fullNameVN.uppercased() }),
            sex, marital, t.dob,
            F("birthCity", "City of birth", "Tỉnh / thành nơi sinh", { Latin.address($0.placeOfBirth) }),
            birthCountry, F("nationality", "Country/Region of Origin (Nationality)", "Quốc tịch", { $0.countryEN }),
            F("nationalID", "National Identification Number", "Số CCCD", { $0.idNumber }),
            F("passportNo", "Passport/Travel Document Number", "Số hộ chiếu", { $0.passportNumber }),
            F("passportCountry", "Country/Authority that Issued Passport", "Nước cấp", { $0.countryEN }),
            F("issueCity", "City where issued", issueCityHint, { Latin.issueCity($0.passportIssuePlace) }),
            F("issueDate", "Issuance Date", "Ngày cấp", d(\.passportIssueDate, .dMonYDash)),
            F("expiry", "Expiration Date", "Ngày hết hạn", d(\.passportExpiry, .dMonYDash)),
            F("address", "Home Address", "Địa chỉ nhà", { Latin.address($0.address) }),
            F("phone", "Primary Phone Number", "Số điện thoại", { $0.phone }),
            F("email", "Email Address", "Email", { $0.email }),
            F("occupation", "Primary Occupation", "Nghề nghiệp", { Latin.upper($0.occupation) }),
            F("employer", "Present Employer or School Name", "Nơi làm việc / học", { Latin.company($0.employer) }),
            employerAddress,
        ])
    }()

    /// Harmonised Schengen form, Annex I of Regulation (EU) 2019/1155, numbered boxes.
    static let schengen: VisaFormSpec = {
        let t = dates(.dmyDash)
        return VisaFormSpec(id: "schengen", name: "Châu Âu (Schengen)", flag: "🇪🇺", channel: "Form Schengen chung, nộp ở trung tâm của nước đến", fields: [
            F("surname", "1. Surname (Family name)", "Họ", { $0.surname }),
            F("birthSurname", "2. Surname at birth (Former family name(s))", "Họ khi sinh (người Việt: giống ô 1)", { $0.surname }),
            F("given", "3. First name(s) (Given name(s))", "Tên đệm + tên", { $0.givenNames }),
            F("dob", "4. Date of birth (day-month-year)", "Ngày sinh", t.dob.value),
            F("birthPlace", "5. Place of birth", "Nơi sinh", { Latin.address($0.placeOfBirth) }),
            F("birthCountry", "6. Country of birth", "Nước sinh", { $0.countryEN }),
            F("nationality", "7. Current nationality", "Quốc tịch", { $0.nationalityEN }),
            F("sex", "8. Sex", "Giới tính", { $0.sex?.en ?? "" }),
            F("marital", "9. Civil status", "Tình trạng hôn nhân", { $0.maritalStatus?.en ?? "" }),
            F("nationalID", "11. National identity number, where applicable", "Số CCCD", { $0.idNumber }),
            F("docType", "12. Type of travel document", "Loại giấy tờ", { _ in "ORDINARY PASSPORT" }),
            F("passportNo", "13. Number of travel document", "Số hộ chiếu", { $0.passportNumber }),
            F("issueDate", "14. Date of issue", "Ngày cấp", t.issue.value),
            F("expiry", "15. Valid until", "Có giá trị đến", t.expiry.value),
            F("issuedBy", "16. Issued by (country)", "Nước cấp", { $0.countryEN }),
            F("address", "19. Applicant's home address", "Địa chỉ nhà", { Latin.address($0.address) }),
            F("email", "19. E-mail address", "Email", { $0.email }),
            F("phone", "19. Telephone no.", "Số điện thoại", { Latin.phoneIntl($0.phone) }),
            F("occupation", "21. Current occupation", "Nghề nghiệp", { Latin.upper($0.occupation) }),
            F("employer", "22. Employer and employer's address and telephone number", "Nơi làm việc + địa chỉ (+ SĐT công ty nếu có)", {
                [Latin.company($0.employer), Latin.address($0.employerAddress)].filter { !$0.isEmpty }.joined(separator: ", ") }),
        ])
    }()

    /// Online form behind gov.uk/standard-visitor (login only); checked against the Home Office VAF guidance.
    static let uk: VisaFormSpec = {
        let t = dates(.dmySlash)
        return VisaFormSpec(id: "uk", name: "Anh", flag: "🇬🇧", channel: "Khai online ở gov.uk/standard-visitor", fields: [
            F("given", "Given names", "Tên đệm + tên", { $0.givenNames }), F("surname", "Family name", "Họ", { $0.surname }),
            sex, marital, t.dob, birthPlace, birthCountry, nationality, nationalID, passportNo,
            F("issuingAuthority", "Issuing authority", "Cơ quan cấp", { Latin.issuer($0.passportIssuePlace) }),
            t.issue, t.expiry,
            F("address", "Home address", "Địa chỉ nhà (quốc gia: VIET NAM)", { Latin.address($0.address) }),
            F("phone", "Telephone number", "Số điện thoại (có mã +84)", { Latin.phoneIntl($0.phone) }),
            email, occupation, employer, employerAddress,
        ])
    }()

    /// Form 1419 (Visitor visa) question order and wording, as entered in ImmiAccount.
    static let australia: VisaFormSpec = {
        let t = dates(.dMonY)
        return VisaFormSpec(id: "au", name: "Úc", flag: "🇦🇺", channel: "Khai online ở ImmiAccount (immi.homeaffairs.gov.au)", fields: [
            F("surname", "Family name", "Họ", { $0.surname }), F("given", "Given names", "Tên đệm + tên", { $0.givenNames }),
            sex, t.dob, passportNo, F("passportCountry", "Country of passport", "Nước cấp", { $0.countryEN }),
            nationality, t.issue, t.expiry,
            F("issuePlace", "Place of issue / issuing authority", "Nơi cấp", { Latin.issuer($0.passportIssuePlace) }),
            F("birthTown", "Town / City of birth", "Tỉnh / thành nơi sinh", { Latin.address($0.placeOfBirth) }),
            birthCountry,
            F("marital", "Relationship status", "Tình trạng quan hệ", { p in
                guard let m = p.maritalStatus else { return "" }
                return m == .single ? "NEVER MARRIED OR BEEN IN A DE FACTO RELATIONSHIP" : m.en
            }),
            // Q16: other identity documents, one block per card
            F("idFamily", "National identity card: Family name", "Họ trên CCCD", { $0.idNumber.isEmpty ? "" : $0.surname }),
            F("idGiven", "National identity card: Given names", "Tên trên CCCD", { $0.idNumber.isEmpty ? "" : $0.givenNames }),
            F("nationalID", "National identity card: Identification number", "Số CCCD", { $0.idNumber }),
            F("idCountry", "National identity card: Country of issue", "Nước cấp CCCD", { $0.idNumber.isEmpty ? "" : $0.countryEN }),
            F("address", "Usual residential address", "Địa chỉ nhà (quốc gia: VIET NAM)", { Latin.address($0.address) }),
            F("phone", "Mobile phone (country code 84)", "Số di động", { Latin.phoneIntl($0.phone) }),
            email,
            F("occupation", "Position you hold", "Nghề nghiệp / chức vụ", { Latin.upper($0.occupation) }),
            employer, employerAddress,
        ])
    }()
}
