import Foundation
import CoreGraphics
import ImageIO
import Testing
@testable import FotoworkImaging

/// Fits the bundled vest templates on a real frontal portrait (Pixabay sample in Fixtures/).
@Suite struct GarmentFitterTests {
    static func fixture(_ name: String) -> CGImage? {
        guard let url = Bundle(for: BundleToken.self).url(forResource: name, withExtension: "jpg"),
              let src = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
        return CGImageSourceCreateImageAtIndex(src, 0, nil)
    }

    static func save(_ image: CGImage, to path: String) {
        guard let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, "public.png" as CFString, 1, nil) else { return }
        CGImageDestinationAddImage(dest, image, nil)
        CGImageDestinationFinalize(dest)
    }

    @Test(arguments: OutfitOption.allCases.compactMap(\.templateAsset))
    func templateHasCollarOpening(_ name: String) throws {
        let t = try #require(GarmentTemplate.bundled(name))
        #expect(t.holeTopW > 20)
        #expect(t.holeBottom > Int(t.collarTop))
        // opening is roughly centred
        #expect(abs(t.neckCX - Double(t.image.width) / 2) < Double(t.image.width) * 0.12)
    }

    @Test func fitsVestOnFrontalPortrait() throws {
        let photo = try #require(Self.fixture("portrait-frontal"))
        let garment = try #require(GarmentTemplate.bundled("vest-navy"))
        let out = try #require(GarmentFitter.compose(photo, garment: garment, background: CGColor(gray: 1, alpha: 1)))
        #expect(out.width == photo.width && out.height == photo.height)
        if let dir = ProcessInfo.processInfo.environment["FOTOWORK_TEST_OUT"] { Self.save(out, to: dir + "/fit-vest-navy.png") }

        // Bottom corners are now dark jacket fabric (the sample wears a light shirt).
        let px = RGBABitmap(out)
        for x in [px.w / 8, px.w * 7 / 8] {
            let p = px.at(x, px.h - 10)
            let lum = (Int(p[0]) + Int(p[1]) + Int(p[2])) / 3
            #expect(lum < 90, "expected jacket at x=\(x), got luminance \(lum)")
        }
    }

    @Test func noFaceReturnsNil() throws {
        let garment = try #require(GarmentTemplate.bundled("vest-black"))
        #expect(GarmentFitter.compose(Sample.solidImage(300, 450), garment: garment, background: nil) == nil)
    }
}

private final class BundleToken {}
