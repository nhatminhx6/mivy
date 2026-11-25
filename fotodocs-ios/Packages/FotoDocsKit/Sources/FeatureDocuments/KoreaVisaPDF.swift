import UIKit
import PDFKit
import FotoDocsCore

/// The official Korean "VISA APPLICATION FORM" (Annex 17, revised 2022-02-07, visa.go.kr/downfile/
/// VisaapplicationForm_EN.pdf), bundled as `Resources/VisaForms/korea-visa-form.pdf`, filled with the profile:
/// typed text in the boxes, ticks in the [ ] boxes, the visa photo in the photo box. The file has no form fields,
/// so the boxes are positions measured on this exact version (PDF points, origin bottom-left, page 595×841).
/// A new version of the form → measure again (PDFKit `findString` on the labels gives them).
enum KoreaVisaPDF {
    static let countryID = "kr"

    static var formURL: URL? { Bundle.module.url(forResource: "korea-visa-form", withExtension: "pdf", subdirectory: "VisaForms") }
    static var isAvailable: Bool { formURL != nil }

    /// A value box: page (1-based) and rect in PDF points; multi-line when taller than 16 pt.
    private struct Box { let page: Int; let rect: CGRect }
    private static func box(_ page: Int, _ x0: CGFloat, _ x1: CGFloat, _ y0: CGFloat, _ y1: CGFloat) -> Box {
        Box(page: page, rect: CGRect(x: x0, y: y0, width: x1 - x0, height: y1 - y0))
    }

    private static func texts(_ p: VisaProfile) -> [(Box, String)] {
        let ymd = { (d: DayDate?) in d?.formatted(.ymdSlash) ?? "" }   // the form asks yyyy/mm/dd (1.4)
        return [
            (box(1, 226, 348, 527, 539), p.surname),                              // 1.1 Family Name
            (box(1, 424, 538, 527, 539), p.givenNames),                           // 1.1 Given Names
            (box(1, 213, 348, 457, 469), ymd(p.dateOfBirth)),                     // 1.4 Date of Birth
            (box(1, 398, 538, 457, 469), p.nationalityEN),                        // 1.5 Nationality
            (box(1, 281, 349, 441, 453), p.countryEN),                            // 1.6 Country of Birth
            (box(1, 356, 538, 430, 441), p.idNumber),                             // 1.7 National Identity No.
            (box(2, 117, 215, 669, 680), p.passportNumber),                       // 3.2 Passport No.
            (box(2, 279, 376, 669, 680), p.countryEN),                            // 3.3 Country of Passport
            (box(2, 431, 538, 669, 680), Latin.issuer(p.passportIssuePlace)),     // 3.4 Place of Issue
            (box(2, 117, 215, 644, 654), ymd(p.passportIssueDate)),               // 3.5 Date of Issue
            (box(2, 288, 376, 644, 654), ymd(p.passportExpiry)),                  // 3.6 Date of Expiry
            (box(2, 276, 540, 492, 514), Latin.address(p.address)),               // 4.1 Home Country Address
            (box(2, 302, 376, 445, 457), p.phone),                                // 4.3 Cell Phone No.
            (box(2, 467, 540, 445, 457), p.email),                                // 4.4 E-mail
            (box(3, 281, 376, 648, 661), Latin.company(p.employer)),              // 7.2 a) Name of Company
            (box(3, 505, 548, 648, 661), Latin.upper(p.occupation)),              // 7.2 b) Position/Course
            (box(3, 305, 376, 619, 643), Latin.address(p.employerAddress)),       // 7.2 c) Address of Company
        ].filter { !$0.1.isEmpty }
    }

    /// Centres of the [ ] boxes to tick: halfway between the label's end and its "]".
    private static func ticks(_ p: VisaProfile) -> [(page: Int, at: CGPoint)] {
        var out: [(Int, CGPoint)] = [(2, CGPoint(x: 204.6, y: 713.5))]                    // 3.1 Regular
        if let s = p.sex { out.append((1, CGPoint(x: s == .male ? 449.2 : 526.9, y: 491.5))) }  // 1.3 Male / Female
        switch p.maritalStatus {                                                            // 5.1 (no box for widowed)
        case .married: out.append((2, CGPoint(x: 162.4, y: 341.5)))
        case .divorced: out.append((2, CGPoint(x: 330.0, y: 341.5)))
        case .single: out.append((2, CGPoint(x: 487.6, y: 341.5)))
        default: break
        }
        if !p.employer.trimmingCharacters(in: .whitespaces).isEmpty {
            out.append((3, CGPoint(x: 525.9, y: 729.2)))                                     // 7.1 Employed
        }
        return out
    }

    /// Photo cell of section 1 (left of 1.1–1.7).
    private static let photoCell = CGRect(x: 58, y: 429, width: 93, height: 124)

    static func fileName(_ p: VisaProfile) -> String {
        "KoreaVisaForm" + (p.surname.isEmpty ? "" : "_" + p.surname.replacingOccurrences(of: " ", with: "")) + ".pdf"
    }

    /// The filled form, all 5 pages, flat (looks the same in every viewer and prints as is). Nil without the form.
    @MainActor static func fill(_ profile: VisaProfile, photo: UIImage?) -> URL? {
        guard let url = formURL, let doc = PDFDocument(url: url), let first = doc.page(at: 0) else { return nil }
        let size = first.bounds(for: .mediaBox).size
        let values = texts(profile), checks = ticks(profile)
        // PDF (bottom-left) → UIKit (top-left)
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
                for (b, v) in values where b.page == i + 1 { type(v, in: ui(b.rect)) }
                for t in checks where t.page == i + 1 { tick(at: CGPoint(x: t.at.x, y: size.height - t.at.y)) }
                if i == 0, let photo { place(photo, in: ui(photoCell)) }
            }
        }
        return DocumentBuilder.write(data, name: fileName(profile))
    }

    /// Block letters in the box, centred vertically, shrunk to fit; boxes taller than 16 pt wrap.
    private static func type(_ text: String, in box: CGRect) {
        let multiline = box.height > 16
        var size: CGFloat = 9.5
        var attrs: [NSAttributedString.Key: Any] = [:]
        var bounds = CGRect.zero
        repeat {
            let style = NSMutableParagraphStyle()
            style.lineBreakMode = multiline ? .byWordWrapping : .byClipping
            attrs = [.font: PDFFont.make(size, weight: .medium), .foregroundColor: UIColor.black, .paragraphStyle: style]
            bounds = (text as NSString).boundingRect(with: CGSize(width: multiline ? box.width : .greatestFiniteMagnitude, height: .greatestFiniteMagnitude),
                                                     options: .usesLineFragmentOrigin, attributes: attrs, context: nil)
            size -= 0.5
        } while (bounds.width > box.width || bounds.height > box.height) && size > 5.5
        let y = box.midY - bounds.height / 2
        (text as NSString).draw(with: CGRect(x: box.minX, y: y, width: box.width, height: bounds.height + 1),
                                options: .usesLineFragmentOrigin, attributes: attrs, context: nil)
    }

    private static func tick(at c: CGPoint) {
        let path = UIBezierPath()
        path.move(to: CGPoint(x: c.x - 4, y: c.y))
        path.addLine(to: CGPoint(x: c.x - 1, y: c.y + 3.5))
        path.addLine(to: CGPoint(x: c.x + 5, y: c.y - 4.5))
        path.lineWidth = 1.4
        UIColor.black.setStroke()
        path.stroke()
    }

    /// The 35×45 mm photo, aspect-filled into the largest 35:45 frame that fits the cell, over its printed text.
    private static func place(_ photo: UIImage, in cell: CGRect) {
        var w = cell.width, h = w * 45 / 35
        if h > cell.height { h = cell.height; w = h * 35 / 45 }
        let frame = CGRect(x: cell.midX - w / 2, y: cell.midY - h / 2, width: w, height: h)
        UIColor.white.setFill(); UIRectFill(cell.insetBy(dx: 1, dy: 1))
        let ctx = UIGraphicsGetCurrentContext()
        ctx?.saveGState()
        UIBezierPath(rect: frame).addClip()
        let s = max(frame.width / photo.size.width, frame.height / photo.size.height)
        let pw = photo.size.width * s, ph = photo.size.height * s
        photo.draw(in: CGRect(x: frame.midX - pw / 2, y: frame.midY - ph / 2, width: pw, height: ph))
        ctx?.restoreGState()
    }
}
