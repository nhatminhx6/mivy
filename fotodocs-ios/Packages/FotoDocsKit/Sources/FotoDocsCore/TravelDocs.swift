import Foundation

// MARK: - Travel itinerary

/// Day-by-day plan the consulates ask for (Date · Action plan · Contact · Accommodation), in English.
public struct Itinerary: Codable, Equatable, Sendable {
    public struct Day: Codable, Equatable, Sendable, Identifiable {
        public var id = UUID()
        public var date: DayDate
        public var plan = ""
        public var contact = ""
        public var accommodation = ""

        public init(date: DayDate) { self.date = date }
    }

    public var destination = ""
    public var days: [Day] = []

    public init() {}

    /// One row per day from `start` to `end` (inclusive), keeping what was typed for days already there.
    public mutating func setDates(from start: DayDate, to end: DayDate) {
        let cal = Calendar(identifier: .gregorian)
        guard start.date <= end.date else { return }
        var out: [Day] = []
        var d = start.date
        while d <= end.date, out.count < 92 {
            let day = DayDate(d)
            out.append(days.first { $0.date == day } ?? Day(date: day))
            d = cal.date(byAdding: .day, value: 1, to: d)!
        }
        days = out
    }

    /// Empty accommodation / contact cells take the value from the day before (same hotel).
    public var filledDown: [Day] {
        var out = days
        for i in out.indices.dropFirst() {
            if out[i].accommodation.isEmpty { out[i].accommodation = out[i - 1].accommodation }
            if out[i].contact.isEmpty { out[i].contact = out[i - 1].contact }
        }
        return out
    }
}

// MARK: - Reference translations

/// A Vietnamese document re-typed in English for a visa file (to be certified by a notary afterwards).
public struct TranslationTemplate: Identifiable, Sendable {
    public enum Kind: Sendable {
        case text, name, date, multiline
    }

    public struct Field: Identifiable, Sendable {
        public let id: String
        public let vi: String
        public let en: String
        public let kind: Kind
        public let placeholder: String
        public let prefill: (@Sendable (VisaProfile) -> String)?

        init(_ id: String, _ vi: String, _ en: String, _ kind: Kind = .text, placeholder: String = "",
             prefill: (@Sendable (VisaProfile) -> String)? = nil) {
            self.id = id
            self.vi = vi
            self.en = en
            self.kind = kind
            self.placeholder = placeholder
            self.prefill = prefill
        }
    }

    public struct Section: Sendable {
        public let title: String?
        public let fields: [Field]
    }

    public let id: String
    public let nameVi: String
    public let titleEn: String
    /// Letter written by the applicant's side (employment letter) rather than a translated state record.
    public let isLetter: Bool
    public let sections: [Section]

    public var fields: [Field] { sections.flatMap(\.fields) }

    /// What goes on the page: names upper case without diacritics, dates as typed.
    public static func output(_ value: String, kind: Kind) -> String {
        switch kind {
        case .name: Latin.upper(value)
        default: value.trimmingCharacters(in: .whitespacesAndNewlines)
        }
    }

    // MARK: Templates

    public static let all: [TranslationTemplate] = [birth, residence, employment]

    private typealias F = Field
    private static func dmy(_ d: DayDate?) -> String { d?.formatted(.dmySlash) ?? "" }

    public static let birth = TranslationTemplate(id: "birth", nameVi: "Giấy khai sinh", titleEn: "BIRTH CERTIFICATE", isLetter: false, sections: [
        Section(title: nil, fields: [
            F("no", "Số", "No."), F("book", "Quyển số", "Book No."),
        ]),
        Section(title: "Child", fields: [
            F("name", "Họ, chữ đệm, tên", "Full name", .name, prefill: { $0.fullNameVN.isEmpty ? $0.latinFullName : $0.fullNameVN }),
            F("dob", "Ngày, tháng, năm sinh", "Date of birth", .date, placeholder: "15/03/1990", prefill: { dmy($0.dateOfBirth) }),
            F("sex", "Giới tính", "Sex", placeholder: "Male / Female", prefill: { $0.sex.map { $0 == .male ? "Male" : "Female" } ?? "" }),
            F("ethnic", "Dân tộc", "Ethnicity", placeholder: "Kinh"),
            F("nationality", "Quốc tịch", "Nationality", placeholder: "Vietnamese", prefill: { _ in "Vietnamese" }),
            F("pob", "Nơi sinh", "Place of birth", .multiline, placeholder: "Tu Du Hospital, Ho Chi Minh City", prefill: { Latin.upper($0.placeOfBirth) }),
            F("origin", "Quê quán", "Native place", placeholder: "Nam Dinh Province"),
            F("pid", "Số định danh cá nhân", "Personal identification number", prefill: { $0.idNumber }),
        ]),
        Section(title: "Mother", fields: [
            F("mName", "Họ, chữ đệm, tên người mẹ", "Full name", .name),
            F("mYob", "Năm sinh", "Year of birth", placeholder: "1965"),
            F("mEthnic", "Dân tộc", "Ethnicity", placeholder: "Kinh"),
            F("mNat", "Quốc tịch", "Nationality", placeholder: "Vietnamese"),
            F("mRes", "Nơi cư trú", "Place of residence", .multiline),
        ]),
        Section(title: "Father", fields: [
            F("fName", "Họ, chữ đệm, tên người cha", "Full name", .name),
            F("fYob", "Năm sinh", "Year of birth", placeholder: "1962"),
            F("fEthnic", "Dân tộc", "Ethnicity", placeholder: "Kinh"),
            F("fNat", "Quốc tịch", "Nationality", placeholder: "Vietnamese"),
            F("fRes", "Nơi cư trú", "Place of residence", .multiline),
        ]),
        Section(title: "Registration", fields: [
            F("regPlace", "Nơi đăng ký khai sinh", "Place of registration", placeholder: "People's Committee of Ben Nghe Ward, District 1, HCMC"),
            F("regDate", "Ngày đăng ký", "Date of registration", .date, placeholder: "20/03/1990"),
            F("signer", "Người ký", "Signed by", placeholder: "NGUYEN VAN B, Chairman"),
        ]),
    ])

    public static let residence = TranslationTemplate(id: "residence", nameVi: "Xác nhận thông tin cư trú (CT07)", titleEn: "CONFIRMATION OF RESIDENCE INFORMATION", isLetter: false, sections: [
        Section(title: nil, fields: [
            F("issuer", "Cơ quan cấp", "Issued by", placeholder: "Police of Ben Nghe Ward, District 1, HCMC"),
            F("no", "Số", "No."),
        ]),
        Section(title: "Citizen", fields: [
            F("name", "Họ, chữ đệm và tên", "Full name", .name, prefill: { $0.fullNameVN.isEmpty ? $0.latinFullName : $0.fullNameVN }),
            F("dob", "Ngày, tháng, năm sinh", "Date of birth", .date, placeholder: "15/03/1990", prefill: { dmy($0.dateOfBirth) }),
            F("sex", "Giới tính", "Sex", placeholder: "Male / Female", prefill: { $0.sex.map { $0 == .male ? "Male" : "Female" } ?? "" }),
            F("pid", "Số định danh cá nhân", "Personal identification number", prefill: { $0.idNumber }),
            F("ethnic", "Dân tộc", "Ethnicity", placeholder: "Kinh"),
            F("religion", "Tôn giáo", "Religion", placeholder: "None"),
            F("nationality", "Quốc tịch", "Nationality", prefill: { _ in "Vietnamese" }),
            F("origin", "Quê quán", "Native place"),
            F("permanent", "Nơi thường trú", "Permanent residence", .multiline, prefill: { Latin.upper($0.address) }),
            F("current", "Nơi ở hiện tại", "Current residence", .multiline, prefill: { Latin.upper($0.address) }),
        ]),
        Section(title: "Household", fields: [
            F("head", "Họ tên chủ hộ", "Head of household", .name),
            F("relation", "Quan hệ với chủ hộ", "Relationship to head of household", placeholder: "Son / Daughter / Wife / Self"),
            F("members", "Thành viên khác (mỗi người 1 dòng)", "Other household members", .multiline,
              placeholder: "NGUYEN THI C – 01/02/1965 – Mother"),
        ]),
        Section(title: nil, fields: [
            F("date", "Ngày cấp", "Date of issue", .date),
            F("signer", "Người ký", "Signed by", placeholder: "Major TRAN VAN D, Head of Police"),
        ]),
    ])

    public static let employment = TranslationTemplate(id: "employment", nameVi: "Xác nhận công tác + đồng ý nghỉ phép", titleEn: "CERTIFICATE OF EMPLOYMENT AND LEAVE APPROVAL", isLetter: true, sections: [
        Section(title: "Company", fields: [
            F("company", "Tên công ty", "Company", .name, prefill: { $0.employer }),
            F("companyAddress", "Địa chỉ công ty", "Address", .multiline, prefill: { Latin.upper($0.employerAddress) }),
            F("companyPhone", "Điện thoại công ty", "Telephone"),
        ]),
        Section(title: "This is to certify that", fields: [
            F("name", "Họ tên nhân viên", "Full name", .name, prefill: { $0.latinFullName }),
            F("dob", "Ngày sinh", "Date of birth", .date, prefill: { dmy($0.dateOfBirth) }),
            F("passport", "Số hộ chiếu", "Passport No.", prefill: { $0.passportNumber }),
            F("position", "Chức vụ (tiếng Anh)", "Position", placeholder: "Software Engineer"),
            F("since", "Làm việc từ ngày", "Employed since", .date, placeholder: "01/06/2019"),
            F("salary", "Lương tháng", "Monthly salary", placeholder: "25,000,000 VND"),
        ]),
        Section(title: "Leave approval", fields: [
            F("leaveFrom", "Nghỉ phép từ ngày", "Leave from", .date, placeholder: "10/04/2027"),
            F("leaveTo", "Đến ngày", "Leave until", .date, placeholder: "17/04/2027"),
            F("purpose", "Mục đích chuyến đi", "Purpose of trip", placeholder: "Tourism in Japan"),
            F("note", "Ghi chú", "Note", .multiline,
              placeholder: "His/her position will be kept and he/she will return to work on 18/04/2027."),
        ]),
        Section(title: "Signed by", fields: [
            F("signer", "Người ký (tiếng Anh)", "Name and title", placeholder: "TRAN VAN E, Director"),
            F("date", "Ngày ký", "Date", .date),
        ]),
    ])
}
