import SwiftUI
import PDFKit
import PhotosUI
import FotoDocsCore
import FotoDocsDesign

/// The official "Visa Application Form to Enter Japan" (MOFA, English), bundled as
/// `Resources/VisaForms/japan-visa-form.pdf`, filled with the profile and the visa photo.
enum JapanVisaPDF {
    static let countryID = "jp"

    static var formURL: URL? { Bundle.module.url(forResource: "japan-visa-form", withExtension: "pdf", subdirectory: "VisaForms") }

    static var isAvailable: Bool { formURL != nil }

    private static let p1 = "topmostSubform[0].Page1[0]."

    /// Text boxes on page 1 (field names are the form's own, matched to the printed labels by position).
    private static func texts(_ p: VisaProfile) -> [String: String] {
        let dmy = { (d: DayDate?) in d?.formatted(.dmySlash) ?? "" }
        let birth = [Latin.upper(p.placeOfBirth), p.countryEN].filter { !$0.isEmpty }.joined(separator: ", ")
        return [
            "T2[0]": p.surname,                                   // Surname
            "T7[0]": p.givenNames,                                // Given and middle names
            "#area[4].T14[0]": dmy(p.dateOfBirth),                // Date of birth
            "#area[4].T16[0]": p.placeOfBirth.isEmpty ? "" : birth, // Place of birth
            "T50[0]": p.countryEN,                                // Nationality
            "T37[0]": p.idNumber,                                 // ID No. issued by your government
            "T49[0]": p.passportNumber,                           // Passport No.
            "#area[9].T57[1]": Latin.upper(p.passportIssuePlace), // Place of issue
            "#area[9].T53[0]": dmy(p.passportIssueDate),          // Date of issue
            "#area[0].T57[0]": Latin.upper(p.passportIssuePlace), // Issuing authority
            "#area[0].T59[0]": dmy(p.passportExpiry),             // Date of expiry
            "T0[1]": Latin.upper(p.address),                      // Current residential address
            "#area[11].T3[0]": p.phone,                           // Mobile No.
            "T3[1]": p.email,                                     // E-Mail
            "T5[0]": Latin.upper(p.occupation),                   // Current profession
            "#area[3].emp_name[0]": Latin.upper(p.employer),      // Employer name
            "emp_adr[0]": Latin.upper(p.employerAddress),         // Employer address
        ].mapKeys { p1 + $0 }
    }

    /// Radio groups: field name and the on-state of the box to tick.
    private static func ticks(_ p: VisaProfile) -> [(String, String)] {
        var out = [(p1 + "#area[1].#area[2].RB3[0]", "2")]  // Passport type: Ordinary
        if let s = p.sex { out.append((p1 + "#area[5].#area[6].#area[7].RB1[0]", s == .male ? "0" : "1")) }
        if let m = p.maritalStatus {
            let state = switch m { case .single: "0"; case .married: "1"; case .divorced: "2"; case .widowed: "3" }
            out.append((p1 + "#area[8].RB2[0]", state))
        }
        return out
    }

    /// "Paste photo here" box, 35×45 mm, in page-1 PDF points.
    private static let photoBox = CGRect(x: 419.5, y: 641.5, width: 99, height: 127.5)

    /// Draws the official pages with the profile typed in and the photo placed: a flat,
    /// print-ready PDF that looks the same in every viewer. Nil when the form is not bundled.
    static func fill(_ profile: VisaProfile, photo: UIImage?) -> URL? {
        guard let url = formURL, let doc = PDFDocument(url: url), let first = doc.page(at: 0) else { return nil }
        let values = texts(profile), checks = ticks(profile)
        let size = first.bounds(for: .mediaBox).size

        // field geometry first, then drop the widgets so empty boxes and combo arrows don't print
        var textRects: [(CGRect, String)] = [], tickRects: [CGRect] = []
        for a in first.annotations where a.type == "Widget" {
            guard let name = a.fieldName else { continue }
            if let v = values[name], !v.isEmpty { textRects.append((a.bounds, v)) }
            if checks.contains(where: { $0.0 == name && $0.1 == a.buttonWidgetStateString }) { tickRects.append(a.bounds) }
        }
        for i in 0..<doc.pageCount {
            guard let page = doc.page(at: i) else { continue }
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
                guard i == 0 else { continue }
                for (rect, value) in textRects { typeText(value, in: ui(rect)) }
                for rect in tickRects { tick(ui(rect)) }
                if let photo { place(photo, in: ui(photoBox)) }
            }
        }
        let name = profile.surname.isEmpty ? "" : "_" + profile.surname.replacingOccurrences(of: " ", with: "")
        return DocumentBuilder.write(data, name: "JapanVisaForm\(name).pdf")
    }

    /// Typed text on the field's underline, shrunk to fit; two-line boxes wrap.
    private static func typeText(_ text: String, in box: CGRect) {
        let multiline = box.height > 18
        var size: CGFloat = 9.5
        var attrs: [NSAttributedString.Key: Any] = [:]
        var bounds = CGRect.zero
        repeat {
            let style = NSMutableParagraphStyle()
            style.lineBreakMode = multiline ? .byWordWrapping : .byClipping
            attrs = [.font: UIFont.systemFont(ofSize: size, weight: .medium), .foregroundColor: UIColor.black, .paragraphStyle: style]
            // single-line boxes measure unwrapped width, so long values shrink instead of wrapping
            bounds = (text as NSString).boundingRect(with: CGSize(width: multiline ? box.width - 4 : .greatestFiniteMagnitude, height: .greatestFiniteMagnitude),
                                                     options: [.usesLineFragmentOrigin], attributes: attrs, context: nil)
            size -= 0.5
        } while (bounds.width > box.width - 4 || bounds.height > box.height) && size > 5.5
        // sit on the printed underline (bottom of the field), like typed text
        let y = box.maxY - bounds.height - 0.5
        (text as NSString).draw(with: CGRect(x: box.minX + 2, y: y, width: box.width - 4, height: box.maxY - y),
                                options: [.usesLineFragmentOrigin], attributes: attrs, context: nil)
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

    /// Aspect-fill into the photo box (the app's visa photo is already 35×45).
    private static func place(_ photo: UIImage, in box: CGRect) {
        let ctx = UIGraphicsGetCurrentContext()
        ctx?.saveGState()
        UIBezierPath(rect: box).addClip()
        let s = max(box.width / photo.size.width, box.height / photo.size.height)
        let w = photo.size.width * s, h = photo.size.height * s
        photo.draw(in: CGRect(x: box.midX - w / 2, y: box.midY - h / 2, width: w, height: h))
        ctx?.restoreGState()
    }
}

private extension Dictionary {
    func mapKeys<K: Hashable>(_ f: (Key) -> K) -> [K: Value] {
        Dictionary<K, Value>(uniqueKeysWithValues: map { (f($0.key), $0.value) })
    }
}

struct JapanVisaPDFSheet: View {
    let profile: VisaProfile
    @Environment(\.dismiss) private var dismiss
    @State private var photoItem: PhotosPickerItem?
    @State private var photo: UIImage?
    @State private var share: SharePayload?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("App điền sẵn thông tin cá nhân vào form chính thức của Bộ Ngoại giao Nhật, dán ảnh visa vào khung ảnh. Bạn in ra, tự điền phần chuyến đi rồi ký tên.")
                        .font(.bvp(.subheadline))
                        .foregroundStyle(FotoDocs.Palette.textSecondary)
                    PhotosPicker(selection: $photoItem, matching: .images) {
                        HStack(spacing: 14) {
                            ZStack {
                                FotoDocs.Palette.primaryTint
                                if let photo {
                                    Image(uiImage: photo).resizable().scaledToFill()
                                } else {
                                    Image(systemName: "person.crop.rectangle").font(.bvp(.title2)).foregroundStyle(FotoDocs.Palette.primary)
                                }
                            }
                            .frame(width: 70, height: 90)
                            .clipShape(.rect(cornerRadius: 8))
                            VStack(alignment: .leading, spacing: 3) {
                                Text(photo == nil ? "Chọn ảnh visa 45×35 mm" : "Đổi ảnh")
                                    .font(.bvp(.headline, .semibold))
                                    .foregroundStyle(FotoDocs.Palette.textPrimary)
                                Text("Ảnh chụp bằng app, nền trắng. Có thể bỏ qua rồi dán ảnh giấy sau.")
                                    .font(.bvp(.caption))
                                    .foregroundStyle(FotoDocs.Palette.textSecondary)
                            }
                            Spacer(minLength: 0)
                        }
                        .padding(14)
                        .fotoCard(16)
                    }
                    .buttonStyle(.plain)
                    if JapanVisaPDF.isAvailable {
                        PillButton("Tạo file PDF", systemImage: "doc.fill") {
                            share = JapanVisaPDF.fill(profile, photo: photo).map(SharePayload.init)
                        }
                    } else {
                        Text("Form chính thức chưa có trong bản này.")
                            .font(.bvp(.subheadline, .semibold))
                            .foregroundStyle(FotoDocs.Palette.warning)
                    }
                }
                .padding(20)
            }
            .background(FotoDocs.Palette.background)
            .navigationTitle("Form visa Nhật (PDF)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Đóng") { dismiss() } }
            }
        }
        .onChange(of: photoItem) { _, item in
            Task {
                if let data = try? await item?.loadTransferable(type: Data.self) { photo = UIImage(data: data) }
            }
        }
        .sheet(item: $share) { ShareSheet(items: [$0.url]) }
    }
}
