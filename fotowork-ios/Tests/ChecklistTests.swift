import Testing
import CoreGraphics
import FotoworkCore
import FotoworkImaging

@Suite("StandardChecklist")
struct ChecklistTests {
    private let passingFace = FaceCheckResult(
        faceFound: true, brightnessOK: true, straightOK: true, earsVisible: true,
        roll: 0, yaw: 0, brightness: 0.6, faceBoundingBox: .zero
    )
    private let bigSource = CGSize(width: 1200, height: 1600)

    @Test("All 10 criteria pass with a good face + solid background")
    func allPass() {
        var settings = EditSettings()
        settings.background = .white
        let items = StandardChecklist.build(face: passingFace, settings: settings, sourcePixels: bigSource, target: .idCard4x6)
        #expect(items.count == 10)
        #expect(items.allSatisfy { $0.ok })
    }

    @Test("Original background fails the solid-background criterion")
    func originalBackground() {
        var settings = EditSettings()
        settings.background = .original
        let items = StandardChecklist.build(face: passingFace, settings: settings, sourcePixels: bigSource, target: .idCard4x6)
        #expect(items.first { $0.id == "bg-solid" }?.ok == false)
    }

    @Test("No face fails the face criterion")
    func noFace() {
        let face = FaceCheckResult(faceFound: false, brightnessOK: true)
        let items = StandardChecklist.build(face: face, settings: EditSettings(), sourcePixels: bigSource, target: .idCard4x6)
        #expect(items.first { $0.id == "face" }?.ok == false)
    }

    @Test("Low-resolution source fails the resolution criterion")
    func lowResolution() {
        let items = StandardChecklist.build(
            face: passingFace,
            settings: EditSettings(),
            sourcePixels: CGSize(width: 100, height: 100),
            target: .idCard4x6
        )
        #expect(items.first { $0.id == "res" }?.ok == false)
    }
}
