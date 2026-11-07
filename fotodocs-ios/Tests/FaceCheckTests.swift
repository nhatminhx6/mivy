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

@Suite("Auto-capture rules")
struct AutoCaptureTests {
    private func good() -> FaceCheckResult {
        FaceCheckResult(faceFound: true, brightnessOK: true, straightOK: true, earsVisible: true,
                        roll: 1, yaw: 2, pitch: 3, brightness: 0.6, faceBoundingBox: CGRect(x: 0.35, y: 0.45, width: 0.3, height: 0.3))
    }

    @Test("Level, centred, neck in frame: ready")
    func ready() { #expect(good().autoCaptureIssue == nil) }

    @Test("Slight tilt that the chips accept still blocks auto-capture")
    func strict() {
        var r = good(); r.roll = 6  // chips allow up to 8°
        #expect(r.autoCaptureIssue == "Giữ đầu thẳng, không nghiêng")
        r = good(); r.pitch = 14
        #expect(r.autoCaptureIssue == "Hơi cúi cằm xuống")
    }

    @Test("Chin near the bottom: neck and shoulders not in frame")
    func neck() {
        var r = good(); r.faceBoundingBox = CGRect(x: 0.35, y: 0.12, width: 0.3, height: 0.3)
        #expect(r.autoCaptureIssue == "Hạ máy thấp xuống, để thấy cổ và vai")
    }
}
