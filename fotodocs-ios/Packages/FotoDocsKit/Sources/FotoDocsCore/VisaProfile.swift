import Foundation

/// A calendar day with no time zone (dates on ID cards and passports).
public struct DayDate: Codable, Hashable, Sendable {
    public var year: Int
    public var month: Int
    public var day: Int

    public init?(year: Int, month: Int, day: Int) {
        guard (1900...2200).contains(year), (1...12).contains(month), (1...31).contains(day) else { return nil }
        var comps = DateComponents(year: year, month: month, day: day)
        comps.calendar = Calendar(identifier: .gregorian)
        guard comps.isValidDate else { return nil }
        self.year = year
        self.month = month
        self.day = day
    }

    /// "ddMMyyyy" as printed in the CCCD QR code.
    init?(ddMMyyyy s: String) {
        let d = Array(s.filter(\.isNumber))
        guard d.count == 8, let dd = Int(String(d[0..<2])), let mm = Int(String(d[2..<4])), let yy = Int(String(d[4..<8])) else { return nil }
        self.init(year: yy, month: mm, day: dd)
    }

    public enum Style: Sendable {
        case dmySlash      // 15/03/1990
        case dmyDash       // 15-03-1990
        case ymdSlash      // 1990/03/15
        case dMonY         // 15 MAR 1990
        case dMonYDash     // 15-MAR-1990
    }

    private static let months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

    public func formatted(_ style: Style) -> String {
        let d = String(format: "%02d", day), m = String(format: "%02d", month), y = String(year)
        switch style {
        case .dmySlash: return "\(d)/\(m)/\(y)"
        case .dmyDash: return "\(d)-\(m)-\(y)"
        case .ymdSlash: return "\(y)/\(m)/\(d)"
        case .dMonY: return "\(d) \(Self.months[month - 1]) \(y)"
        case .dMonYDash: return "\(d)-\(Self.months[month - 1])-\(y)"
        }
    }

    public var date: Date {
        Calendar(identifier: .gregorian).date(from: DateComponents(year: year, month: month, day: day)) ?? .now
    }

    public init(_ date: Date) {
        let c = Calendar(identifier: .gregorian).dateComponents([.year, .month, .day], from: date)
        year = c.year!
        month = c.month!
        day = c.day!
    }
}

public enum Sex: String, Codable, CaseIterable, Sendable {
    case male = "M", female = "F"
    public var vi: String { self == .male ? "Nam" : "Nữ" }
    public var en: String { self == .male ? "MALE" : "FEMALE" }
}

public enum MaritalStatus: String, Codable, CaseIterable, Sendable {
    case single, married, divorced, widowed
    public var vi: String {
        switch self {
        case .single: "Độc thân"
        case .married: "Đã kết hôn"
        case .divorced: "Ly hôn"
        case .widowed: "Goá"
        }
    }
    public var en: String { rawValue.uppercased() }
}

/// The traveller's personal details, kept only on the device. Filled from the CCCD QR code and the
/// passport MRZ, then completed by hand.
public struct VisaProfile: Codable, Equatable, Sendable {
    // name
    public var surname = ""          // Latin, upper case (passport spelling)
    public var givenNames = ""
    public var fullNameVN = ""       // with diacritics, as on the CCCD
    public var sex: Sex?
    public var dateOfBirth: DayDate?
    public var placeOfBirth = ""     // province, as on the passport
    public var maritalStatus: MaritalStatus?
    // citizen ID (CCCD)
    public var idNumber = ""
    public var oldIDNumber = ""
    public var idIssueDate: DayDate?
    public var address = ""          // permanent address, with diacritics
    // passport
    public var passportNumber = ""
    public var nationalityCode = "VNM"
    public var passportIssueDate: DayDate?
    public var passportExpiry: DayDate?
    public var passportIssuePlace = ""
    // contact & work
    public var phone = ""
    public var email = ""
    public var occupation = ""
    public var employer = ""
    public var employerAddress = ""

    public init() {}

    public var hasCCCD: Bool { !idNumber.isEmpty }
    public var hasPassport: Bool { !passportNumber.isEmpty }
    public var isEmpty: Bool { self == VisaProfile() }

    /// "NGUYEN VAN AN": passport spelling, falling back to the CCCD name without diacritics.
    public var latinFullName: String {
        let n = [surname, givenNames].filter { !$0.isEmpty }.joined(separator: " ")
        return n.isEmpty ? Latin.upper(fullNameVN) : n
    }

    public var nationalityEN: String { nationalityCode == "VNM" ? "VIETNAMESE" : nationalityCode }
    public var countryEN: String { nationalityCode == "VNM" ? "VIET NAM" : nationalityCode }

    /// Merge what the CCCD QR code holds. Names only fill in when the passport has not set them.
    public mutating func apply(_ c: CCCDInfo) {
        idNumber = c.idNumber
        if !c.oldIDNumber.isEmpty { oldIDNumber = c.oldIDNumber }
        fullNameVN = c.fullName
        if surname.isEmpty && givenNames.isEmpty {
            let parts = Latin.upper(c.fullName).split(separator: " ").map(String.init)
            surname = parts.first ?? ""
            givenNames = parts.dropFirst().joined(separator: " ")
        }
        if let s = c.sex { sex = s }
        if let d = c.dateOfBirth { dateOfBirth = d }
        if !c.address.isEmpty { address = c.address }
        if let d = c.issueDate { idIssueDate = d }
    }

    /// Merge the passport MRZ (authoritative for the Latin name, number and expiry).
    public mutating func apply(_ p: PassportMRZ) {
        surname = p.surname
        givenNames = p.givenNames
        passportNumber = p.number
        nationalityCode = p.nationality
        if let s = p.sex { sex = s }
        if let d = p.dateOfBirth { dateOfBirth = d }
        if let d = p.expiry { passportExpiry = d }
    }
}

/// Upper-case Latin without diacritics, the way visa forms want names and addresses.
public enum Latin {
    public static func upper(_ s: String) -> String {
        s.replacingOccurrences(of: "đ", with: "d").replacingOccurrences(of: "Đ", with: "D")
            .folding(options: [.diacriticInsensitive], locale: Locale(identifier: "vi_VN"))
            .uppercased()
            .split(whereSeparator: \.isWhitespace).joined(separator: " ")
    }
}

// MARK: - CCCD QR code

/// Contents of the QR code on the front of a chip-based CCCD:
/// `số CCCD|số CMND cũ|Họ tên|ngày sinh ddMMyyyy|giới tính|nơi thường trú|ngày cấp ddMMyyyy`.
public struct CCCDInfo: Equatable, Sendable {
    public var idNumber: String
    public var oldIDNumber: String
    public var fullName: String
    public var dateOfBirth: DayDate?
    public var sex: Sex?
    public var address: String
    public var issueDate: DayDate?

    public static func parse(_ payload: String) -> CCCDInfo? {
        let f = payload.trimmingCharacters(in: .whitespacesAndNewlines).components(separatedBy: "|")
        guard f.count >= 7, f[0].count == 12, f[0].allSatisfy(\.isNumber),
              f[2].contains(where: \.isLetter) else { return nil }
        let sex = Latin.upper(f[4])
        return CCCDInfo(
            idNumber: f[0],
            oldIDNumber: f[1].filter(\.isNumber),
            fullName: f[2].trimmingCharacters(in: .whitespaces),
            dateOfBirth: DayDate(ddMMyyyy: f[3]),
            sex: sex == "NAM" ? .male : (sex == "NU" ? .female : nil),
            address: f[5].trimmingCharacters(in: .whitespaces),
            issueDate: DayDate(ddMMyyyy: f[6])
        )
    }
}

// MARK: - Passport MRZ (ICAO 9303, TD3: two lines of 44)

public struct PassportMRZ: Equatable, Sendable {
    public var surname: String
    public var givenNames: String
    public var number: String
    public var nationality: String
    public var dateOfBirth: DayDate?
    public var sex: Sex?
    public var expiry: DayDate?

    public init(surname: String, givenNames: String, number: String, nationality: String,
                dateOfBirth: DayDate?, sex: Sex?, expiry: DayDate?) {
        self.surname = surname
        self.givenNames = givenNames
        self.number = number
        self.nationality = nationality
        self.dateOfBirth = dateOfBirth
        self.sex = sex
        self.expiry = expiry
    }

    /// Finds the two MRZ lines among OCR'd lines and validates the check digits
    /// (number, birth date, expiry), fixing the usual OCR letter/digit swaps in numeric fields.
    public static func parse(_ ocrLines: [String], today: Date = .now) -> PassportMRZ? {
        let lines = ocrLines.map(clean).filter { $0.count >= 40 }
        for (i, l1) in lines.enumerated() where l1.hasPrefix("P") {
            for l2 in lines.dropFirst(i + 1).prefix(2) {
                if let mrz = parse(line1: pad(l1), line2: pad(l2), today: today) { return mrz }
            }
        }
        return nil
    }

    static func parse(line1: String, line2: String, today: Date) -> PassportMRZ? {
        let a = Array(line1), b = Array(line2)
        guard a.count == 44, b.count == 44, a[0] == "P" else { return nil }
        let number = String(b[0..<9]).replacingOccurrences(of: "<", with: "")
        let fixedNumber = String(b[0..<9])
        guard check(fixedNumber, b[9]) else { return nil }
        let dob = digits(String(b[13..<19])), exp = digits(String(b[21..<27]))
        guard check(dob, digit(b[19])), check(exp, digit(b[27])) else { return nil }

        let names = String(a[5...]).components(separatedBy: "<<")
        let surname = names.first.map(spaced) ?? ""
        let given = names.dropFirst().map(spaced).filter { !$0.isEmpty }.joined(separator: " ")
        let yy = Calendar(identifier: .gregorian).component(.year, from: today) % 100
        return PassportMRZ(
            surname: surname,
            givenNames: given,
            number: number,
            nationality: String(b[10..<13]).replacingOccurrences(of: "<", with: ""),
            dateOfBirth: yymmdd(dob, century: Int(dob.prefix(2)) ?? 0 > yy ? 1900 : 2000),
            sex: b[20] == "M" ? .male : (b[20] == "F" ? .female : nil),
            expiry: yymmdd(exp, century: 2000)
        )
    }

    /// Upper case, no spaces, guillemets and look-alikes turned into "<".
    static func clean(_ s: String) -> String {
        String(s.uppercased().compactMap { ch -> Character? in
            switch ch {
            case " ", "\t": nil
            case "«", "‹", "＜", "(", "[", "{": "<"
            default: ch
            }
        })
    }

    private static func pad(_ s: String) -> String {
        s.count >= 44 ? String(s.prefix(44)) : s + String(repeating: "<", count: 44 - s.count)
    }

    private static func spaced(_ s: String) -> String {
        s.split(separator: "<").joined(separator: " ")
    }

    /// Numeric field: letters OCR often reads in place of digits.
    private static func digits(_ s: String) -> String {
        String(s.map { ch in
            switch ch {
            case "O", "Q", "D": "0"
            case "I", "L": "1"
            case "Z": "2"
            case "S": "5"
            case "B": "8"
            case "G": "6"
            default: ch
            }
        })
    }

    private static func digit(_ ch: Character) -> Character { Character(digits(String(ch))) }

    private static func value(_ ch: Character) -> Int {
        if let d = ch.wholeNumberValue { return d }
        if ch == "<" { return 0 }
        if let a = ch.asciiValue, (65...90).contains(a) { return Int(a) - 55 }
        return -1000
    }

    static func check(_ field: String, _ digit: Character) -> Bool {
        let weights = [7, 3, 1]
        let sum = field.enumerated().reduce(0) { $0 + value($1.element) * weights[$1.offset % 3] }
        guard sum >= 0, let d = digit.wholeNumberValue ?? (digit == "<" ? 0 : nil) else { return false }
        return sum % 10 == d
    }

    private static func yymmdd(_ s: String, century: Int) -> DayDate? {
        guard s.count == 6, let y = Int(s.prefix(2)), let m = Int(s.dropFirst(2).prefix(2)), let d = Int(s.suffix(2)) else { return nil }
        return DayDate(year: century + y, month: m, day: d)
    }
}
