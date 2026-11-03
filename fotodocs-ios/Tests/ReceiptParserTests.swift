import Testing
import Foundation
import CoreGraphics
import FotoDocsCore

@Suite("ReceiptParser")
struct ReceiptParserTests {
    /// Builds OCR lines top → bottom; a tuple puts the amount in its own box on the right.
    private func lines(_ rows: [(String, String?)]) -> [OCRLine] {
        rows.enumerated().flatMap { i, row -> [OCRLine] in
            let y = 0.05 + Double(i) * 0.05
            var out = [OCRLine(row.0, box: CGRect(x: 0.05, y: y, width: 0.5, height: 0.03))]
            if let right = row.1 { out.append(OCRLine(right, box: CGRect(x: 0.7, y: y + 0.004, width: 0.25, height: 0.03))) }
            return out
        }
    }

    private let today = Calendar(identifier: .gregorian).date(from: DateComponents(year: 2026, month: 11, day: 2))!

    private func ymd(_ date: Date?) -> [Int]? {
        date.map { Calendar.current.dateComponents([.year, .month, .day], from: $0) }.map { [$0.year!, $0.month!, $0.day!] }
    }

    @Test("Cafe bill: payable total, not the subtotal or the cash handed over")
    func cafe() {
        let p = ReceiptParser.parse(lines([
            ("HIGHLANDS COFFEE", nil), ("123 Nguyễn Huệ, Quận 1", nil), ("HÓA ĐƠN THANH TOÁN", nil),
            ("Ngày: 12/03/2026 14:35", nil), ("Phin sữa đá x2", "58.000"), ("Tổng tiền hàng", "77.000"),
            ("Giảm giá", "7.000"), ("TỔNG THANH TOÁN", "70.000"), ("Tiền khách đưa", "100.000"), ("Tiền thừa", "30.000"),
        ]), today: today)
        #expect(p.amount == 70_000)
        #expect(p.vendor == "HIGHLANDS COFFEE")
        #expect(ymd(p.date) == [2026, 3, 12])
        #expect(p.category == .meal)
    }

    @Test("E-invoice: seller after the colon, date in words, total with VAT")
    func eInvoice() {
        let p = ReceiptParser.parse(lines([
            ("HÓA ĐƠN GIÁ TRỊ GIA TĂNG", nil), ("Ngày 18 tháng 03 năm 2026", nil), ("Ký hiệu: 1C26TAA", "Số: 00001234"),
            ("Đơn vị bán hàng: CÔNG TY TNHH KHÁCH SẠN SÔNG HÀN", nil), ("Mã số thuế: 0401234567", nil),
            ("Cộng tiền hàng:", "1.200.000"), ("Thuế suất GTGT: 8% Tiền thuế GTGT:", "96.000"),
            ("Tổng cộng tiền thanh toán:", "1.296.000"),
        ]), today: today)
        #expect(p.amount == 1_296_000)
        #expect(p.vendor == "CÔNG TY TNHH KHÁCH SẠN SÔNG HÀN")
        #expect(ymd(p.date) == [2026, 3, 18])
        #expect(p.category == .lodging)
    }

    @Test("Ride receipt: đ suffix, cash-payment row ignored")
    func ride() {
        let p = ReceiptParser.parse(lines([
            ("Grab", nil), ("Ngày 15/03/2026 08:12", nil), ("Cước phí", "85.000đ"), ("Phí cầu đường", "10.000đ"),
            ("Tổng cộng", "95.000đ"), ("Thanh toán bằng Tiền mặt", nil),
        ]), today: today)
        #expect(p.amount == 95_000)
        #expect(p.category == .travel)
    }

    @Test("No total keyword: largest grouped figure, phone and tax ids ignored")
    func fallback() {
        let p = ReceiptParser.parse(lines([
            ("Quán Bún Bò Huế O Xuân", nil), ("SĐT 0905123456", nil), ("MST 0401234567", nil),
            ("Bún bò đặc biệt", "55.000"), ("Trà đá", "5.000"), ("", "60.000"),
        ]), today: today)
        #expect(p.amount == 60_000)
        #expect(p.vendor == "Quán Bún Bò Huế O Xuân")
    }

    @Test("Money formats")
    func money() {
        #expect(ReceiptParser.amounts(in: "Tổng 1,250,000.00") == [1_250_000])
        #expect(ReceiptParser.amounts(in: "Total 125 000 VND") == [125_000])
        #expect(ReceiptParser.amounts(in: "Tổng 45k") == [45_000])
        #expect(ReceiptParser.amounts(in: "Hotline 0905.123.456").isEmpty)
        #expect(ReceiptParser.amounts(in: "Ngày 12/03/2026").isEmpty)
        #expect(ReceiptParser.amounts(in: "Mã 123456", strict: true).isEmpty)
    }

    @Test("Future dates are not the receipt date")
    func futureDate() {
        let p = ReceiptParser.parse(lines([("Hạn bảo hành 12/03/2030", nil), ("Ngày 01/11/2026", nil)]), today: today)
        #expect(ymd(p.date) == [2026, 11, 1])
    }

    @Test("Amount in words")
    func words() {
        #expect(VND.words(1_296_000) == "Một triệu hai trăm chín mươi sáu nghìn đồng")
        #expect(VND.words(1_005_000) == "Một triệu không trăm linh năm nghìn đồng")
        #expect(VND.words(21_000_015) == "Hai mươi mốt triệu không trăm mười lăm đồng")
        #expect(VND.words(95_000) == "Chín mươi lăm nghìn đồng")
        #expect(VND.format(1_296_000) == "1.296.000")
    }
}

@Suite("XLSXWriter")
struct XLSXWriterTests {
    @Test("Zip container with the workbook parts")
    func container() throws {
        let data = XLSXWriter.workbook(sheet: "Bảng kê", rows: [[.text("A & <b>"), .number(1000)], [.formula("SUM(B1:B1)", cached: 1000)]],
                                       columnWidths: [10, 12])
        #expect(data.prefix(4) == Data([0x50, 0x4B, 0x03, 0x04]))
        let text = String(decoding: data, as: UTF8.self)
        #expect(text.contains("xl/worksheets/sheet1.xml"))
        #expect(text.contains("A &amp; &lt;b&gt;"))
        #expect(text.contains("<f>SUM(B1:B1)</f><v>1000</v>"))
        #expect(XLSXWriter.column(0) == "A" && XLSXWriter.column(26) == "AA")
    }
}
