import Testing
@testable import FotoDocsImaging

@Suite("Garment overlay")
struct GarmentOverlayTests {
    @Test("Every bundled suit yields clothes with a neck opening under the chin",
          arguments: ["body-man-navy", "body-man-black", "body-woman-navy", "body-woman-black"])
    func garment(_ name: String) throws {
        let g = try #require(Garment.bundled(name))
        #expect(g.collarY > g.chin + 0.1 * g.jawW && g.collarY < g.chin + 0.8 * g.jawW)
        #expect(g.neckW > 0.2 * g.jawW && g.neckW < 0.9 * g.jawW)
        #expect(g.image.height > 1024)   // padded so the suit always reaches the bottom of the frame
    }
}
