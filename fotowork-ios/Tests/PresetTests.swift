import Testing
import Foundation
import FotoworkCore

@Suite("Preset data")
struct PresetTests {
    @Test("Loads 8 visa destinations and 8 origin passports")
    func loadsEverything() throws {
        let data = try PresetStore().load()
        #expect(data.visaDestinations.count == 8)
        #expect(data.originPassports.count == 8)
        #expect(data.version == 1)
    }

    @Test("Vietnam passport is 40×60 mm, self-supplied")
    func vietnamPassport() throws {
        let data = try PresetStore().load()
        let vn = try #require(data.originPassports.first { $0.id == "vn" })
        #expect(vn.print?.wMm.max == 40)
        #expect(vn.print?.hMm.max == 60)
        #expect(vn.photoMode == .selfSupplied)
    }

    @Test("Korea head height decodes as a range 25–35")
    func koreaHeadRange() throws {
        let data = try PresetStore().load()
        let kr = try #require(data.visaDestinations.first { $0.id == "kr" })
        #expect(kr.headMm?.isRange == true)
        #expect(kr.headMm?.min == 25)
        #expect(kr.headMm?.max == 35)
    }

    @Test("US print keeps inch label")
    func usSummary() throws {
        let data = try PresetStore().load()
        let us = try #require(data.visaDestinations.first { $0.id == "us" })
        #expect(us.print?.summary == "51×51 mm · 2x2 inch")
    }

    @Test("UK is digital-only")
    func ukDigitalOnly() throws {
        let data = try PresetStore().load()
        let uk = try #require(data.visaDestinations.first { $0.id == "uk" })
        #expect(uk.print == nil)
        #expect(uk.sizeLabel == "Chỉ ảnh số")
    }

    @Test("Measure.short formats value and range")
    func measureShort() {
        #expect(Measure.value(35).short == "35")
        #expect(Measure.range(35, 45).short == "35–45")
        #expect(Measure.range(0.5, 0.69).short == "0.5–0.69")
    }
}
