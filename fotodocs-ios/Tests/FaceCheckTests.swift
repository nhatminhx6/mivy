import Testing
import CoreImage
import ImageIO
import FotoDocsImaging

@Suite("FaceChecker brightness")
struct FaceCheckTests {
    private func analyze(_ image: CGImage) -> FaceCheckResult {
        FaceChecker.analyze(ciImage: CIImage(cgImage: image), orientation: .up)
    }

    @Test("Mid-grey frame is bright enough, no face")
    func midGrey() {
        let result = analyze(Sample.solidImage(200, 200, red: 0.5, green: 0.5, blue: 0.5))
        #expect(result.brightnessOK == true)
        #expect(result.faceFound == false)
        #expect(result.passed == false)
    }

    @Test("Dark frame fails brightness")
    func dark() {
        let result = analyze(Sample.solidImage(200, 200, red: 0.02, green: 0.02, blue: 0.02))
        #expect(result.brightnessOK == false)
    }

    @Test("Blown-out white fails brightness (too bright)")
    func tooBright() {
        let result = analyze(Sample.solidImage(200, 200, red: 1, green: 1, blue: 1))
        #expect(result.brightnessOK == false)
    }

    @Test("Checklist summary counts 4 criteria")
    func checksShape() {
        let result = analyze(Sample.solidImage(200, 200))
        #expect(result.total == 4)
        #expect(result.checks.count == 4)
    }
}
