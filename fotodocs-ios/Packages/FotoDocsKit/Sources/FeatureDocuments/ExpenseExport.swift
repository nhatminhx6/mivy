import UIKit
import FotoDocsCore

/// Expense sheet ("Bảng kê chi phí") as .xlsx or as an A4 PDF with the receipt photos appended.
enum ExpenseExport {
    static func day(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "vi_VN")
        f.dateFormat = "dd/MM/yyyy"
        return f.string(from: date)
    }

    private static let title = "BẢNG KÊ CHI PHÍ CÔNG TÁC"

    private static func range(_ receipts: [ExpenseReceipt]) -> String? {
        guard let first = receipts.map(\.date).min(), let last = receipts.map(\.date).max() else { return nil }
        let a = day(first), b = day(last)
        return a == b ? "Ngày \(a)" : "Từ ngày \(a) đến ngày \(b)"
    }

    /// "BangKe_Cong-tac-Da-Nang-03-2026.xlsx"
    static func fileName(_ trip: String, ext: String) -> String {
        let slug = ReceiptParser.fold(trip).split { !$0.isLetter && !$0.isNumber }.joined(separator: "-")
        return (slug.isEmpty ? "BangKe_CongTacPhi" : "BangKe_" + String(slug.prefix(40))) + "." + ext
    }

    // MARK: Excel

    static func xlsx(_ receipts: [ExpenseReceipt], trip: String) -> URL? {
        guard !receipts.isEmpty else { return nil }
        typealias C = XLSXWriter.Cell
        let total = receipts.compactMap(\.amount).reduce(0, +)
        let headerRow = 5, firstData = headerRow + 1, lastData = headerRow + receipts.count
        var rows: [[C]] = [
            [.text(title, bold: true)],
            [.text(trip.trimmingCharacters(in: .whitespaces))],
            [.text(range(receipts) ?? "")],
            [],
            [.text("STT", bold: true), .text("Ngày", bold: true), .text("Nơi chi", bold: true),
             .text("Loại chi phí", bold: true), .text("Ghi chú", bold: true), .text("Số tiền (đ)", bold: true)],
        ]
        for (i, r) in receipts.enumerated() {
            rows.append([.number(i + 1), .text(day(r.date)), .text(r.vendor), .text(r.category.rawValue), .text(r.note),
                         r.amount.map { C.number($0) } ?? .empty])
        }
        // the label starts in column A: viewers such as Quick Look skip rows whose first cell is missing
        rows.append([.text("Tổng cộng", bold: true), .empty, .empty, .empty, .empty,
                     .formula("SUM(F\(firstData):F\(lastData))", cached: total, bold: true)])
        rows.append([.text("Bằng chữ: \(VND.words(total))")])
        let totalRow = lastData + 1
        let data = XLSXWriter.workbook(sheet: "Bảng kê", rows: rows, columnWidths: [6, 12, 36, 14, 24, 16],
                                       merges: ["A1:F1", "A2:F2", "A3:F3", "A\(totalRow):E\(totalRow)", "A\(totalRow + 1):F\(totalRow + 1)"])
        return DocumentBuilder.write(data, name: fileName(trip, ext: "xlsx"))
    }

    // MARK: PDF

    static func pdf(_ receipts: [ExpenseReceipt], trip: String) -> URL? {
        guard !receipts.isEmpty else { return nil }
        let page = DocumentBuilder.a4, m: CGFloat = 40
        let total = receipts.compactMap(\.amount).reduce(0, +)
        // columns: STT · Ngày · Nơi chi · Loại · Số tiền
        let widths: [CGFloat] = [30, 72, page.width - 2 * m - 30 - 72 - 78 - 96, 78, 96]
        let xs = widths.indices.map { i in m + widths[..<i].reduce(0, +) }
        let rowH: CGFloat = 24
        let line = UIColor(white: 0.82, alpha: 1)

        let data = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: page)).pdfData { ctx in
            ctx.beginPage()
            var y = m
            text(title, CGRect(x: m, y: y, width: page.width - 2 * m, height: 22), size: 16, bold: true, align: .center)
            y += 24
            let trimmed = trip.trimmingCharacters(in: .whitespaces)
            if !trimmed.isEmpty {
                text(trimmed, CGRect(x: m, y: y, width: page.width - 2 * m, height: 18), size: 12, align: .center)
                y += 18
            }
            if let range = range(receipts) {
                text(range, CGRect(x: m, y: y, width: page.width - 2 * m, height: 16), size: 10, color: .darkGray, align: .center)
                y += 16
            }
            y += 14

            func header() {
                UIColor(white: 0.94, alpha: 1).setFill()
                UIRectFill(CGRect(x: m, y: y, width: page.width - 2 * m, height: rowH))
                for (i, t) in ["STT", "Ngày", "Nơi chi", "Loại", "Số tiền (đ)"].enumerated() {
                    text(t, cell(xs[i], widths[i], y, rowH), size: 10, bold: true, align: i == 4 ? .right : (i == 0 ? .center : .left))
                }
                y += rowH
            }
            header()
            for (i, r) in receipts.enumerated() {
                if y + rowH > page.height - m {
                    ctx.beginPage()
                    y = m
                    header()
                }
                let vendor = [r.vendor.isEmpty ? "—" : r.vendor, r.note].filter { !$0.isEmpty }.joined(separator: " · ")
                let cells = ["\(i + 1)", day(r.date), vendor, r.category.rawValue, r.amount.map(VND.format) ?? "—"]
                for (c, t) in cells.enumerated() {
                    text(t, cell(xs[c], widths[c], y, rowH), size: 10, align: c == 4 ? .right : (c == 0 ? .center : .left))
                }
                hLine(y + rowH, m, page.width - m, line)
                y += rowH
            }
            if y + 140 > page.height - m {
                ctx.beginPage()
                y = m
            }
            text("Tổng cộng", cell(xs[3], widths[3], y, rowH), size: 11, bold: true)
            text(VND.format(total), cell(xs[4], widths[4], y, rowH), size: 11, bold: true, align: .right)
            y += rowH + 6
            text("Bằng chữ: \(VND.words(total))", CGRect(x: m, y: y, width: page.width - 2 * m, height: 30), size: 10, italic: true)
            y += 44
            let sign = CGRect(x: page.width - m - 200, y: y, width: 200, height: 16)
            let parts = Calendar(identifier: .gregorian).dateComponents([.day, .month, .year], from: .now)
            text("Ngày \(parts.day!) tháng \(parts.month!) năm \(parts.year!)", sign, size: 10, italic: true, align: .center)
            text("Người lập bảng", sign.offsetBy(dx: 0, dy: 18), size: 11, bold: true, align: .center)
            text("(Ký, ghi rõ họ tên)", sign.offsetBy(dx: 0, dy: 34), size: 9, color: .darkGray, align: .center)

            // receipt photos, two per page
            let slotH = (page.height - 2 * m - 20) / 2
            var slot = 0
            for (i, r) in receipts.enumerated() {
                guard let image = r.imageData.flatMap(UIImage.init(data:)) else { continue }
                if slot % 2 == 0 { ctx.beginPage() }
                let top = m + CGFloat(slot % 2) * (slotH + 20)
                let caption = ["Hoá đơn \(i + 1)", day(r.date), r.vendor, r.amount.map { VND.format($0) + " đ" } ?? ""]
                    .filter { !$0.isEmpty }.joined(separator: "  ·  ")
                text(caption, CGRect(x: m, y: top, width: page.width - 2 * m, height: 16), size: 10, bold: true)
                fit(image, in: CGRect(x: m, y: top + 20, width: page.width - 2 * m, height: slotH - 20))
                slot += 1
            }
        }
        return DocumentBuilder.write(data, name: fileName(trip, ext: "pdf"))
    }

    // MARK: Drawing

    private static func cell(_ x: CGFloat, _ w: CGFloat, _ y: CGFloat, _ h: CGFloat) -> CGRect {
        CGRect(x: x + 4, y: y + (h - 14) / 2, width: w - 8, height: 14)
    }

    private static func text(_ s: String, _ rect: CGRect, size: CGFloat, bold: Bool = false, italic: Bool = false,
                             color: UIColor = .black, align: NSTextAlignment = .left) {
        let style = NSMutableParagraphStyle()
        style.alignment = align
        style.lineBreakMode = rect.height > size * 2 ? .byWordWrapping : .byTruncatingTail
        var font = UIFont.systemFont(ofSize: size, weight: bold ? .bold : .regular)
        if italic, let d = font.fontDescriptor.withSymbolicTraits(.traitItalic) { font = UIFont(descriptor: d, size: size) }
        (s as NSString).draw(with: rect, options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine],
                             attributes: [.font: font, .foregroundColor: color, .paragraphStyle: style], context: nil)
    }

    private static func hLine(_ y: CGFloat, _ x0: CGFloat, _ x1: CGFloat, _ color: UIColor) {
        let path = UIBezierPath()
        path.move(to: CGPoint(x: x0, y: y))
        path.addLine(to: CGPoint(x: x1, y: y))
        path.lineWidth = 0.5
        color.setStroke()
        path.stroke()
    }

    private static func fit(_ image: UIImage, in box: CGRect) {
        let s = min(box.width / image.size.width, box.height / image.size.height)
        let w = image.size.width * s, h = image.size.height * s
        image.draw(in: CGRect(x: box.midX - w / 2, y: box.minY, width: w, height: h))
    }
}
