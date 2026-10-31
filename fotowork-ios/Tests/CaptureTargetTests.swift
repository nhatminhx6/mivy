import Testing
import Foundation
import CoreGraphics
import FotoworkCore

@Suite("CaptureTarget")
struct CaptureTargetTests {
    @Test("Visa target pulls size + digital spec from presets (China)")
    func visaFromPresets() throws {
        let data = try PresetStore().load()
        let cn = try #require(data.visaDestinations.first { $0.id == "cn" })
        let target = CaptureTarget.visa(cn)
        #expect(target.widthMm == 33)
        #expect(target.heightMm == 48)
        #expect(target.sizeText == "33×48 mm")
        #expect(target.digitalPixels == CGSize(width: 354, height: 472))
        #expect(target.digitalMaxKB == 120)
    }

    @Test("Passport target from VN origin, no digital KB/px")
    func passportFromOrigin() throws {
        let data = try PresetStore().load()
        let vn = try #require(data.originPassports.first { $0.id == "vn" })
        let target = CaptureTarget.passport(vn)
        #expect(target.widthMm == 40)
        #expect(target.heightMm == 60)
        #expect(target.digitalMaxKB == nil)
        #expect(target.digitalPixels == nil)
    }

    @Test("Built-in VN sizes and aspect")
    func builtIns() {
        #expect(CaptureTarget.idCard3x4.sizeText == "30×40 mm")
        #expect(abs(CaptureTarget.idCard3x4.aspect - 0.75) < 0.0001)
        #expect(abs(CaptureTarget.idCard4x6.aspect - (40.0 / 60.0)) < 0.0001)
        #expect(CaptureTarget.jobApplication.subtitle == "Ghép vest")
    }
}
