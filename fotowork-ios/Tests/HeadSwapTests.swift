import Foundation
import CoreGraphics
import ImageIO
import Testing
@testable import FotoworkImaging

/// Head swap onto the bundled suit bodies, with a real frontal portrait (Pixabay sample in Fixtures/).
@Suite struct HeadSwapTests {
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
    func bodyTemplateLoads(_ name: String) throws {
        let body = try #require(BodyTemplate.bundled(name))
        #expect(body.jawW > 100)
        #expect(body.chin > Double(body.image.height) * 0.4 && body.chin < Double(body.image.height) * 0.8)
        #expect(abs(body.cx - Double(body.image.width) / 2) < Double(body.image.width) * 0.1)
    }

    @Test(arguments: [2.0 / 3.0, 3.0 / 4.0])
    func dressesFrontalPortrait(_ aspect: Double) throws {
        let photo = try #require(Self.fixture("portrait-frontal"))
        let body = try #require(BodyTemplate.bundled("body-man-navy"))
        let out = try #require(HeadSwap.compose(user: photo, body: body, aspect: aspect, background: CGColor(gray: 1, alpha: 1)))
        #expect(abs(Double(out.width) / Double(out.height) - aspect) < 0.01)
        if let dir = ProcessInfo.processInfo.environment["FOTOWORK_TEST_OUT"] { Self.save(out, to: dir + "/swap-\(Int(aspect * 100)).png") }

        let px = RGBABitmap(out)
        // bottom corners: dark suit fabric
        for x in [px.w / 8, px.w * 7 / 8] {
            let p = px.at(x, px.h - 10)
            #expect((Int(p[0]) + Int(p[1]) + Int(p[2])) / 3 < 90, "suit at x=\(x)")
        }
        // top corners: the backdrop
        let tl = px.at(4, 4)
        #expect(tl[0] > 240 && tl[1] > 240 && tl[2] > 240)
    }

    @Test func tuningChangesNeckAndHead() throws {
        let photo = try #require(Self.fixture("portrait-frontal"))
        let body = try #require(BodyTemplate.bundled("body-man-navy"))
        let white = CGColor(gray: 1, alpha: 1)
        let base = try #require(HeadSwap.compose(user: photo, body: body, aspect: 2.0 / 3.0, background: white))
        var t = OutfitTuning()
        t.neckBrightness = 0.2
        let brighter = try #require(HeadSwap.compose(user: photo, body: body, aspect: 2.0 / 3.0, background: white, tuning: t))
        // neck centre, between the chin and the collar
        let a = RGBABitmap(base), b = RGBABitmap(brighter)
        let x = a.w / 2, y = Int(Double(a.h) * (HeadSwap.chinFraction + 0.05))
        func lum(_ p: UnsafeMutablePointer<UInt8>) -> Int { Int(p[0]) + Int(p[1]) + Int(p[2]) }
        #expect(lum(b.at(x, y)) > lum(a.at(x, y)) + 15)

        t = OutfitTuning(); t.headScale = 0.85
        let smaller = try #require(HeadSwap.compose(user: photo, body: body, aspect: 2.0 / 3.0, background: white, tuning: t))
        // a smaller head leaves more backdrop at the top centre
        func backdropRows(_ img: CGImage) -> Int {
            let px = RGBABitmap(img); var y = 0
            while y < px.h, lum(px.at(px.w / 2, y)) > 735 { y += 1 }
            return y
        }
        #expect(backdropRows(smaller) > backdropRows(base) + 5)
    }

    @Test func noFaceReturnsNil() throws {
        let body = try #require(BodyTemplate.bundled("body-man-black"))
        #expect(HeadSwap.compose(user: Sample.solidImage(300, 450), body: body, aspect: 2.0 / 3.0, background: CGColor(gray: 1, alpha: 1)) == nil)
    }
}

private final class BundleToken {}
