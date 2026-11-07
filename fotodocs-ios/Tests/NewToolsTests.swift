import Testing
import Foundation
import CoreGraphics
import CoreImage
import FotoDocsCore
import FotoDocsImaging

@Suite("Online photo check")
struct OnlinePhotoCheckTests {
    private let ds160 = CaptureTarget.online.first { $0.id == "online-us" }!.target

    @Test("A good DS-160 file passes every check")
    func pass() {
        let items = OnlinePhotoCheck.evaluate(.init(pixelSize: CGSize(width: 600, height: 600), bytes: 180 * 1024, isJPEG: true,
                                                    faceFound: true, faceHeightRatio: 0.42, borderBrightness: 0.93), for: ds160)
        #expect(items.filter { !$0.ok }.isEmpty)
    }

    @Test("Too big, wrong shape, PNG, dark background are flagged")
    func fail() {
        let items = OnlinePhotoCheck.evaluate(.init(pixelSize: CGSize(width: 800, height: 1000), bytes: 900 * 1024, isJPEG: false,
                                                    faceFound: true, faceHeightRatio: 0.2, borderBrightness: 0.4), for: ds160)
        let failed = Set(items.filter { !$0.ok }.map(\.id))
        #expect(failed == ["format", "ratio", "kb", "head", "bg"])
    }

    @Test("Portals: exact pixels and budgets")
    func portals() {
        #expect(CaptureTarget.online.count == 6)
        let cn = CaptureTarget.online.first { $0.id == "online-cn" }!.target
        #expect(cn.digitalPixels == CGSize(width: 354, height: 472) && cn.digitalMaxKB == 120)
        #expect(CaptureTarget.baby.infant && !CaptureTarget.idCard4x6.infant)
    }
}

@Suite("Card number masking")
struct CardMaskTests {
    @Test("Card number hidden except the last four digits")
    func number() {
        let text = "4111 1111 1111 1234"
        let r = CardScanner.sensitiveRanges(in: text, back: false)
        #expect(r.count == 1)
        #expect(String(text[r[0]]) == "4111 1111 1111 ")
        #expect(CardScanner.sensitiveRanges(in: "VALID THRU 12/29", back: false).isEmpty)
    }

    @Test("CVV on the back")
    func cvv() {
        #expect(CardScanner.sensitiveRanges(in: "123", back: true).count == 1)
        #expect(CardScanner.sensitiveRanges(in: "123", back: false).isEmpty)
    }
}

@Suite("Travel documents")
struct TravelDocsTests {
    @Test("Itinerary days follow the dates and keep typed rows")
    func itinerary() {
        var it = Itinerary()
        it.setDates(from: DayDate(year: 2027, month: 4, day: 10)!, to: DayDate(year: 2027, month: 4, day: 12)!)
        #expect(it.days.count == 3)
        it.days[0].plan = "Arrive Narita"
        it.days[0].accommodation = "Hotel A, Shinjuku"
        it.setDates(from: DayDate(year: 2027, month: 4, day: 10)!, to: DayDate(year: 2027, month: 4, day: 14)!)
        #expect(it.days.count == 5 && it.days[0].plan == "Arrive Narita")
        #expect(it.filledDown[3].accommodation == "Hotel A, Shinjuku")
    }

    @Test("Translation templates prefill from the profile")
    func translation() {
        var p = VisaProfile()
        p.fullNameVN = "Nguyễn Văn Mẫu"
        p.idNumber = "079090001234"
        let birth = TranslationTemplate.birth
        let name = birth.fields.first { $0.id == "name" }!
        #expect(TranslationTemplate.output(name.prefill!(p), kind: name.kind) == "NGUYEN VAN MAU")
        #expect(birth.fields.first { $0.id == "pid" }!.prefill!(p) == "079090001234")
        #expect(TranslationTemplate.all.map(\.id) == ["birth", "residence", "employment"])
        let ids = TranslationTemplate.all.flatMap { t in t.fields.map { "\(t.id).\($0.id)" } }
        #expect(Set(ids).count == ids.count)  // unique ids per template
    }
}

@Suite("Backdrop probe")
struct BackdropProbeTests {
    private func solid(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat) -> CIImage {
        CIImage(color: CIColor(red: r, green: g, blue: b)).cropped(to: CGRect(x: 0, y: 0, width: 300, height: 400))
    }

    @Test("White backdrop counts, blue and grey-dark do not")
    func backdrop() {
        #expect(PhotoProbe.isPlainLightBackdrop(solid(0.97, 0.97, 0.96)))
        #expect(!PhotoProbe.isPlainLightBackdrop(solid(0.3, 0.5, 0.9)))
        #expect(!PhotoProbe.isPlainLightBackdrop(solid(0.5, 0.5, 0.5)))
    }
}
