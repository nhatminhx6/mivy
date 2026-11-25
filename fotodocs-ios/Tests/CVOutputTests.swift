import Testing
import Foundation
import PDFKit
import UIKit
import FotoDocsCore
import FotoDocsDesign
@testable import FeatureDocuments

/// The "Tạo CV" flow end to end: every layout, font and colour, plus the awkward inputs (empty, very long,
/// long name, no photo), exported the way the app does it (A4 PDF with real text + PNG ×2.5 with the mark).
/// Everything is written to `mivy/output/cv/` to look at; the checks catch what a user would notice.
@Suite("CV builder — output files", .serialized)
@MainActor
struct CVOutputTests {
    static let out = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("output/cv")

    private var photo: Data? {
        Bundle(for: CVOutputToken.self).url(forResource: "portrait-frontal", withExtension: "jpg").flatMap { try? Data(contentsOf: $0) }
    }

    private struct Result { let k: CGFloat; let overflow: Bool; let pages: Int; let text: String; let png: CGSize }

    /// Fit + export both files under `name`, plus a PNG of the PDF page (what the employer will see).
    private func export(_ doc: CVDocument, _ name: String) throws -> Result {
        let fit = CVFit.fit(doc)
        let pdfURL = try #require(CVExport.pdf(doc, k: fit.k), "no PDF for \(name)")
        let pngURL = try #require(CVExport.png(doc, k: fit.k), "no PNG for \(name)")
        try FileManager.default.createDirectory(at: Self.out, withIntermediateDirectories: true)
        let pdfData = try Data(contentsOf: pdfURL)
        try pdfData.write(to: Self.out.appendingPathComponent("\(name).pdf"))
        let pngData = try Data(contentsOf: pngURL)
        try pngData.write(to: Self.out.appendingPathComponent("\(name).png"))
        let pdf = try #require(PDFDocument(data: pdfData))
        let page = try #require(pdf.page(at: 0))
        let box = page.bounds(for: .mediaBox)
        #expect(abs(box.width - 595.28) < 1 && abs(box.height - 841.89) < 1, "\(name) is not A4")
        let img = try #require(UIImage(data: pngData))
        return Result(k: fit.k, overflow: fit.overflow, pages: pdf.pageCount, text: pdf.string ?? "",
                      png: CGSize(width: img.size.width * img.scale, height: img.size.height * img.scale))
    }

    private func line(_ name: String, _ r: Result, _ note: String = "") -> String {
        "| `\(name)` | \(String(format: "%.2f", r.k))\(r.overflow ? " ⚠️ tràn" : "") | \(r.pages) | \(Int(r.png.width))×\(Int(r.png.height)) | \(note) |"
    }

    /// The app registers its fonts at launch (FotoDocsApp); the test process has to do it itself, or every
    /// CV silently falls back to the system font.
    private func fontsReady() async throws {
        FotoFonts.register()
        for _ in 0..<50 where UIFont(name: "BeVietnamPro-ExtraBold", size: 12) == nil { try await Task.sleep(for: .milliseconds(100)) }
        for n in ["BeVietnamPro-ExtraBold", "BeVietnamPro-Regular", "Montserrat-Thin", "PlayfairDisplay-Regular", "Georgia", "Georgia-Bold"] {
            #expect(UIFont(name: n, size: 12) != nil, "font \(n) not available")
        }
    }

    @Test("Every layout, font, colour and edge case → mivy/output/cv")
    func writeEverything() async throws {
        try await fontsReady()
        OutputFolder.reset(Self.out)
        var report = ["# Tạo CV — kết quả (mẫu ví dụ: Trần Quốc Bảo)", "",
                      "k = cỡ chữ app tự chọn để vừa 1 trang A4 (1.12 = to nhất, 0.70 = nhỏ nhất).", "",
                      "| File | k | Trang PDF | PNG | Ghi chú |", "|---|---|---|---|---|"]
        func check(_ r: Result, _ name: String, has: [String]) {
            #expect(r.pages == 1, "\(name): \(r.pages) pages")
            #expect(Int(r.png.width) == 1985 && Int(r.png.height) == 2808 || Int(r.png.height) == 2807, "\(name) PNG \(r.png)")
            // what a recruiter's ATS / copy-paste gets: case and line breaks don't matter, split letters do
            let flat = r.text.split(whereSeparator: \.isWhitespace).joined(separator: " ").lowercased()
            for s in has { #expect(flat.contains(s.lowercased()), "\(name): PDF text lacks “\(s)”") }
            #expect(!r.text.contains("NGHIỆ M") && !r.text.contains("VIỆ C"), "\(name): headings come out as split letters")
            #expect(!r.text.contains("\u{00D0}"), "\(name): “Đ” comes out as the look-alike “Ð”")
        }

        // 1. the 10 layouts, sample content + photo, navy
        for (i, layout) in CVLayout.allCases.enumerated() {
            var doc = CVDocument()
            doc.spec.layout = layout
            doc.data.photo = photo
            let name = String(format: "1-bo-cuc-%02d-%@", i + 1, layout.rawValue)
            let r = try export(doc, name)
            check(r, name, has: ["Trần Quốc Bảo", "Kinh nghiệm", "Công ty TNHH Bánh Mì Sài Gòn", "IELTS 7.0"])
            #expect(!r.overflow, "\(layout) sample overflows")
            report.append(line(name, r, layout.name + (layout.showsPhoto ? " · có ảnh" : " · không ảnh")))
        }

        // 2. fonts (on the banner layout)
        for font in CVFontChoice.allCases {
            var doc = CVDocument()
            doc.spec.layout = .banner; doc.spec.font = font; doc.data.photo = photo
            let name = "2-font-\(font.rawValue)"
            let r = try export(doc, name)
            check(r, name, has: ["Trần Quốc Bảo", "Học vấn"])
            report.append(line(name, r, "Font “\(font.name)”"))
        }

        // 3. colours (on the sidebar layout): the 5 palettes + a picked colour
        for palette in CVPalette.all.map(\.id) + ["custom"] {
            var doc = CVDocument()
            doc.spec.palette = palette
            if palette == "custom" { doc.spec.color = "#c2410c" }
            doc.data.photo = photo
            let name = "3-mau-\(palette)"
            let r = try export(doc, name)
            check(r, name, has: ["Trần Quốc Bảo"])
            report.append(line(name, r, palette == "custom" ? "Màu tự chọn #c2410c" : (CVPalette.all.first { $0.id == palette }?.name ?? "")))
        }

        // 4. awkward inputs
        var empty = CVDocument(); empty.data = CVData()
        let rEmpty = try export(empty, "4-cv-trong")
        check(rEmpty, "4-cv-trong", has: ["Họ và tên"])
        report.append(line("4-cv-trong", rEmpty, "Chưa điền gì: hiện “Họ và tên”, ô ảnh chữ CV"))

        var noPhoto = CVDocument(); noPhoto.spec.layout = .centered
        let rNoPhoto = try export(noPhoto, "4-khong-anh")
        check(rNoPhoto, "4-khong-anh", has: ["Trần Quốc Bảo", "QB"])
        report.append(line("4-khong-anh", rNoPhoto, "Bố cục có ảnh nhưng chưa thêm ảnh: hiện chữ cái QB"))

        var longName = CVDocument(); longName.data.name = "Nguyễn Hoàng Thị Phương Thảo Nguyên"; longName.data.photo = photo
        longName.spec.layout = .bold
        let rLongName = try export(longName, "4-ten-rat-dai")
        check(rLongName, "4-ten-rat-dai", has: ["Nguyễn Hoàng Thị Phương Thảo Nguyên"])
        report.append(line("4-ten-rat-dai", rLongName, "Tên 7 chữ trên bố cục “Tên cỡ lớn”"))

        var long = CVDocument(); long.data.photo = photo
        for n in 1...4 {
            long.data.jobs.append(CVJob(role: "Trưởng nhóm Marketing \(n)", org: "Công ty Cổ phần Thương mại Sao Mai \(n)", time: "0\(n)/2015 – 12/2016",
                                        desc: "Quản lý đội 6 người, lên kế hoạch ngân sách quý\nTriển khai 12 chiến dịch đa kênh, tăng 35% doanh thu online\nĐào tạo nhân viên mới về quảng cáo và báo cáo số liệu"))
        }
        long.data.summary += " " + long.data.summary
        let rLong = try export(long, "4-noi-dung-rat-dai")
        check(rLong, "4-noi-dung-rat-dai", has: ["Trần Quốc Bảo", "Sao Mai 4"])
        report.append(line("4-noi-dung-rat-dai", rLong, "7 công việc: app thu chữ còn k=\(String(format: "%.2f", rLong.k))" +
                           (rLong.overflow ? ", vẫn tràn → app hiện cảnh báo, phần cuối bị cắt" : ", vẫn vừa 1 trang")))
        #expect(rLong.k < 1.0, "long CV not shrunk")

        report += ["", "Mỗi file có bản PDF (chữ thật, chọn/copy được) và PNG 1985×2807 có dấu “✳ mivy” góc phải dưới."]
        try Data(report.joined(separator: "\n").utf8).write(to: Self.out.appendingPathComponent("KET-QUA.md"))
    }
}

private final class CVOutputToken {}
