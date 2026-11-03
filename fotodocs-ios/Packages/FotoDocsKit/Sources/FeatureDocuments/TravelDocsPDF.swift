import UIKit
import FotoDocsCore

/// A4 PDFs for the visa file: the day-by-day itinerary table and English reference translations.
enum TravelDocsPDF {
    private static let page = DocumentBuilder.a4
    private static let margin: CGFloat = 44

    // MARK: Itinerary

    static func itinerary(_ it: Itinerary, profile: VisaProfile) -> URL? {
        guard !it.days.isEmpty else { return nil }
        let width = page.width - 2 * margin
        // Date · Action plan · Contact · Accommodation
        let cols: [CGFloat] = [70, width - 70 - 100 - 150, 100, 150]
        let xs = cols.indices.map { margin + cols[..<$0].reduce(0, +) }
        let data = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: page)).pdfData { ctx in
            ctx.beginPage()
            var y = margin
            y += draw("TRAVEL ITINERARY", at: y, size: 16, bold: true, align: .center)
            y += 10
            for (label, value) in [("Name of applicant", profile.latinFullName), ("Passport No.", profile.passportNumber),
                                   ("Destination", it.destination)] where !value.isEmpty {
                y += draw("\(label): \(value)", at: y, size: 10.5)
            }
            y += 12
            func header() {
                UIColor(white: 0.93, alpha: 1).setFill()
                UIRectFill(CGRect(x: margin, y: y, width: width, height: 22))
                for (i, t) in ["Date", "Action plan", "Contact", "Accommodation"].enumerated() {
                    text(t, in: CGRect(x: xs[i] + 4, y: y + 5, width: cols[i] - 8, height: 14), size: 9.5, bold: true)
                }
                y += 22
            }
            header()
            for day in it.filledDown {
                let cells = [day.date.formatted(.dmySlash), day.plan, day.contact, day.accommodation]
                let h = max(22, cells.indices.map { height(cells[$0], width: cols[$0] - 8, size: 9.5) + 10 }.max() ?? 22)
                if y + h > page.height - margin {
                    ctx.beginPage()
                    y = margin
                    header()
                }
                for (i, c) in cells.enumerated() {
                    text(c, in: CGRect(x: xs[i] + 4, y: y + 5, width: cols[i] - 8, height: h - 6), size: 9.5)
                }
                grid(y: y, h: h, xs: xs + [margin + width])
                y += h
            }
        }
        return DocumentBuilder.write(data, name: "Itinerary\(suffix(profile)).pdf")
    }

    // MARK: Translation

    static func translation(_ t: TranslationTemplate, values: [String: String]) -> URL? {
        let width = page.width - 2 * margin
        let labelW: CGFloat = 190
        let value = { (f: TranslationTemplate.Field) in TranslationTemplate.output(values[f.id] ?? "", kind: f.kind) }
        let data = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: page)).pdfData { ctx in
            ctx.beginPage()
            var y = margin
            if t.isLetter {
                // company letterhead from the first section
                for f in t.sections.first?.fields ?? [] where !value(f).isEmpty {
                    y += draw(f.id == "company" ? value(f) : "\(f.en): \(value(f))", at: y, size: f.id == "company" ? 12 : 9.5, bold: f.id == "company")
                }
                y += 18
            } else {
                y += draw("SOCIALIST REPUBLIC OF VIETNAM", at: y, size: 11, bold: true, align: .center)
                y += draw("Independence – Freedom – Happiness", at: y, size: 10.5, align: .center)
                y += draw("———————", at: y, size: 9, align: .center)
                y += 10
            }
            y += draw(t.titleEn, at: y, size: 15, bold: true, align: .center)
            y += 14
            for (i, section) in t.sections.enumerated() {
                if t.isLetter && i == 0 { continue }
                let fields = section.fields.filter { !value($0).isEmpty }
                guard !fields.isEmpty else { continue }
                if y > page.height - margin - 60 { ctx.beginPage(); y = margin }
                if let title = section.title {
                    y += 6
                    y += draw(title + (t.isLetter && title.hasSuffix("that") ? ":" : ""), at: y, size: 11, bold: true)
                    y += 2
                }
                for f in fields {
                    let v = value(f)
                    let h = max(height(v, width: width - labelW, size: 10.5), 14) + 6
                    if y + h > page.height - margin { ctx.beginPage(); y = margin }
                    text(f.en + ":", in: CGRect(x: margin, y: y, width: labelW - 8, height: h), size: 10.5, color: .darkGray)
                    text(v, in: CGRect(x: margin + labelW, y: y, width: width - labelW, height: h), size: 10.5, bold: f.kind == .name)
                    y += h
                }
            }
            y += 30
            if y > page.height - margin - 80 { ctx.beginPage(); y = margin }
            let sign = CGRect(x: page.width - margin - 220, y: y, width: 220, height: 16)
            if t.isLetter {
                text("(Signature and company stamp)", in: sign, size: 9.5, color: .darkGray, align: .center)
            } else {
                text("Translated by", in: sign, size: 10, bold: true, align: .center)
                text("(Full name and signature)", in: sign.offsetBy(dx: 0, dy: 16), size: 9, color: .darkGray, align: .center)
            }
        }
        let name = values["name"].map { Latin.upper($0).replacingOccurrences(of: " ", with: "") } ?? ""
        return DocumentBuilder.write(data, name: "\(t.id.capitalized)_EN\(name.isEmpty ? "" : "_" + name).pdf")
    }

    // MARK: Drawing

    private static func suffix(_ p: VisaProfile) -> String {
        p.surname.isEmpty ? "" : "_" + p.surname.replacingOccurrences(of: " ", with: "")
    }

    private static func attrs(_ size: CGFloat, bold: Bool, color: UIColor, align: NSTextAlignment) -> [NSAttributedString.Key: Any] {
        let style = NSMutableParagraphStyle()
        style.alignment = align
        style.lineBreakMode = .byWordWrapping
        return [.font: UIFont.systemFont(ofSize: size, weight: bold ? .bold : .regular), .foregroundColor: color, .paragraphStyle: style]
    }

    private static func height(_ s: String, width: CGFloat, size: CGFloat) -> CGFloat {
        ceil((s as NSString).boundingRect(with: CGSize(width: width, height: .greatestFiniteMagnitude), options: [.usesLineFragmentOrigin],
                                          attributes: attrs(size, bold: false, color: .black, align: .left), context: nil).height)
    }

    private static func text(_ s: String, in rect: CGRect, size: CGFloat, bold: Bool = false, color: UIColor = .black, align: NSTextAlignment = .left) {
        (s as NSString).draw(with: rect, options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine],
                             attributes: attrs(size, bold: bold, color: color, align: align), context: nil)
    }

    /// One full-width paragraph; returns the height used.
    @discardableResult
    private static func draw(_ s: String, at y: CGFloat, size: CGFloat, bold: Bool = false, align: NSTextAlignment = .left) -> CGFloat {
        let w = page.width - 2 * margin
        let h = height(s, width: w, size: size) + 3
        text(s, in: CGRect(x: margin, y: y, width: w, height: h), size: size, bold: bold, align: align)
        return h
    }

    private static func grid(y: CGFloat, h: CGFloat, xs: [CGFloat]) {
        let path = UIBezierPath()
        path.move(to: CGPoint(x: xs.first!, y: y + h))
        path.addLine(to: CGPoint(x: xs.last!, y: y + h))
        for x in xs {
            path.move(to: CGPoint(x: x, y: y))
            path.addLine(to: CGPoint(x: x, y: y + h))
        }
        path.lineWidth = 0.5
        UIColor(white: 0.75, alpha: 1).setStroke()
        path.stroke()
    }
}
