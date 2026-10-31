import Testing
import CoreGraphics
import FotoworkCore
import FotoworkImaging

@Suite("PhotoExporter")
struct PhotoExporterTests {
    @Test("10×15 sheet fits 4 of a 4×6 card")
    func sheet4x6() throws {
        let photo = Sample.solidImage(400, 600, red: 0.2, green: 0.4, blue: 0.8)
        let sheet = try #require(PhotoExporter.printSheet(photo: photo, photoWidthMm: 40, photoHeightMm: 60))
        #expect(sheet.count == 4)
        #expect(abs(sheet.pixelSize.width - 1181) < 2)
        #expect(abs(sheet.pixelSize.height - 1772) < 2)
    }

    @Test("10×15 sheet fits 9 of a 3×4 card")
    func sheet3x4() throws {
        let photo = Sample.solidImage(300, 400)
        let sheet = try #require(PhotoExporter.printSheet(photo: photo, photoWidthMm: 30, photoHeightMm: 40))
        #expect(sheet.count == 9)
    }

    @Test("Digital pixel size falls back to 300 dpi from mm")
    func digitalPixelSize() {
        let size = PhotoExporter.digitalPixelSize(for: .idCard4x6)
        #expect(abs(size.width - 472.44) < 1)
        #expect(abs(size.height - 708.66) < 1)
    }

    @Test("Resize produces the requested pixel dimensions")
    func resize() throws {
        let img = Sample.solidImage(100, 100)
        let out = try #require(PhotoExporter.resized(img, to: CGSize(width: 50, height: 70)))
        #expect(out.width == 50)
        #expect(out.height == 70)
    }

    @Test("JPEG output is valid and lower quality is not larger")
    func jpeg() throws {
        let img = Sample.solidImage(600, 800, red: 0.9, green: 0.3, blue: 0.1)
        let data = try #require(PhotoExporter.jpeg(img, quality: 0.9))
        #expect(data.count > 1)
        #expect(data[0] == 0xFF && data[1] == 0xD8) // JPEG SOI marker
        let low = try #require(PhotoExporter.jpeg(img, quality: 0.3))
        #expect(low.count <= data.count)
    }

    @Test("Compressed JPEG respects a KB budget when feasible")
    func compress() throws {
        let img = Sample.solidImage(800, 1000)
        let budgeted = try #require(PhotoExporter.compressedJPEG(img, maxKB: 50))
        let free = try #require(PhotoExporter.compressedJPEG(img, maxKB: nil))
        #expect(budgeted.count <= free.count)
    }
}
