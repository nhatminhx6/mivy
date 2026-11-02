import Testing
import CoreGraphics
import FotoDocsCore
import FotoDocsImaging

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

@Suite("PhotoExporter orientation")
struct PhotoExporterOrientationTests {
    /// Top half red, bottom half blue (as seen on screen).
    static func twoTone(_ w: Int, _ h: Int) -> CGImage {
        let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
        ctx.setFillColor(red: 0, green: 0, blue: 1, alpha: 1); ctx.fill(CGRect(x: 0, y: 0, width: w, height: h / 2))
        ctx.setFillColor(red: 1, green: 0, blue: 0, alpha: 1); ctx.fill(CGRect(x: 0, y: h / 2, width: w, height: h - h / 2))
        return ctx.makeImage()!
    }

    @Test("Print sheet keeps photos upright")
    func upright() throws {
        let sheet = try #require(PhotoExporter.printSheet(photo: Self.twoTone(300, 400), photoWidthMm: 30, photoHeightMm: 40))
        let w = sheet.image.width, h = sheet.image.height
        var buf = [UInt8](repeating: 0, count: w * h * 4)
        let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
        ctx.draw(sheet.image, in: CGRect(x: 0, y: 0, width: w, height: h))
        // buffer row 0 = top. Centre column, first non-white pixel from the top must be red.
        let x = w / 2
        var y = 0
        while y < h, buf[(y * w + x) * 4] > 240, buf[(y * w + x) * 4 + 2] > 240 { y += 1 }
        let p = ((y + 5) * w + x) * 4   // a few px inside (edge is anti-aliased)
        #expect(buf[p] > 200 && buf[p + 2] < 60, "top of the first photo should be red, got y=\(y) rgb=\(buf[p]),\(buf[p+1]),\(buf[p+2])")
    }
}
