import Testing
import Foundation
import PDFKit
import UIKit
import FotoDocsCore
import FotoDocsImaging
import FotoDocsDesign
@testable import FeatureDocuments

/// The "Công tác phí" flow end to end, like a user on a 3-day trip to Đà Nẵng: photos of 7 different receipts
/// (printed bill, Grab, hotel VAT e-invoice, client coffee, flight, a crooked phone photo, a handwritten-style slip
/// with no total) → on-device OCR → parsed date / vendor / amount / category → Excel + PDF with the photos.
/// Everything goes to `mivy/output/cong-tac-phi/`, with what the app read next to what the receipt says.
@Suite("Expense claim — output files", .serialized)
@MainActor
struct ExpenseOutputTests {
    static let out = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("output/cong-tac-phi")

    /// One fake receipt: the lines printed on it and what a person reading it would put in the claim.
    struct Sample {
        let file: String, what: String
        let lines: [(String, String?)]          // left text, right-aligned amount
        let date: [Int]?, amount: Int?, vendor: String, category: ExpenseCategory
        var tilt: CGFloat = 0, photo = false, width: CGFloat = 560
        /// when the phone took the picture (EXIF), "yyyy:MM:dd HH:mm:ss"
        var taken = "2026:03:17 20:15:00"
    }

    /// JPEG as the phone saves it, with the capture time in EXIF.
    static func jpeg(_ image: UIImage, taken: String) -> Data {
        let data = NSMutableData()
        let dest = CGImageDestinationCreateWithData(data, "public.jpeg" as CFString, 1, nil)!
        CGImageDestinationAddImage(dest, image.cgImage!, [kCGImageDestinationLossyCompressionQuality: 0.85,
            kCGImagePropertyExifDictionary: [kCGImagePropertyExifDateTimeOriginal: taken]] as CFDictionary)
        CGImageDestinationFinalize(dest)
        return data as Data
    }

    static let samples: [Sample] = [
        Sample(file: "1-quan-com", what: "Hoá đơn quán ăn in nhiệt, có tiền khách đưa / tiền thừa", lines: [
            ("QUÁN CƠM BÀ HAI", nil), ("12 Trần Phú, Hải Châu, Đà Nẵng", nil), ("HÓA ĐƠN BÁN HÀNG", nil),
            ("Ngày: 14/03/2026  12:35", nil), ("--------------------------------", nil),
            ("Cơm gà xối mỡ  x2", "110.000"), ("Canh chua cá  x1", "75.000"), ("Trà đá  x3", "15.000"),
            ("--------------------------------", nil), ("TỔNG CỘNG", "200.000"), ("Tiền khách đưa", "500.000"), ("Tiền thừa", "300.000"),
            ("Cảm ơn quý khách!", nil),
        ], date: [2026, 3, 14], amount: 200_000, vendor: "QUÁN CƠM BÀ HAI", category: .meal),
        Sample(file: "2-grab", what: "Biên nhận Grab (đi lại)", lines: [
            ("Grab", nil), ("Biên nhận chuyến đi", nil), ("15-03-2026 08:10", nil),
            ("Từ: Sân bay Đà Nẵng", nil), ("Đến: 45 Bạch Đằng, Hải Châu", nil),
            ("Cước phí", "112.000"), ("Phí sân bay", "10.000"), ("Khuyến mãi", "-20.000"), ("Tổng tiền", "102.000đ"),
            ("Thanh toán: Tiền mặt", nil),
        ], date: [2026, 3, 15], amount: 102_000, vendor: "Grab", category: .travel),
        Sample(file: "3-khach-san-vat", what: "Hoá đơn GTGT khách sạn (ngày viết bằng chữ, có thuế)", lines: [
            ("HÓA ĐƠN GIÁ TRỊ GIA TĂNG", nil), ("Ngày 16 tháng 03 năm 2026", nil), ("Ký hiệu: 1C26TBB   Số: 0004521", nil),
            ("Đơn vị bán hàng: CÔNG TY CP KHÁCH SẠN SÔNG HÀN", nil), ("Mã số thuế: 0401234567", nil),
            ("Tiền phòng Deluxe 2 đêm", "2.268.519"), ("Cộng tiền hàng", "2.268.519"), ("Thuế GTGT 8%", "181.481"),
            ("Tổng cộng tiền thanh toán", "2.450.000"), ("Số tiền viết bằng chữ: Hai triệu bốn trăm năm mươi nghìn đồng", nil),
        ], date: [2026, 3, 16], amount: 2_450_000, vendor: "CÔNG TY CP KHÁCH SẠN SÔNG HÀN", category: .lodging, width: 680),
        Sample(file: "4-ca-phe-tiep-khach", what: "Cà phê tiếp khách, số tiền dùng dấu phẩy", lines: [
            ("HIGHLANDS COFFEE", nil), ("Vincom Đà Nẵng", nil), ("Ngày: 16/03/26 15:20", nil),
            ("Phin sữa đá  x4", "156,000"), ("Bánh mì que  x2", "38,000"), ("Thành tiền", "194,000"),
            ("VAT (đã gồm)", nil), ("Tiếp khách: Công ty Sao Mai", nil),
        ], date: [2026, 3, 16], amount: 194_000, vendor: "HIGHLANDS COFFEE", category: .meal),
        Sample(file: "5-ve-may-bay", what: "Vé máy bay điện tử (số tiền có chữ VND)", lines: [
            ("VIETNAM AIRLINES", nil), ("XÁC NHẬN HÀNH TRÌNH / E-TICKET", nil), ("Ngày xuất vé: 10/03/2026", nil),
            ("Hành khách: LE THU HA", nil), ("VN 113  SGN → DAD  14/03/2026", nil), ("VN 128  DAD → SGN  17/03/2026", nil),
            ("Giá vé", "2.640.000"), ("Thuế, phí", "480.000"), ("Tổng cộng", "3.120.000 VND"),
        ], date: [2026, 3, 10], amount: 3_120_000, vendor: "VIETNAM AIRLINES", category: .travel),
        Sample(file: "6-anh-chup-nghieng", what: "Ảnh điện thoại chụp nghiêng 5°, nền bàn tối", lines: [
            ("BÁNH XÈO BÀ DƯỠNG", nil), ("K280/23 Hoàng Diệu", nil), ("17/03/2026", nil),
            ("Bánh xèo  x3", "90.000"), ("Nem lụi  x2", "60.000"), ("Nước ngọt  x2", "30.000"), ("TỔNG", "180.000"),
        ], date: [2026, 3, 17], amount: 180_000, vendor: "BÁNH XÈO BÀ DƯỠNG", category: .meal, tilt: 5, photo: true),
        Sample(file: "6b-anh-chup-nghieng-trai", what: "Ảnh chụp nghiêng ngược 9°, nền bàn tối", lines: [
            ("NHÀ HÀNG HẢI SẢN BÉ MẶN", nil), ("Lô 11 Võ Nguyên Giáp", nil), ("Ngày 17/03/2026", nil),
            ("Mực nướng", "185.000"), ("Tôm hấp bia", "240.000"), ("Bia  x6", "120.000"), ("Tổng tiền", "545.000"),
            ("Chào mừng quý khách", nil),
        ], date: [2026, 3, 17], amount: 545_000, vendor: "NHÀ HÀNG HẢI SẢN BÉ MẶN", category: .meal, tilt: -9, photo: true),
        Sample(file: "7-phieu-gui-xe", what: "Vé gửi xe: không có dòng tổng, không ghi ngày (ảnh chụp 16/03)", lines: [
            ("BÃI GIỮ XE TRUNG TÂM", nil), ("Vé lượt ô tô", nil), ("Số: 008812", nil), ("Giá", "30.000"),
        ], date: nil, amount: 30_000, vendor: "BÃI GIỮ XE TRUNG TÂM", category: .travel, taken: "2026:03:16 09:42:10"),
    ]

    /// Draws the receipt like a thermal print; `photo` puts it on a dark table, tilted, a bit soft.
    static func render(_ s: Sample) -> UIImage {
        let w = s.width, lineH: CGFloat = 34, pad: CGFloat = 32
        let paper = CGSize(width: w, height: pad * 2 + CGFloat(s.lines.count) * lineH)
        let fmt = UIGraphicsImageRendererFormat.default(); fmt.scale = 2; fmt.opaque = true
        let receipt = UIGraphicsImageRenderer(size: paper, format: fmt).image { _ in
            UIColor(white: 0.985, alpha: 1).setFill(); UIRectFill(CGRect(origin: .zero, size: paper))
            for (i, row) in s.lines.enumerated() {
                let y = pad + CGFloat(i) * lineH
                let first = i == 0
                let font: UIFont = first ? .boldSystemFont(ofSize: 24) : .monospacedSystemFont(ofSize: 19, weight: row.1 == nil ? .regular : .medium)
                let attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: UIColor(white: 0.12, alpha: 1)]
                (row.0 as NSString).draw(at: CGPoint(x: pad, y: y), withAttributes: attrs)
                if let r = row.1 {
                    let size = (r as NSString).size(withAttributes: attrs)
                    (r as NSString).draw(at: CGPoint(x: w - pad - size.width, y: y), withAttributes: attrs)
                }
            }
        }
        guard s.photo else { return receipt }
        let canvas = CGSize(width: paper.width + 260, height: paper.height + 260)
        return UIGraphicsImageRenderer(size: canvas, format: fmt).image { ctx in
            UIColor(red: 0.24, green: 0.2, blue: 0.17, alpha: 1).setFill(); UIRectFill(CGRect(origin: .zero, size: canvas))
            let cg = ctx.cgContext
            cg.translateBy(x: canvas.width / 2, y: canvas.height / 2)
            cg.rotate(by: s.tilt * .pi / 180)
            cg.setShadow(offset: CGSize(width: 6, height: 10), blur: 18, color: UIColor.black.withAlphaComponent(0.5).cgColor)
            receipt.draw(in: CGRect(x: -paper.width / 2, y: -paper.height / 2, width: paper.width, height: paper.height), blendMode: .normal, alpha: 0.96)
        }
    }

    private func write(_ data: Data, _ path: String) throws {
        let url = Self.out.appendingPathComponent(path)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: url)
    }

    private func ymd(_ d: Date) -> [Int] {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: d)
        return [c.year!, c.month!, c.day!]
    }

    @Test("A trip's receipts → read on device → Excel + PDF in mivy/output/cong-tac-phi")
    func writeEverything() async throws {
        // the app registers its fonts at launch; the PDF uses Be Vietnam Pro
        FotoFonts.register()
        for _ in 0..<50 where UIFont(name: "BeVietnamPro-Regular", size: 12) == nil { try await Task.sleep(for: .milliseconds(100)) }
        OutputFolder.reset(Self.out)
        var report = ["# Công tác phí — kết quả (chuyến Đà Nẵng 14–17/03/2026, 7 hoá đơn giả)", "",
                      "App tự đọc ngày, nơi chi, số tiền, loại chi phí từ ảnh (Vision trên máy). ✅ = đọc đúng, ❌ = sai/thiếu.", "",
                      "| Hoá đơn | Ngày | Nơi chi | Số tiền | Loại |", "|---|---|---|---|---|"]
        var receipts: [ExpenseReceipt] = []
        var misses: [String] = []
        for s in Self.samples {
            let file = Self.jpeg(Self.render(s), taken: s.taken)
            try write(file, "hoa-don/\(s.file).jpg")
            // exactly what ExpenseView.loadPicked + add do
            let photo = try #require(UIImage(data: file))
            let upright = photo.uprightForVision(maxSide: 2000)
            let parsed = ReceiptParser.parse(await ReceiptReader.read(try #require(upright.cgImage)))
            let r = ExpenseReceipt(date: parsed.date ?? ReceiptPhoto.takenAt(file) ?? .now, amount: parsed.amount, vendor: parsed.vendor ?? "",
                                   category: parsed.category, imageData: upright.jpegData(compressionQuality: 0.7))
            receipts.append(r)

            let claimDate = s.date ?? s.taken.prefix(10).split(separator: ":").map { Int($0)! }
            let dateOK = ymd(r.date) == claimDate
            let amountOK = parsed.amount == s.amount
            let vendorOK = ReceiptParser.fold(parsed.vendor ?? "") == ReceiptParser.fold(s.vendor)
            let catOK = parsed.category == s.category
            func cell(_ ok: Bool, _ got: String, _ want: String) -> String { ok ? "✅ \(got)" : "❌ \(got.isEmpty ? "(trống)" : got) — đúng: \(want)" }
            report.append("| `\(s.file)` \(s.what) | \(cell(dateOK, ExpenseExport.day(r.date) + (parsed.date == nil ? " (ngày chụp ảnh)" : ""), String(format: "%02d/%02d/%04d", claimDate[2], claimDate[1], claimDate[0]))) | "
                          + "\(cell(vendorOK, parsed.vendor ?? "", s.vendor)) | \(cell(amountOK, parsed.amount.map(VND.format) ?? "", s.amount.map(VND.format) ?? "")) | "
                          + "\(cell(catOK, parsed.category.rawValue, s.category.rawValue)) |")
            if !(dateOK && amountOK && vendorOK && catOK) { misses.append(s.file) }
        }
        // the amount matters most: a wrong total goes straight into the claim
        let amountRight = zip(Self.samples, receipts).filter { $0.0.amount == $0.1.amount }.count
        report += ["", "Số tiền đọc đúng: \(amountRight)/\(Self.samples.count) hoá đơn."]

        // the user fixes what the app could not read, like in the edit sheet, then exports (sorted by date like the list)
        for (s, r) in zip(Self.samples, receipts) {
            if let d = s.date { r.date = Calendar.current.date(from: DateComponents(year: d[0], month: d[1], day: d[2]))! }
            r.amount = s.amount; r.vendor = s.vendor; r.category = s.category
        }
        let note = "Tiếp khách Công ty Sao Mai, bàn hợp đồng quảng cáo quý 2"
        receipts[3].note = note
        let sorted = receipts.sorted { ($0.date, $0.createdAt) < ($1.date, $1.createdAt) }
        let trip = "Công tác Đà Nẵng 03/2026"
        let total = Self.samples.compactMap(\.amount).reduce(0, +)

        let xlsx = try #require(ExpenseExport.xlsx(sorted, trip: trip))
        try write(try Data(contentsOf: xlsx), xlsx.lastPathComponent)
        let pdfURL = try #require(ExpenseExport.pdf(sorted, trip: trip))
        let pdfData = try Data(contentsOf: pdfURL)
        try write(pdfData, pdfURL.lastPathComponent)
        let pdf = try #require(PDFDocument(data: pdfData))
        for i in 0..<pdf.pageCount {
            guard let page = pdf.page(at: i) else { continue }
            let size = page.bounds(for: .mediaBox).size
            if let png = page.thumbnail(of: CGSize(width: size.width * 1.5, height: size.height * 1.5), for: .mediaBox).pngData() {
                try write(png, "pdf-trang-\(i + 1).png")
            }
        }
        let range = (0..<pdf.pageCount).compactMap { pdf.page(at: $0)?.string }.joined()
        #expect(range.contains("Từ ngày 10/03/2026 đến ngày 17/03/2026"), "claim period wrong (a receipt dated today?)")
        let text = (0..<pdf.pageCount).compactMap { pdf.page(at: $0)?.string }.joined(separator: "\n")
        #expect(text.contains(VND.format(total)), "PDF total")
        #expect(text.contains("Sáu triệu"), "PDF total in words")  // 6.821.000
        #expect(text.contains("KHÁCH SẠN SÔNG HÀN"))
        #expect(text.contains("Đi lại") && !text.contains("\u{00D0}"), "“Đ” comes out of the PDF as the look-alike “Ð”")
        #expect(text.split(whereSeparator: \.isWhitespace).joined(separator: " ").contains(note), "the note is cut off in the PDF table")
        report += ["", "## File xuất (sau khi sửa tay các ô app đọc sai)",
                   "- Excel: `\(xlsx.lastPathComponent)`", "- PDF kèm ảnh hoá đơn: `\(pdfURL.lastPathComponent)` (\(pdf.pageCount) trang, ảnh từng trang: `pdf-trang-N.png`)",
                   "- Ảnh hoá đơn giả dùng để test: `hoa-don/`",
                   "- Tổng: \(VND.format(total)) đ — \(VND.words(total))"]
        try Data(report.joined(separator: "\n").utf8).write(to: Self.out.appendingPathComponent("KET-QUA.md"))
        #expect(amountRight == Self.samples.count, "the app misread too many totals: \(misses)")
    }
}
