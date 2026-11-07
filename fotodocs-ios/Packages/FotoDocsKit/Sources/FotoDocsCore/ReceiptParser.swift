import Foundation
import CoreGraphics

/// One line of OCR text with its box in normalised top-left coordinates (0…1).
public struct OCRLine: Sendable, Equatable {
    public var text: String
    public var box: CGRect

    public init(_ text: String, box: CGRect) {
        self.text = text
        self.box = box
    }
}

public enum ExpenseCategory: String, CaseIterable, Codable, Sendable {
    case travel = "Đi lại"
    case lodging = "Lưu trú"
    case meal = "Ăn uống"
    case client = "Tiếp khách"
    case other = "Khác"

    public var icon: String {
        switch self {
        case .travel: "car.fill"
        case .lodging: "bed.double.fill"
        case .meal: "fork.knife"
        case .client: "person.2.fill"
        case .other: "tag.fill"
        }
    }
}

public struct ParsedReceipt: Equatable, Sendable {
    public var vendor: String?
    public var date: Date?
    /// VND, whole đồng.
    public var amount: Int?
    public var category: ExpenseCategory

    public init(vendor: String? = nil, date: Date? = nil, amount: Int? = nil, category: ExpenseCategory = .other) {
        self.vendor = vendor
        self.date = date
        self.amount = amount
        self.category = category
    }
}

/// Pulls vendor, date, total and a category guess out of OCR'd receipt lines
/// (thermal bills, Grab/taxi receipts, Vietnamese e-invoices). Heuristic: the user checks the result.
public enum ReceiptParser {
    public static func parse(_ lines: [OCRLine], today: Date = .now, calendar: Calendar = .current) -> ParsedReceipt {
        let rows = group(lines)
        let folded = rows.map(fold)
        return ParsedReceipt(
            vendor: vendor(rows, folded),
            date: date(folded, today: today, calendar: calendar),
            amount: total(rows, folded),
            category: category(folded.joined(separator: " "))
        )
    }

    // MARK: Rows

    /// Joins boxes that sit on the same visual row (left → right), top → bottom.
    public static func group(_ lines: [OCRLine]) -> [String] {
        let sorted = lines.filter { !$0.text.trimmingCharacters(in: .whitespaces).isEmpty }.sorted { $0.box.midY < $1.box.midY }
        var rows: [[OCRLine]] = []
        for line in sorted {
            if let last = rows.last, let ref = last.first,
               abs(line.box.midY - ref.box.midY) < min(line.box.height, ref.box.height) * 0.6 {
                rows[rows.count - 1].append(line)
            } else {
                rows.append([line])
            }
        }
        return rows.map { $0.sorted { $0.box.minX < $1.box.minX }.map(\.text).joined(separator: " ") }
    }

    /// Lower-case, no diacritics, đ → d.
    public static func fold(_ s: String) -> String {
        s.replacingOccurrences(of: "đ", with: "d").replacingOccurrences(of: "Đ", with: "d")
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "vi_VN"))
    }

    // MARK: Amount

    private static let strongKeys = ["tong thanh toan", "tong tien thanh toan", "tong cong thanh toan", "khach phai tra",
                                     "phai thanh toan", "can thanh toan", "tong cong tien thanh toan", "grand total",
                                     "amount due", "total payment", "total amount", "tong so tien thanh toan"]
    private static let keys = ["tong cong", "tong tien", "tong so tien", "total", "cong tien", "thanh toan", "so tien"]
    private static let excluded = ["khach dua", "tien khach", "tien thua", "tien thoi", "tra lai", "giam gia", "chiet khau",
                                   "tien thue", "thue gtgt", "thue suat", "tien mat", "change", "cash", "discount", "tip"]
    private static let noise = ["mst", "ma so thue", "so tk", "stk", "tai khoan", "hotline", "tel", "sdt", "dien thoai",
                                "dt:", "so hd", "so hoa don", "ky hieu", "mau so", "ma tra cuu", "ma cqt", "fax"]

    static func total(_ rows: [String], _ folded: [String]) -> Int? {
        var best: (score: Int, index: Int, amount: Int)?
        for (i, f) in folded.enumerated() {
            let strong = strongKeys.contains { f.contains($0) }
            let score = strong ? 3 : (keys.contains { f.contains($0) } ? 2 : (f.contains("tong") ? 1 : 0))
            guard score > 0, strong || !excluded.contains(where: { f.contains($0) }) else { continue }
            // the figure sits on the same row, or (split columns) on the next one
            var amount = amounts(in: rows[i]).max()
            if amount == nil, i + 1 < rows.count, keys.allSatisfy({ !folded[i + 1].contains($0) }) {
                amount = amounts(in: rows[i + 1]).max()
            }
            guard let amount else { continue }
            // higher score wins; on a tie the lower row (totals come after subtotals)
            if best == nil || score > best!.score || (score == best!.score && i > best!.index) {
                best = (score, i, amount)
            }
        }
        if let best { return best.amount }
        // no keyword: the largest money-looking figure outside id / phone / change rows
        return folded.indices
            .filter { i in !excluded.contains { folded[i].contains($0) } && !noise.contains { folded[i].contains($0) } }
            .flatMap { amounts(in: rows[$0], strict: true) }
            .max()
    }

    private static let money = try! NSRegularExpression(
        pattern: #"(?<![\d.,/:\-])(\d{1,3}(?:[.,]\d{3})+|\d{1,3}(?: \d{3})+|\d{4,9})(?:[.,]\d{1,2})?(?![\d.,]*\d)(?![/:\-]\d)(\s*(?:đ|d|vnd|vnđ|₫)\b)?"#,
        options: [.caseInsensitive])
    private static let thousands = try! NSRegularExpression(pattern: #"(?<![\d.,])(\d{1,4})\s?k\b"#, options: [.caseInsensitive])

    /// Money figures in a row, in đồng. `strict`: only grouped figures ("125.000") or ones with a currency mark.
    public static func amounts(in row: String, strict: Bool = false) -> [Int] {
        let ns = row as NSString
        var out: [Int] = []
        for m in money.matches(in: row, range: NSRange(location: 0, length: ns.length)) {
            let raw = ns.substring(with: m.range(at: 1))
            let grouped = raw.contains(".") || raw.contains(",") || raw.contains(" ")
            let currency = m.range(at: 2).location != NSNotFound
            if raw.hasPrefix("0") { continue }  // invoice numbers, phones
            if strict && !grouped && !currency { continue }
            guard let v = Int(raw.filter(\.isNumber)), v >= 1_000, v < 10_000_000_000 else { continue }
            out.append(v)
        }
        for m in thousands.matches(in: row, range: NSRange(location: 0, length: ns.length)) {
            if let v = Int(ns.substring(with: m.range(at: 1))), v > 0 { out.append(v * 1_000) }
        }
        return out
    }

    // MARK: Date

    private static let dmy = try! NSRegularExpression(pattern: #"(?<!\d)(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4}|\d{2})(?!\d)"#)
    private static let ymd = try! NSRegularExpression(pattern: #"(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)"#)
    private static let words = try! NSRegularExpression(pattern: #"ngay\s*(\d{1,2})\s*thang\s*(\d{1,2})\s*nam\s*(\d{4})"#)

    static func date(_ folded: [String], today: Date, calendar: Calendar) -> Date? {
        let latest = calendar.date(byAdding: .day, value: 1, to: today) ?? today
        for row in folded {
            let ns = row as NSString
            let range = NSRange(location: 0, length: ns.length)
            var found: [(d: Int, m: Int, y: Int)] = []
            for m in words.matches(in: row, range: range) + dmy.matches(in: row, range: range) {
                found.append((Int(ns.substring(with: m.range(at: 1)))!, Int(ns.substring(with: m.range(at: 2)))!,
                              Int(ns.substring(with: m.range(at: 3)))!))
            }
            for m in ymd.matches(in: row, range: range) {
                found.append((Int(ns.substring(with: m.range(at: 3)))!, Int(ns.substring(with: m.range(at: 2)))!,
                              Int(ns.substring(with: m.range(at: 1)))!))
            }
            for f in found {
                let y = f.y < 100 ? 2000 + f.y : f.y
                guard (1...31).contains(f.d), (1...12).contains(f.m), y >= 2000,
                      let date = calendar.date(from: DateComponents(year: y, month: f.m, day: f.d)),
                      calendar.component(.day, from: date) == f.d, date <= latest else { continue }
                return date
            }
        }
        return nil
    }

    // MARK: Vendor

    private static let sellerKeys = ["don vi ban hang", "ten don vi ban", "nguoi ban", "ten cua hang", "ten nguoi ban"]
    private static let headerSkip = ["hoa don", "phieu", "receipt", "invoice", "bill", "mst", "ma so thue", "dia chi", "dc:",
                                     "dt:", "tel", "hotline", "sdt", "website", "www", "ngay", "so:", "ky hieu", "mau so",
                                     "lien", "ban the hien", "thank", "cam on", "wifi", "pass", "ban:", "ban so", "gio"]

    static func vendor(_ rows: [String], _ folded: [String]) -> String? {
        for (i, f) in folded.enumerated() where sellerKeys.contains(where: { f.contains($0) }) {
            if let colon = rows[i].firstIndex(of: ":") {
                let name = rows[i][rows[i].index(after: colon)...].trimmingCharacters(in: .whitespaces)
                if name.count >= 3 { return String(name.prefix(60)) }
            }
        }
        for (i, f) in folded.prefix(max(4, rows.count / 3)).enumerated() {
            guard !headerSkip.contains(where: { f.contains($0) }) else { continue }
            let letters = rows[i].filter(\.isLetter).count
            guard letters >= 3, Double(letters) / Double(max(rows[i].count, 1)) > 0.5 else { continue }
            return String(rows[i].trimmingCharacters(in: .whitespaces).prefix(60))
        }
        return nil
    }

    // MARK: Category

    private static let categoryWords: [(ExpenseCategory, [String])] = [
        (.travel, ["grab", "be group", "xanh sm", "taxi", "mai linh", "vinasun", "gojek", "xang", "petrolimex", "dau diesel",
                   "ve may bay", "vietjet", "vietnam airlines", "bamboo", "vexere", "xe khach", "gui xe", "parking",
                   "bot ", "phi duong", "cau duong", "duong sat", "ve tau", "vetc", "epass"]),
        (.lodging, ["hotel", "khach san", "homestay", "resort", "motel", "nha nghi", "agoda", "booking.com", "luu tru",
                    "phong nghi", "check-in", "check in"]),
        (.meal, ["cafe", "coffee", "ca phe", "nha hang", "quan an", "restaurant", "com ", "pho ", "bun ", "tra sua",
                 "highlands", "phuc long", "starbucks", "kfc", "lotteria", "jollibee", "pizza", "bia", "lau ", "nuong",
                 "an uong", "do uong", "food", "bakery", "banh mi"]),
    ]

    static func category(_ text: String) -> ExpenseCategory {
        for (cat, words) in categoryWords where words.contains(where: { text.contains($0) }) { return cat }
        return .other
    }
}

/// Vietnamese money formatting: "1.250.000", and the words for "Số tiền bằng chữ".
public enum VND {
    public static func format(_ n: Int) -> String {
        let digits = String(abs(n))
        var out = ""
        for (i, ch) in digits.enumerated() {
            if i > 0, (digits.count - i) % 3 == 0 { out.append(".") }
            out.append(ch)
        }
        return (n < 0 ? "-" : "") + out
    }

    private static let unit = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
    private static let scale = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"]

    /// "Một trăm hai mươi lăm nghìn đồng".
    public static func words(_ n: Int) -> String {
        guard n > 0 else { return "Không đồng" }
        var groups: [Int] = []
        var rest = n
        while rest > 0 { groups.append(rest % 1000); rest /= 1000 }
        var parts: [String] = []
        for i in stride(from: groups.count - 1, through: 0, by: -1) where groups[i] > 0 {
            let leading = i == groups.count - 1
            parts.append(triple(groups[i], full: !leading) + (scale[i].isEmpty ? "" : " " + scale[i]))
        }
        let s = parts.joined(separator: " ") + " đồng"
        return s.prefix(1).uppercased() + s.dropFirst()
    }

    /// 0…999; `full` spells "không trăm" / "linh" as inside a larger number.
    private static func triple(_ v: Int, full: Bool) -> String {
        let h = v / 100, t = (v / 10) % 10, u = v % 10
        var w: [String] = []
        if h > 0 || full { w += [unit[h], "trăm"] }
        switch t {
        case 0: if u > 0 && (h > 0 || full) { w.append("linh") }
        case 1: w.append("mười")
        default: w += [unit[t], "mươi"]
        }
        if u > 0 {
            switch (t, u) {
            case (2..., 1): w.append("mốt")
            case (1..., 5): w.append("lăm")
            default: w.append(unit[u])
            }
        }
        return w.joined(separator: " ")
    }
}
