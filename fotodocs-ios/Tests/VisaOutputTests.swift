import Testing
import Foundation
import CoreGraphics
import ImageIO
import PDFKit
import UIKit
import FotoDocsCore
import FotoDocsImaging
import FotoDocsDesign
@testable import FeatureDocuments

/// Runs the whole visa flow like a user would and writes every result to `mivy/output/visa/` (the simulator
/// writes straight to the Mac's disk), so the files can be opened and checked by eye:
/// scans read → profile (+ the boxes a user types by hand) → for each of the 8 countries the visa photo
/// (online file + 10×15 print sheet) and the copy table → Japan's official PDF with the photo →
/// itinerary PDF → the 3 translation PDFs. Made-up person "Lê Thu Hà".
@Suite("Visa flow — output files", .serialized)
struct VisaOutputTests {
    static let out = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("output/visa")

    private func fixture(_ name: String) throws -> CGImage {
        let url = try #require(Bundle(for: VisaOutputToken.self).url(forResource: name, withExtension: "jpg"))
        let src = try #require(CGImageSourceCreateWithURL(url as CFURL, nil))
        return try #require(CGImageSourceCreateImageAtIndex(src, 0, nil))
    }

    /// The profile the app builds from the two scans, plus what the user types in "Sửa hồ sơ".
    private func profile() async throws -> VisaProfile {
        var p = VisaProfile()
        guard case .cccd(let c) = await IDDocumentReader.read(try fixture("cccd-fake")) else { throw Fail("CCCD QR not read") }
        guard case .passport(let m) = await IDDocumentReader.read(try fixture("passport-fake")) else { throw Fail("passport MRZ not read") }
        p.apply(c); p.apply(m)
        p.placeOfBirth = "TP Hồ Chí Minh"
        p.maritalStatus = .single
        p.passportIssueDate = DayDate(year: 2021, month: 8, day: 10)
        p.passportIssuePlace = "Cục Quản lý Xuất nhập cảnh"
        p.phone = "0912 345 678"
        p.email = "thuha.le@gmail.com"
        p.occupation = "Accountant"   // the field asks for English
        p.employer = "Công ty TNHH Phố Xưa"
        p.employerAddress = "12 Lê Lợi, Quận 1, TP Hồ Chí Minh"
        return p
    }

    private func write(_ data: Data, _ path: String) throws {
        let url = Self.out.appendingPathComponent(path)
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try data.write(to: url)
    }

    /// The PDF itself plus a PNG of every page, to look at without a PDF viewer.
    private func savePDF(_ url: URL, as path: String) throws -> PDFDocument {
        let data = try Data(contentsOf: url)
        try write(data, path)
        let doc = try #require(PDFDocument(data: data))
        for i in 0..<doc.pageCount {
            guard let page = doc.page(at: i) else { continue }
            let size = page.bounds(for: .mediaBox).size
            let png = page.thumbnail(of: CGSize(width: size.width * 2, height: size.height * 2), for: .mediaBox).pngData()
            if let png { try write(png, path.replacingOccurrences(of: ".pdf", with: "-trang\(i + 1).png")) }
        }
        return doc
    }

    private func text(_ doc: PDFDocument) -> String {
        (0..<doc.pageCount).compactMap { doc.page(at: $0)?.string }.joined(separator: "\n")
    }

    @Test("Whole visa flow → mivy/output/visa")
    @MainActor func writeEverything() async throws {
        // the app registers its fonts at launch; the PDFs use Be Vietnam Pro (the system font turns Đ into Ð)
        FotoFonts.register()
        for _ in 0..<50 where UIFont(name: "BeVietnamPro-Regular", size: 12) == nil { try await Task.sleep(for: .milliseconds(100)) }
        OutputFolder.reset(Self.out)
        var report = ["# Luồng visa — kết quả (người giả: Lê Thu Hà)", ""]
        let p = try await profile()

        // 1. the profile
        report += ["## 1. Hồ sơ đọc từ ảnh CCCD (QR) + hộ chiếu (MRZ), cộng phần tự nhập", "",
                   "| Mục | Giá trị |", "|---|---|"]
        let rows: [(String, String)] = [
            ("Họ (hộ chiếu)", p.surname), ("Tên đệm + tên", p.givenNames), ("Họ tên có dấu", p.fullNameVN),
            ("Giới tính", p.sex?.vi ?? ""), ("Ngày sinh", p.dateOfBirth?.formatted(.dmySlash) ?? ""),
            ("Số CCCD", p.idNumber), ("Ngày cấp CCCD", p.idIssueDate?.formatted(.dmySlash) ?? ""), ("Địa chỉ", p.address),
            ("Số hộ chiếu", p.passportNumber), ("Hết hạn hộ chiếu", p.passportExpiry?.formatted(.dmySlash) ?? ""),
            ("Nơi sinh (tự nhập)", p.placeOfBirth), ("Hôn nhân (tự nhập)", p.maritalStatus?.vi ?? ""),
            ("Điện thoại (tự nhập)", p.phone), ("Email (tự nhập)", p.email), ("Nghề (tự nhập)", p.occupation),
            ("Nơi làm (tự nhập)", p.employer),
        ]
        report += rows.map { "| \($0.0) | \($0.1.isEmpty ? "—" : $0.1) |" }
        #expect(p.latinFullName == "LE THU HA" && p.passportNumber == "C7654321" && p.idNumber == "079195004321")

        // 2. each country: visa photo + copy table
        let presets = try PresetStore().load()
        let source = try fixture("portrait-frontal")
        let editor = PortraitEditor()
        await editor.prepare(cgImage: source, orientation: .up)
        var japanPhoto: UIImage?, koreaPhoto: UIImage?
        report += ["", "## 2. Từng nước: ảnh visa + bảng copy", ""]
        for (n, spec) in VisaForms.all.enumerated() {
            let folder = String(format: "%d-%@", n + 1, spec.id)
            report += ["### \(spec.flag) \(spec.name) → `\(folder)/`", ""]
            // photo, sized for this country
            if let dest = presets.visaDestinations.first(where: { $0.id == spec.id }) {
                let target = CaptureTarget.visa(dest)
                var settings = EditSettings()
                settings.background = .white
                let photo = try #require(await editor.render(settings: settings, targetAspect: target.widthMm / target.heightMm),
                                         "no photo for \(spec.id)")
                let px = PhotoExporter.digitalPixelSize(for: target)
                let online = try #require(PhotoExporter.resized(photo, to: px).flatMap { PhotoExporter.compressedJPEG($0, maxKB: target.digitalMaxKB) })
                try write(online, "\(folder)/anh-visa-nop-online.jpg")
                var line = "- Ảnh: \(target.sizeText) · file nộp online \(Int(px.width))×\(Int(px.height)) px, \(online.count / 1024) KB"
                if let max = target.digitalMaxKB { line += " (giới hạn \(max) KB)"; #expect(online.count / 1024 <= max, "\(spec.id) over the KB limit") }
                if let sheet = PhotoExporter.printSheet(photo: photo, photoWidthMm: target.widthMm, photoHeightMm: target.heightMm),
                   let jpg = PhotoExporter.jpeg(sheet.image, quality: 0.95) {
                    try write(jpg, "\(folder)/to-in-10x15.jpg")
                    line += " · tờ in 10×15: \(sheet.count) ảnh"
                }
                report.append(line)
                if spec.id == "jp" { japanPhoto = UIImage(cgImage: photo) }
                if spec.id == "kr" { koreaPhoto = UIImage(cgImage: photo) }
            } else {
                report.append("- Ảnh: (không có quy chuẩn ảnh cho nước này)")
            }
            // copy table, as the app shows it
            var table = ["\(spec.flag) \(spec.name) — \(spec.channel)", ""]
            var empty: [String] = []
            for f in spec.fields {
                let v = f.value(p)
                table.append("\(f.label)\n    \(v.isEmpty ? "(trống — bạn tự điền)" : v)\n    \(f.hint)")
                if v.isEmpty { empty.append(f.label) }
            }
            try write(Data(table.joined(separator: "\n").utf8), "\(folder)/bang-copy.txt")
            let sources = VisaForms.sources[spec.id] ?? []
            #expect(!sources.isEmpty, "\(spec.id) has no official source link")
            // one click in Finder opens the official form; the downloaded copy sits next to it when there is one
            for (k, src) in sources.enumerated() {
                let plist = try PropertyListSerialization.data(fromPropertyList: ["URL": src.url], format: .xml, options: 0)
                try write(plist, "\(folder)/LINK-FORM-GOC\(k == 0 ? "" : "-\(k + 1)").webloc")
            }
            if let local = Self.downloaded[spec.id] {
                let src = Self.out.appendingPathComponent("doi-chieu/form-goc/\(local)")
                if let data = try? Data(contentsOf: src) { try write(data, "\(folder)/form-goc-\(local)") }
            }
            let all = spec.fields.map { $0.value(p) }.joined(separator: " ")
            #expect(all.contains("C7654321") && all.contains("1995"), "\(spec.id) copy table")
            report.append("- Bảng copy: \(spec.fields.count) ô, \(spec.fields.count - empty.count) ô app điền sẵn" +
                          (empty.isEmpty ? "" : "; còn trống: \(empty.joined(separator: ", "))"))
            report.append("")
        }

        // 3. Japan official PDF, with the photo pasted
        let jpURL = try #require(JapanVisaPDF.fill(p, photo: japanPhoto))
        let jp = try savePDF(jpURL, as: "2-jp/JapanVisaForm_LE.pdf")
        let jpText = text(jp)
        for v in ["LE", "THU HA", "C7654321", "079195004321", "VIET NAM", "HO CHI MINH CITY", "21/07/1995", "10/08/2031", "BEN NGHE WARD", "PHO XUA COMPANY LIMITED", "IMMIGRATION DEPARTMENT", "ACCOUNTANT"] {
            #expect(jpText.contains(v), "Japan PDF misses \(v)")
        }
        // Korea: the official Annex 17 form, filled, with the photo
        let krURL = try #require(KoreaVisaPDF.fill(p, photo: koreaPhoto))
        let kr = try savePDF(krURL, as: "1-kr/KoreaVisaForm_LE.pdf")
        #expect(kr.pageCount == 5)
        let krText = text(kr)
        for v in ["LE", "THU HA", "1995/07/21", "C7654321", "079195004321", "2031/08/10", "BEN NGHE WARD", "PHO XUA COMPANY LIMITED", "ACCOUNTANT"] {
            #expect(krText.contains(v), "Korea PDF misses \(v)")
        }
        report += ["## 3a. Form Hàn (PDF chính thức, mẫu 17 bản 2022) → `1-kr/KoreaVisaForm_LE.pdf` (\(kr.pageCount) trang, có dán ảnh 35×45)", ""]
        // Schengen: the harmonised EU form (fillable version of the Swedish embassy), filled
        let scURL = try #require(SchengenVisaPDF.fill(p))
        let sc = try savePDF(scURL, as: "6-schengen/SchengenVisaForm_LE.pdf")
        let scText = text(sc)
        for v in ["LE", "THU HA", "21-07-1995", "C7654321", "079195004321", "10-08-2031", "VIETNAMESE", "PHO XUA COMPANY LIMITED"] {
            #expect(scText.contains(v), "Schengen PDF misses \(v)")
        }
        report += ["## 3b. Form Schengen (mẫu EU 2019/1155) → `6-schengen/SchengenVisaForm_LE.pdf` (\(sc.pageCount) trang)", ""]
        report += ["## 3. Form Nhật (PDF chính thức MOFA) → `2-jp/JapanVisaForm_LE.pdf` (\(jp.pageCount) trang, có dán ảnh 45×35)", ""]

        // 4. itinerary
        var it = Itinerary()
        it.destination = "Tokyo, Japan"
        it.setDates(from: DayDate(year: 2027, month: 4, day: 10)!, to: DayDate(year: 2027, month: 4, day: 14)!)
        let plans = ["Arrive Narita Airport, check in", "Asakusa, Senso-ji Temple, Tokyo Skytree", "Day trip to Mount Fuji (Kawaguchiko)",
                     "Shibuya, Harajuku, Meiji Shrine", "Shopping in Ginza, depart from Narita"]
        for i in it.days.indices { it.days[i].plan = plans[i] }
        it.days[0].accommodation = "APA Hotel Shinjuku, 1-20-1 Kabukicho, Tokyo"
        it.days[0].contact = "+81 3 1234 5678"
        let itURL = try #require(TravelDocsPDF.itinerary(it, profile: p))
        let itDoc = try savePDF(itURL, as: "lich-trinh/lich-trinh-tokyo.pdf")
        #expect(text(itDoc).contains("LE THU HA") && text(itDoc).contains("Mount Fuji"))
        report += ["## 4. Lịch trình → `lich-trinh/lich-trinh-tokyo.pdf` (5 ngày Tokyo, \(itDoc.pageCount) trang)", ""]

        // 5. translations, prefilled from the profile (the rest the user types)
        report += ["## 5. Bản dịch (app điền sẵn từ hồ sơ, phần còn lại bạn tự gõ) → `ban-dich/`", ""]
        for t in TranslationTemplate.all {
            var values: [String: String] = [:]
            for f in t.fields { if let pre = f.prefill { values[f.id] = TranslationTemplate.output(pre(p), kind: f.kind) } }
            let filled = values.values.filter { !$0.isEmpty }.count
            // as the app gives it, before the user types anything
            let url = try #require(TravelDocsPDF.translation(t, values: values))
            let doc = try savePDF(url, as: "ban-dich/\(t.id)-app-dien-san.pdf")
            #expect(text(doc).contains("LE THU HA") || text(doc).contains("079195004321"), "\(t.id) has no profile data")
            // and once the user has typed the rest from the paper document
            for (id, v) in Self.typed[t.id] ?? [:] {
                let kind = t.fields.first { $0.id == id }?.kind ?? .text
                values[id] = TranslationTemplate.output(v, kind: kind)
            }
            let full = try savePDF(try #require(TravelDocsPDF.translation(t, values: values)), as: "ban-dich/\(t.id)-day-du.pdf")
            let missing = t.fields.filter { (values[$0.id] ?? "").isEmpty }.map(\.en)
            #expect(missing.isEmpty, "\(t.id) sample leaves \(missing) empty")
            #expect(full.pageCount == 1, "\(t.id) spills onto \(full.pageCount) pages (signature cut off from the text)")
            report.append("- \(t.nameVi): \(t.fields.count) ô, app điền sẵn \(filled) → `\(t.id)-app-dien-san.pdf`; " +
                          "gõ nốt \(t.fields.count - filled) ô → `\(t.id)-day-du.pdf` (\(full.pageCount) trang)")
        }
        report += ["", "Mỗi PDF có thêm ảnh PNG từng trang (`…-trangN.png`) để xem nhanh."]
        try write(Data(report.joined(separator: "\n").utf8), "KET-QUA.md")
    }
}

extension VisaOutputTests {
    /// What a user types from the paper documents (the rest the app prefills from the profile). Made-up people.
    static let typed: [String: [String: String]] = [
        "birth": [
            "no": "125", "book": "01/1995", "ethnic": "Kinh", "origin": "Nam Dinh Province",
            "pob": "Tu Du Hospital, Ho Chi Minh City",
            "mName": "Nguyễn Thị Mai", "mYob": "1968", "mEthnic": "Kinh", "mNat": "Vietnamese",
            "mRes": "45 Nguyen Hue Street, Ben Nghe Ward, District 1, Ho Chi Minh City",
            "fName": "Lê Văn Phúc", "fYob": "1965", "fEthnic": "Kinh", "fNat": "Vietnamese",
            "fRes": "45 Nguyen Hue Street, Ben Nghe Ward, District 1, Ho Chi Minh City",
            "regPlace": "People's Committee of Ben Nghe Ward, District 1, Ho Chi Minh City",
            "regDate": "28/07/1995", "signer": "TRAN VAN BINH, Chairman",
        ],
        "residence": [
            "issuer": "Police of Ben Nghe Ward, District 1, Ho Chi Minh City", "no": "2024/CT07-0815",
            "ethnic": "Kinh", "religion": "None", "origin": "Nam Dinh Province",
            "head": "Lê Văn Phúc", "relation": "Daughter",
            "members": "NGUYEN THI MAI, 1968, Wife\nLE QUOC BAO, 1999, Son",
            "date": "05/03/2027", "signer": "Major TRAN VAN DUNG, Head of Police",
        ],
        "employment": [
            "companyPhone": "+84 28 3822 1234", "position": "Accountant", "since": "01/06/2019",
            "salary": "22,000,000 VND", "leaveFrom": "10/04/2027", "leaveTo": "14/04/2027",
            "purpose": "Tourism in Japan",
            "note": "Ms. Le Thu Ha will return to work on 15/04/2027. All expenses of the trip are paid by herself.",
            "signer": "TRAN QUOC BAO, Director", "date": "01/03/2027",
        ],
    ]
}

extension VisaOutputTests {
    /// Official forms already downloaded during the cross-check (mivy/output/visa/doi-chieu/form-goc).
    static let downloaded: [String: String] = [
        "kr": "kr-visa.go.kr-VisaapplicationForm_EN.pdf", "jp": "jp-mofa-000124525.pdf", "tw": "tw-gvisa_QA.pdf",
        "cn": "cn-vfc-JKT3-20250714.pdf", "schengen": "eurlex-32019R1155.pdf",
        "uk": "uk-VAF-guidance-notes-generic-2014.pdf", "au": "au-1419spa-design-12-14-embassy-chile.pdf",
    ]
}

private struct Fail: Error, CustomStringConvertible {
    let description: String
    init(_ d: String) { description = d }
}

private final class VisaOutputToken {}
