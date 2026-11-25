import Testing
import Foundation
import CoreGraphics
import ImageIO
import PDFKit
import UIKit
import FotoDocsCore
import FotoDocsImaging
@testable import FeatureDocuments

/// The "Điền form visa" flow end to end, with a fake CCCD (QR) and a fake passport data page (MRZ) in
/// Fixtures/ (made up person "Lê Thu Hà"): read the documents → build the profile → every country's
/// copy table → Japan's official PDF → itinerary and translation PDFs.
@Suite("Visa flow (fake CCCD + passport)")
struct VisaFlowTests {
    private func image(_ name: String) throws -> CGImage {
        let url = try #require(Bundle(for: VisaFlowToken.self).url(forResource: name, withExtension: "jpg"))
        let src = try #require(CGImageSourceCreateWithURL(url as CFURL, nil))
        return try #require(CGImageSourceCreateImageAtIndex(src, 0, nil))
    }

    private var cccd: CCCDInfo {
        CCCDInfo.parse("079195004321|201234567|Lê Thu Hà|21071995|Nữ|45 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP Hồ Chí Minh|10082021")!
    }
    private var passport: PassportMRZ {
        PassportMRZ(surname: "LE", givenNames: "THU HA", number: "C7654321", nationality: "VNM",
                    dateOfBirth: DayDate(year: 1995, month: 7, day: 21), sex: .female, expiry: DayDate(year: 2031, month: 8, day: 10))
    }
    private var profile: VisaProfile {
        var p = VisaProfile()
        p.apply(cccd); p.apply(passport)
        return p
    }

    private func pdfText(_ url: URL) throws -> String {
        let doc = try #require(PDFDocument(url: url))
        return (0..<doc.pageCount).compactMap { doc.page(at: $0)?.string }.joined(separator: "\n")
    }

    @Test("1. Photo of the CCCD front → QR read: number, name, birth date, sex, address")
    func readCCCD() async throws {
        let r = await IDDocumentReader.read(try image("cccd-fake"))
        guard case .cccd(let c) = r else { Issue.record("expected the CCCD QR, got \(r)"); return }
        #expect(c.idNumber == "079195004321")
        #expect(c.fullName == "Lê Thu Hà")
        #expect(c.dateOfBirth == DayDate(year: 1995, month: 7, day: 21))
        #expect(c.sex == .female)
        #expect(c.address.contains("Nguyễn Huệ"))
    }

    @Test("2. Photo of the passport data page → MRZ read: number, name, dates")
    func readPassport() async throws {
        let r = await IDDocumentReader.read(try image("passport-fake"))
        guard case .passport(let m) = r else { Issue.record("expected the passport MRZ, got \(r)"); return }
        #expect(m.number == "C7654321")
        #expect(m.surname == "LE" && m.givenNames == "THU HA")
        #expect(m.dateOfBirth == DayDate(year: 1995, month: 7, day: 21))
        #expect(m.expiry == DayDate(year: 2031, month: 8, day: 10))
        #expect(m.sex == .female)
    }

    @Test("3. Both scans → one profile, Latin name from the passport")
    func profileMerge() {
        let p = profile
        #expect(p.hasCCCD && p.hasPassport)
        #expect(p.latinFullName == "LE THU HA")
        #expect(p.fullNameVN == "Lê Thu Hà")
        #expect(p.passportNumber == "C7654321")
        #expect(p.idNumber == "079195004321")
    }

    @Test("4. Every country's copy table is filled: name, birth date, passport number", arguments: VisaForms.all.map(\.id))
    func copyTable(country: String) throws {
        let spec = try #require(VisaForms.spec(country))
        let p = profile
        let values = spec.fields.map { ($0.id, $0.label, $0.value(p)) }
        #expect(!values.isEmpty)
        let all = values.map(\.2).joined(separator: " | ")
        #expect(all.contains("LE") || all.contains("Lê"), "no name in \(country): \(all)")
        #expect(all.contains("C7654321"), "no passport number in \(country)")
        #expect(all.contains("1995"), "no birth year in \(country)")
        #expect(!all.contains("Optional") && !all.contains("nil"), "raw value leaked in \(country)")
    }

    @Test("5. Japan: the official MOFA PDF is filled with the profile")
    @MainActor func japanPDF() throws {
        #expect(JapanVisaPDF.isAvailable, "japan-visa-form.pdf missing from the bundle")
        let url = try #require(JapanVisaPDF.fill(profile, photo: nil))
        let doc = try #require(PDFDocument(url: url))
        #expect(doc.pageCount >= 2)
        let text = try pdfText(url)
        #expect(text.contains("LE"))
        #expect(text.contains("THU HA"))
        #expect(text.contains("C7654321"))
        // Place of birth falls back to the country (no province on the CCCD/MRZ), like the copy table:
        // VIET NAM shows twice, once there and once as Nationality
        #expect(text.components(separatedBy: "VIET NAM").count - 1 >= 2, "Place of birth left blank")
    }

    @Test("6. Itinerary PDF lists every day with the traveller's name")
    @MainActor func itineraryPDF() throws {
        var it = Itinerary()
        it.destination = "Tokyo, Japan"
        it.setDates(from: DayDate(year: 2027, month: 4, day: 10)!, to: DayDate(year: 2027, month: 4, day: 12)!)
        it.days[0].plan = "Arrive Narita"; it.days[0].accommodation = "Hotel A, Shinjuku"
        let url = try #require(TravelDocsPDF.itinerary(it, profile: profile))
        let text = try pdfText(url)
        #expect(text.contains("LE THU HA"))
        #expect(text.contains("Arrive Narita"))
        #expect(text.contains("2027"))
    }

    @Test("7. Translations (birth, residence, employment) render prefilled PDFs", arguments: TranslationTemplate.all.map(\.id))
    @MainActor func translationPDF(id: String) throws {
        let t = try #require(TranslationTemplate.all.first { $0.id == id })
        let p = profile
        var values: [String: String] = [:]
        for f in t.fields { if let pre = f.prefill { values[f.id] = TranslationTemplate.output(pre(p), kind: f.kind) } }
        let url = try #require(TravelDocsPDF.translation(t, values: values))
        let text = try pdfText(url)
        #expect(!text.isEmpty)
        #expect(text.contains("LE THU HA") || text.contains("079195004321"), "profile not in \(id)")
    }
}

private final class VisaFlowToken {}
