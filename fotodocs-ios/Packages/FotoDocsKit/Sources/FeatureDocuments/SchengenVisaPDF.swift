import UIKit
import PDFKit
import FotoDocsCore

/// The harmonised Schengen visa application form (Annex I, Regulation (EU) 2019/1155) in the fillable PDF published
/// by the Swedish embassy (`Resources/VisaForms/schengen-visa-form.pdf`; same numbered boxes as the EU text),
/// filled with the profile. Fields are found by their names (the printed box titles); values are drawn flat on the
/// page and the widgets dropped, like Japan's form. The form has no photo box: the photo is glued / handed in apart.
enum SchengenVisaPDF {
    static let countryID = "schengen"

    static var formURL: URL? { Bundle.module.url(forResource: "schengen-visa-form", withExtension: "pdf", subdirectory: "VisaForms") }
    static var isAvailable: Bool { formURL != nil }

    /// Text fields: start of the field name → value.
    private static func texts(_ p: VisaProfile) -> [(String, String)] {
        let dmy = { (d: DayDate?) in d?.formatted(.dmyDash) ?? "" }       // box 4: day-month-year
        return [
            ("1 Surname", p.surname),
            ("2 Surname at birth", p.surname),
            ("3 First name", p.givenNames),
            ("4 Date of birth", dmy(p.dateOfBirth)),
            ("5 Place of birth", Latin.address(p.placeOfBirth)),
            ("6 Country of birth", p.countryEN),
            ("7 Current nationality", p.nationalityEN),
            ("11 National identity number", p.idNumber),
            ("13 Number of travel document", p.passportNumber),
            ("14 Date of issue", dmy(p.passportIssueDate)),
            ("15 Valid until", dmy(p.passportExpiry)),
            ("16 Issued by", p.countryEN),
            ("19 Applicant's home address", [Latin.address(p.address), p.email].filter { !$0.isEmpty }.joined(separator: ", ")),
            ("Telephone no", Latin.phoneIntl(p.phone)),
            ("21 Current occupation", Latin.upper(p.occupation)),
            ("22 Employer", [Latin.company(p.employer), Latin.address(p.employerAddress)].filter { !$0.isEmpty }.joined(separator: ", ")),
        ].filter { !$0.1.isEmpty }
    }

    /// Check boxes to tick, by exact field name.
    private static func ticks(_ p: VisaProfile) -> Set<String> {
        var out: Set<String> = ["Ordinary passport"]
        if let s = p.sex { out.insert(s == .male ? "Male" : "Female") }
        switch p.maritalStatus {
        case .single: out.insert("Single")
        case .married: out.insert("Married")
        case .divorced: out.insert("Divorced")
        case .widowed: out.insert("Widow(er)")
        case nil: break
        }
        return out
    }

    static func fileName(_ p: VisaProfile) -> String {
        "SchengenVisaForm" + (p.surname.isEmpty ? "" : "_" + p.surname.replacingOccurrences(of: " ", with: "")) + ".pdf"
    }

    @MainActor static func fill(_ profile: VisaProfile) -> URL? {
        guard let url = formURL, let doc = PDFDocument(url: url), let first = doc.page(at: 0) else { return nil }
        let size = first.bounds(for: .mediaBox).size
        let values = texts(profile), checks = ticks(profile)
        // field geometry per page, then drop the widgets so empty boxes don't print their borders/highlights
        var textRects: [Int: [(CGRect, String)]] = [:], tickRects: [Int: [CGRect]] = [:]
        for i in 0..<doc.pageCount {
            guard let page = doc.page(at: i) else { continue }
            for a in page.annotations where a.type == "Widget" {
                guard let name = a.fieldName?.trimmingCharacters(in: .whitespaces) else { continue }
                if a.widgetFieldType == .text, let v = values.first(where: { name.hasPrefix($0.0) })?.1 {
                    textRects[i, default: []].append((a.bounds, v))
                }
                if a.widgetFieldType == .button, checks.contains(name) { tickRects[i, default: []].append(a.bounds) }
            }
            page.annotations.filter { $0.type == "Widget" }.forEach(page.removeAnnotation)
        }
        let ui = { (r: CGRect) in CGRect(x: r.minX, y: size.height - r.maxY, width: r.width, height: r.height) }
        let data = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: size)).pdfData { ctx in
            for i in 0..<doc.pageCount {
                guard let page = doc.page(at: i) else { continue }
                ctx.beginPage()
                let cg = ctx.cgContext
                cg.saveGState()
                cg.translateBy(x: 0, y: size.height)
                cg.scaleBy(x: 1, y: -1)
                page.draw(with: .mediaBox, to: cg)
                cg.restoreGState()
                for (r, v) in textRects[i] ?? [] { type(v, in: ui(r)) }
                for r in tickRects[i] ?? [] { tick(ui(r)) }
            }
        }
        return DocumentBuilder.write(data, name: fileName(profile))
    }

    /// Typed just above the field's lower line, shrunk to fit; a value that would go below 7 pt on one line
    /// (address + e-mail in box 19) wraps to two lines instead, never past the box's right edge.
    private static func type(_ text: String, in box: CGRect) {
        let w = box.width - 4
        func attrs(_ size: CGFloat, wrap: Bool) -> [NSAttributedString.Key: Any] {
            let style = NSMutableParagraphStyle()
            style.lineBreakMode = wrap ? .byWordWrapping : .byTruncatingTail
            return [.font: PDFFont.make(size, weight: .medium), .foregroundColor: UIColor.black, .paragraphStyle: style]
        }
        var size: CGFloat = 9.5
        while (text as NSString).size(withAttributes: attrs(size, wrap: false)).width > w && size > 7 { size -= 0.5 }
        var a = attrs(size, wrap: false)
        var h = (text as NSString).size(withAttributes: a).height
        if (text as NSString).size(withAttributes: a).width > w {
            // two lines in the box height
            size = 7
            repeat {
                a = attrs(size, wrap: true)
                h = (text as NSString).boundingRect(with: CGSize(width: w, height: .greatestFiniteMagnitude), options: .usesLineFragmentOrigin,
                                                    attributes: a, context: nil).height
                size -= 0.5
            } while h > box.height && size > 5
        }
        // boxes 5/6/7 are short widgets right under their printed titles: text goes on the line below them
        let lift: CGFloat = box.height < 14 ? -1.5 : 2
        let rect = CGRect(x: box.minX + 2, y: box.maxY - h - lift, width: w, height: h + 1)
        (text as NSString).draw(with: rect, options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine], attributes: a, context: nil)
    }

    private static func tick(_ box: CGRect) {
        let path = UIBezierPath()
        path.move(to: CGPoint(x: box.minX + 1.5, y: box.midY))
        path.addLine(to: CGPoint(x: box.minX + box.width * 0.42, y: box.maxY - 1.5))
        path.addLine(to: CGPoint(x: box.maxX - 1, y: box.minY + 1))
        path.lineWidth = 1.4
        UIColor.black.setStroke()
        path.stroke()
    }
}
