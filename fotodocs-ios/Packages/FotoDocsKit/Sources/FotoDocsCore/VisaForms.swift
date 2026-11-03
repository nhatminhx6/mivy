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

    // MARK: Shared builders

    typealias F = VisaFormField

    private static func d(_ k: KeyPath<VisaProfile, DayDate?> & Sendable, _ style: DayDate.Style) -> @Sendable (VisaProfile) -> String {
        { $0[keyPath: k]?.formatted(style) ?? "" }
    }

    private static let surname = F("surname", "Surname / Family name", "Họ (in hoa, không dấu)") { $0.surname }
    private static let given = F("given", "Given name(s)", "Tên đệm + tên") { $0.givenNames }
    private static let sex = F("sex", "Sex", "Giới tính") { $0.sex?.en ?? "" }
    private static let marital = F("marital", "Marital status", "Tình trạng hôn nhân") { $0.maritalStatus?.en ?? "" }
    private static let nationality = F("nationality", "Nationality", "Quốc tịch") { $0.nationalityEN }
    private static let birthCountry = F("birthCountry", "Country of birth", "Nước sinh") { $0.countryEN }
    private static let birthPlace = F("birthPlace", "Place of birth", "Nơi sinh") { Latin.upper($0.placeOfBirth) }
    private static let nationalID = F("nationalID", "National identity number", "Số CCCD") { $0.idNumber }
    private static let passportNo = F("passportNo", "Passport number", "Số hộ chiếu") { $0.passportNumber }
    private static let issuePlace = F("issuePlace", "Place of issue / Issuing authority", "Nơi cấp hộ chiếu") { Latin.upper($0.passportIssuePlace) }
    private static let address = F("address", "Home address", "Địa chỉ thường trú") { Latin.upper($0.address) }
    private static let phone = F("phone", "Telephone / Mobile", "Số điện thoại") { $0.phone }
    private static let email = F("email", "E-mail", "Email") { $0.email }
    private static let occupation = F("occupation", "Current occupation", "Nghề nghiệp") { Latin.upper($0.occupation) }
    private static let employer = F("employer", "Employer / School name", "Nơi làm việc / học") { Latin.upper($0.employer) }
    private static let employerAddress = F("employerAddress", "Employer / School address", "Địa chỉ nơi làm việc") { Latin.upper($0.employerAddress) }

    private static func dates(_ style: DayDate.Style) -> (dob: F, issue: F, expiry: F) {
        (F("dob", "Date of birth", "Ngày sinh", d(\.dateOfBirth, style)),
         F("issueDate", "Date of issue", "Ngày cấp hộ chiếu", d(\.passportIssueDate, style)),
         F("expiry", "Date of expiry", "Ngày hết hạn hộ chiếu", d(\.passportExpiry, style)))
    }

    // MARK: Countries

    static let korea: VisaFormSpec = {
        let t = dates(.ymdSlash)
        return VisaFormSpec(id: "kr", name: "Hàn Quốc", flag: "🇰🇷", channel: "Form giấy nộp KVAC hoặc e-Form ở visa.go.kr", fields: [
            F("surname", "Family name", "Họ", { $0.surname }), F("given", "Given names", "Tên đệm + tên", { $0.givenNames }),
            sex, t.dob, nationality, birthCountry, nationalID,
            F("passportType", "Passport type", "Loại hộ chiếu", { _ in "REGULAR" }),
            passportNo, F("passportCountry", "Country of passport", "Nước cấp hộ chiếu", { $0.countryEN }),
            issuePlace, t.issue, t.expiry,
            F("address", "Address in home country", "Địa chỉ ở Việt Nam", { Latin.upper($0.address) }),
            F("phone", "Cell phone No.", "Số di động", { $0.phone }), email, marital,
            F("occupation", "Current job", "Nghề nghiệp", { Latin.upper($0.occupation) }),
            F("employer", "Company / Institute / School name", "Tên công ty / trường", { Latin.upper($0.employer) }),
            employerAddress,
        ])
    }()

    static let japan: VisaFormSpec = {
        let t = dates(.dmySlash)
        return VisaFormSpec(id: "jp", name: "Nhật Bản", flag: "🇯🇵", channel: "Form giấy nộp qua đại lý được uỷ thác / VFS", fields: [
            F("surname", "Surname (as shown in passport)", "Họ", { $0.surname }),
            F("given", "Given and middle names (as shown in passport)", "Tên đệm + tên", { $0.givenNames }),
            t.dob, F("birthPlace", "Place of birth (City, Country)", "Nơi sinh", { [Latin.upper($0.placeOfBirth), $0.countryEN].filter { !$0.isEmpty }.joined(separator: ", ") }),
            sex, marital, nationality,
            F("nationalID", "ID No. issued by your government", "Số CCCD", { $0.idNumber }),
            F("passportType", "Passport type", "Loại hộ chiếu", { _ in "ORDINARY" }),
            F("passportNo", "Passport No.", "Số hộ chiếu", { $0.passportNumber }),
            F("issuePlace", "Place of issue", "Nơi cấp", { Latin.upper($0.passportIssuePlace) }),
            t.issue, F("authority", "Issuing authority", "Cơ quan cấp", { Latin.upper($0.passportIssuePlace) }), t.expiry,
            F("address", "Applicant's current residential address", "Địa chỉ đang ở", { Latin.upper($0.address) }),
            F("phone", "Mobile No.", "Số di động", { $0.phone }), email,
            F("occupation", "Current profession or occupation", "Nghề nghiệp", { Latin.upper($0.occupation) }),
            F("employer", "Name of employer", "Tên nơi làm việc", { Latin.upper($0.employer) }),
            F("employerAddress", "Address of employer", "Địa chỉ nơi làm việc", { Latin.upper($0.employerAddress) }),
        ])
    }()

    static let taiwan: VisaFormSpec = {
        let t = dates(.ymdSlash)
        return VisaFormSpec(id: "tw", name: "Đài Loan", flag: "🇹🇼", channel: "Khai online ở visawebapp.boca.gov.tw", fields: [
            surname, given, sex, t.dob, birthPlace, nationality, nationalID, passportNo, issuePlace, t.issue, t.expiry,
            address, phone, email, marital, occupation, employer,
        ])
    }()

    static let china: VisaFormSpec = {
        let t = dates(.ymdSlash)
        return VisaFormSpec(id: "cn", name: "Trung Quốc", flag: "🇨🇳", channel: "Khai online COVA ở cova.mfa.gov.cn", fields: [
            surname, given, sex, t.dob, birthCountry, birthPlace, nationality, nationalID, passportNo, issuePlace, t.issue, t.expiry,
            marital, address, phone, email, occupation, employer, employerAddress,
        ])
    }()

    static let usa: VisaFormSpec = {
        let t = dates(.dMonYDash)
        return VisaFormSpec(id: "us", name: "Mỹ", flag: "🇺🇸", channel: "Khai online DS-160 ở ceac.state.gov", fields: [
            F("surname", "Surnames", "Họ", { $0.surname }), F("given", "Given Names", "Tên đệm + tên", { $0.givenNames }),
            F("native", "Full Name in Native Alphabet", "Họ tên có dấu", { $0.fullNameVN.uppercased() }),
            sex, marital, t.dob,
            F("birthCity", "City of birth", "Tỉnh / thành nơi sinh", { Latin.upper($0.placeOfBirth) }),
            birthCountry, F("nationality", "Country/Region of Origin (Nationality)", "Quốc tịch", { $0.countryEN }),
            F("nationalID", "National Identification Number", "Số CCCD", { $0.idNumber }),
            F("passportNo", "Passport/Travel Document Number", "Số hộ chiếu", { $0.passportNumber }),
            F("passportCountry", "Country/Authority that Issued Passport", "Nước cấp", { $0.countryEN }),
            F("issueCity", "City where issued", "Nơi cấp", { Latin.upper($0.passportIssuePlace) }),
            F("issueDate", "Issuance Date", "Ngày cấp", d(\.passportIssueDate, .dMonYDash)),
            F("expiry", "Expiration Date", "Ngày hết hạn", d(\.passportExpiry, .dMonYDash)),
            F("address", "Home Address", "Địa chỉ nhà", { Latin.upper($0.address) }),
            F("phone", "Primary Phone Number", "Số điện thoại", { $0.phone }),
            F("email", "Email Address", "Email", { $0.email }),
            F("occupation", "Primary Occupation", "Nghề nghiệp", { Latin.upper($0.occupation) }),
            F("employer", "Present Employer or School Name", "Nơi làm việc / học", { Latin.upper($0.employer) }),
            employerAddress,
        ])
    }()

    static let schengen: VisaFormSpec = {
        let t = dates(.dmyDash)
        return VisaFormSpec(id: "schengen", name: "Châu Âu (Schengen)", flag: "🇪🇺", channel: "Form Schengen chung, nộp ở trung tâm của nước đến", fields: [
            F("surname", "Surname (Family name)", "Họ", { $0.surname }),
            F("given", "First name(s) (Given name(s))", "Tên đệm + tên", { $0.givenNames }),
            t.dob, birthPlace, birthCountry,
            F("nationality", "Current nationality", "Quốc tịch", { $0.nationalityEN }),
            sex, F("marital", "Civil status", "Tình trạng hôn nhân", { $0.maritalStatus?.en ?? "" }),
            nationalID, F("docType", "Type of travel document", "Loại giấy tờ", { _ in "ORDINARY PASSPORT" }),
            F("passportNo", "Number of travel document", "Số hộ chiếu", { $0.passportNumber }),
            t.issue, F("expiry", "Valid until", "Có giá trị đến", d(\.passportExpiry, .dmyDash)),
            F("issuedBy", "Issued by (country)", "Nước cấp", { $0.countryEN }),
            F("address", "Applicant's home address and e-mail address", "Địa chỉ nhà", { Latin.upper($0.address) }),
            email, F("phone", "Telephone number(s)", "Số điện thoại", { $0.phone }),
            occupation, F("employer", "Employer and employer's address", "Nơi làm việc + địa chỉ", {
                [Latin.upper($0.employer), Latin.upper($0.employerAddress)].filter { !$0.isEmpty }.joined(separator: ", ")
            }),
        ])
    }()

    static let uk: VisaFormSpec = {
        let t = dates(.dmySlash)
        return VisaFormSpec(id: "uk", name: "Anh", flag: "🇬🇧", channel: "Khai online ở gov.uk/standard-visitor", fields: [
            F("given", "Given names", "Tên đệm + tên", { $0.givenNames }), F("surname", "Family name", "Họ", { $0.surname }),
            sex, marital, t.dob, birthPlace, birthCountry, nationality, nationalID, passportNo,
            F("issuingAuthority", "Issuing authority", "Cơ quan cấp", { Latin.upper($0.passportIssuePlace) }),
            t.issue, t.expiry, address, phone, email, occupation, employer, employerAddress,
        ])
    }()

    static let australia: VisaFormSpec = {
        let t = dates(.dMonY)
        return VisaFormSpec(id: "au", name: "Úc", flag: "🇦🇺", channel: "Khai online ở ImmiAccount (immi.homeaffairs.gov.au)", fields: [
            F("surname", "Family name", "Họ", { $0.surname }), F("given", "Given names", "Tên đệm + tên", { $0.givenNames }),
            sex, t.dob, passportNo, F("passportCountry", "Country of passport", "Nước cấp", { $0.countryEN }),
            nationality, t.issue, t.expiry,
            F("issuePlace", "Place of issue / issuing authority", "Nơi cấp", { Latin.upper($0.passportIssuePlace) }),
            F("nationalID", "National identity card number", "Số CCCD", { $0.idNumber }),
            F("birthTown", "Town / City of birth", "Tỉnh / thành nơi sinh", { Latin.upper($0.placeOfBirth) }),
            birthCountry, marital, address, phone, email, occupation, employer,
        ])
    }()
}
