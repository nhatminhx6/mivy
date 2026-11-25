import Foundation

// CV builder data — the same model as the Mivy web CV ("Tạo CV", web/src/lib/cv-engine.tsx): an A4 sheet
// (794×1123 at 96 dpi) = layout × palette × font, filled with the user's own text. Everything stays on device.

public struct CVJob: Codable, Equatable, Identifiable, Sendable {
    public var id = UUID()
    public var role: String
    public var org: String
    public var time: String
    /// one bullet per line (leading "- • * +" are dropped)
    public var desc: String

    public init(role: String = "", org: String = "", time: String = "", desc: String = "") {
        self.role = role; self.org = org; self.time = time; self.desc = desc
    }
    public var isShown: Bool { !role.trimmed.isEmpty || !org.trimmed.isEmpty }
}

public struct CVEdu: Codable, Equatable, Identifiable, Sendable {
    public var id = UUID()
    public var school: String
    public var degree: String
    public var time: String

    public init(school: String = "", degree: String = "", time: String = "") {
        self.school = school; self.degree = degree; self.time = time
    }
    public var isShown: Bool { !school.trimmed.isEmpty || !degree.trimmed.isEmpty }
}

public struct CVData: Codable, Equatable, Sendable {
    public var name = ""
    public var title = ""
    public var phone = ""
    public var email = ""
    public var address = ""
    public var link = ""
    public var summary = ""
    /// square JPEG (360×360), nil = initials in a circle
    public var photo: Data?
    public var jobs: [CVJob] = []
    public var edus: [CVEdu] = []
    /// comma (or newline) separated lists
    public var skills = ""
    public var langs = ""
    public var hobbies = ""

    public init() {}

    public var skillList: [String] { CVText.list(skills) }
    public var langList: [String] { CVText.list(langs) }
    public var hobbyList: [String] { CVText.list(hobbies) }
    public var shownJobs: [CVJob] { jobs.filter(\.isShown) }
    public var shownEdus: [CVEdu] { edus.filter(\.isShown) }
    public var hasSummary: Bool { !summary.trimmed.isEmpty }
    public var displayName: String { name.trimmed.isEmpty ? "Họ và tên" : name }
    /// initials of the last two words ("Trần Quốc Bảo" → "QB"), "CV" when empty
    public var initials: String {
        let s = name.trimmed.split(whereSeparator: \.isWhitespace).suffix(2).compactMap(\.first).map { String($0) }.joined().uppercased()
        return s.isEmpty ? "CV" : s
    }

    /// the web's example content (first open / "Dùng lại nội dung ví dụ")
    public static var sample: CVData {
        var d = CVData()
        d.name = "Trần Quốc Bảo"; d.title = "Chuyên viên Marketing"; d.phone = "0901 234 567"
        d.email = "quocbao.tran@gmail.com"; d.address = "Quận 3, TP. Hồ Chí Minh"; d.link = "linkedin.com/in/quocbao"
        d.summary = "4 năm kinh nghiệm marketing số cho thương hiệu bán lẻ và F&B. Mạnh về lên kế hoạch nội dung, chạy quảng cáo Facebook/TikTok và đo hiệu quả bằng số liệu."
        d.jobs = [
            CVJob(role: "Chuyên viên Marketing", org: "Công ty TNHH Bánh Mì Sài Gòn", time: "03/2023 – nay",
                  desc: "Lên kế hoạch nội dung tháng cho 3 kênh mạng xã hội\nChạy quảng cáo ngân sách 150 triệu/tháng, giảm 28% chi phí mỗi đơn\nPhối hợp ra mắt 5 sản phẩm mới"),
            CVJob(role: "Nhân viên Content", org: "Agency Sao Việt", time: "06/2021 – 02/2023",
                  desc: "Viết bài và kịch bản video ngắn cho 8 khách hàng\nQuản lý lịch đăng và báo cáo hiệu quả hằng tuần\nĐạt 1,2 triệu lượt xem cho chiến dịch Tết 2022"),
            CVJob(role: "Thực tập sinh Marketing", org: "Chuỗi cà phê Phố Xưa", time: "09/2020 – 05/2021",
                  desc: "Hỗ trợ tổ chức 4 sự kiện khai trương cửa hàng\nKhảo sát khách hàng, tổng hợp báo cáo cho trưởng phòng"),
        ]
        d.edus = [
            CVEdu(school: "Đại học Kinh tế TP.HCM", degree: "Cử nhân Marketing", time: "2017 – 2021"),
            CVEdu(school: "Google", degree: "Chứng chỉ Digital Marketing", time: "2022"),
        ]
        d.skills = "Facebook Ads, TikTok Ads, Google Analytics, Canva, Viết content, Lên kế hoạch"
        d.langs = "Tiếng Anh — IELTS 7.0"
        d.hobbies = "Chụp ảnh, chạy bộ"
        return d
    }
}

public enum CVLayout: String, Codable, CaseIterable, Identifiable, Sendable {
    case sidebar, classic, banner, timeline, split, gutter, cards, centered, bold, ats
    public var id: String { rawValue }
    public var name: String {
        switch self {
        case .sidebar: "Cột màu bên trái"
        case .classic: "Cổ điển 1 cột"
        case .banner: "Đầu trang màu"
        case .timeline: "Dòng thời gian"
        case .split: "Hai cột tối giản"
        case .gutter: "Tiêu đề lề trái"
        case .cards: "Khối thẻ"
        case .centered: "Ảnh ở giữa"
        case .bold: "Tên cỡ lớn"
        case .ats: "Gọn, chuẩn ATS"
        }
    }
    /// layouts that show the photo
    public var showsPhoto: Bool { ![.classic, .gutter, .bold, .ats].contains(self) }
}

/// accent (titles, times) / dark (columns, header bands) / soft (light fills, chips), as "#rrggbb"
public struct CVPalette: Equatable, Sendable {
    public let id: String, name: String, accent: String, dark: String, soft: String

    public static let all: [CVPalette] = [
        CVPalette(id: "navy", name: "Navy", accent: "#1f3a68", dark: "#16243f", soft: "#e8edf5"),
        CVPalette(id: "charcoal", name: "Than chì", accent: "#2b2f36", dark: "#1f2227", soft: "#eceef1"),
        CVPalette(id: "burgundy", name: "Đỏ rượu", accent: "#7a1f2b", dark: "#4a1219", soft: "#f5e9eb"),
        CVPalette(id: "blue", name: "Xanh dương", accent: "#2457c5", dark: "#173a85", soft: "#e7eefb"),
        CVPalette(id: "brown", name: "Nâu cà phê", accent: "#8a5a2b", dark: "#4b3017", soft: "#f6eee4"),
    ]

    /// a picked colour → the full set: accent 10% toward black, dark 35% toward black, soft 90% toward white
    public static func custom(_ hex: String) -> CVPalette? {
        guard CVColor.isHex(hex) else { return nil }
        return CVPalette(id: "custom", name: "Màu khác", accent: CVColor.mix(hex, "#000000", 0.1),
                         dark: CVColor.mix(hex, "#000000", 0.35), soft: CVColor.mix(hex, "#ffffff", 0.9))
    }
}

public enum CVFontChoice: String, Codable, CaseIterable, Identifiable, Sendable {
    case vietnam, montserrat, playfair, lora
    public var id: String { rawValue }
    public var name: String {
        switch self {
        case .vietnam: "Hiện đại"
        case .montserrat: "Mạnh mẽ"
        case .playfair: "Thanh lịch"
        case .lora: "Cổ điển"
        }
    }
}

public struct CVSpec: Codable, Equatable, Sendable {
    public var layout: CVLayout = .sidebar
    /// a palette id, or "custom" (then `color` is used)
    public var palette = "navy"
    public var font: CVFontChoice = .vietnam
    public var color: String?

    public init() {}

    public var resolvedPalette: CVPalette {
        if palette == "custom", let c = color, let p = CVPalette.custom(c) { return p }
        return CVPalette.all.first { $0.id == palette } ?? CVPalette.all[0]
    }
}

public enum CVColor {
    public static func isHex(_ s: String) -> Bool {
        s.count == 7 && s.hasPrefix("#") && s.dropFirst().allSatisfy(\.isHexDigit)
    }
    public static func rgb(_ hex: String) -> (r: Int, g: Int, b: Int) {
        let v = Int(hex.dropFirst(), radix: 16) ?? 0
        return ((v >> 16) & 255, (v >> 8) & 255, v & 255)
    }
    /// t = 0 keeps `hex`, t = 1 gives `to`
    public static func mix(_ hex: String, _ to: String, _ t: Double) -> String {
        let a = rgb(hex), b = rgb(to)
        func ch(_ x: Int, _ y: Int) -> Int { Int((Double(x) * (1 - t) + Double(y) * t).rounded()) }
        return String(format: "#%02x%02x%02x", ch(a.r, b.r), ch(a.g, b.g), ch(a.b, b.b))
    }
}

public enum CVText {
    /// comma / newline separated → trimmed, non-empty items
    public static func list(_ s: String) -> [String] {
        s.split(whereSeparator: { $0 == "," || $0 == "\n" }).map { $0.trimmed }.filter { !$0.isEmpty }
    }
    /// one bullet per line, leading "- • * +" dropped
    public static func lines(_ s: String) -> [String] {
        s.split(separator: "\n", omittingEmptySubsequences: false).map { line -> String in
            var t = Substring(line.trimmed)
            if let f = t.first, "-•*+".contains(f) { t = t.dropFirst() }
            return String(t).trimmed
        }.filter { !$0.isEmpty }
    }
}

/// Everything the editor keeps (saved as one JSON on the device).
public struct CVDocument: Codable, Equatable, Sendable {
    public var spec = CVSpec()
    public var data = CVData.sample
    public init() {}
}

extension StringProtocol {
    var trimmed: String { trimmingCharacters(in: .whitespacesAndNewlines) }
}
