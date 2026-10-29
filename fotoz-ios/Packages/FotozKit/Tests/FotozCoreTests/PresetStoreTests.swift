import Testing
import Foundation
@testable import FotozCore

@Suite("PresetStore")
struct PresetStoreTests {
    @Test("Loads all visa destinations and origin passports")
    func loadsEverything() throws {
        let data = try PresetStore().load()
        #expect(data.visaDestinations.count == 8)
        #expect(data.originPassports.count == 8)
        #expect(data.version == 1)
    }

    @Test("Vietnam passport print size is 40×60 mm")
    func vietnamPassportSize() throws {
        let data = try PresetStore().load()
        let vn = try #require(data.originPassports.first { $0.id == "vn" })
        #expect(vn.print?.wMm.max == 40)
        #expect(vn.print?.hMm.max == 60)
        #expect(vn.photoMode == .selfSupplied)
    }

    @Test("Korea head height decodes as a range")
    func koreaHeadRange() throws {
        let data = try PresetStore().load()
        let kr = try #require(data.visaDestinations.first { $0.id == "kr" })
        #expect(kr.headMm?.isRange == true)
        #expect(kr.headMm?.min == 25)
        #expect(kr.headMm?.max == 35)
    }

    @Test("US print carries its inch label and square size")
    func usSquareLabel() throws {
        let data = try PresetStore().load()
        let us = try #require(data.visaDestinations.first { $0.id == "us" })
        #expect(us.print?.summary == "51×51 mm · 2x2 inch")
    }

    @Test("UK is digital-only, so sizeLabel reflects that")
    func ukDigitalOnly() throws {
        let data = try PresetStore().load()
        let uk = try #require(data.visaDestinations.first { $0.id == "uk" })
        #expect(uk.print == nil)
        #expect(uk.sizeLabel == "Chỉ ảnh số")
    }
}
