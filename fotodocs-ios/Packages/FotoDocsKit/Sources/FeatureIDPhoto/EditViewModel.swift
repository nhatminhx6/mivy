import SwiftUI
import ImageIO
import FotoDocsCore
import FotoDocsImaging

@MainActor
@Observable
public final class EditViewModel {
    public let target: CaptureTarget
    public var settings = EditSettings() {
        didSet { if settings != oldValue { scheduleRender() } }
    }
    public var preview: UIImage?
    public var isProcessing = false
    public var outfitMissing = false
    /// The chosen background colour is really in the picture (person cut out, or outfit backdrop).
    public var backgroundApplied = true
    private var hasMask = false

    public var faceFound: Bool { face.faceFound }
    public var checklist: [ChecklistItem] = []

    private var source: UIImage
    private let editor = PortraitEditor()
    private var face: FaceCheckResult = .empty
    private var prepared = false
    private var renderTask: Task<Void, Never>?

    public init(target: CaptureTarget, image: UIImage) {
        self.target = target
        self.source = image
    }

    public var passedCount: Int { checklist.filter(\.ok).count }
    public var total: Int { checklist.count }

    public func reset() {
        settings = EditSettings()
    }

    public func onAppear() async {
        guard !prepared, var cgImage = source.cgImage else { return }
        isProcessing = true
        var orientation = CGImagePropertyOrientation(source.imageOrientation)
        if target.infant {
            // a baby is photographed lying down at any angle: turn the picture so the face is upright
            let format = UIGraphicsImageRendererFormat()
            format.scale = 1
            let baked = UIGraphicsImageRenderer(size: source.size, format: format).image { _ in source.draw(at: .zero) }
            if let upright = baked.cgImage {
                let leveled = await Task.detached { FaceLevel.leveled(upright) }.value ?? upright
                cgImage = leveled
                orientation = .up
                source = UIImage(cgImage: leveled)
            }
        }
        face = FaceChecker.analyze(ciImage: CIImage(cgImage: cgImage), orientation: orientation)
        await editor.prepare(cgImage: cgImage, orientation: orientation)
        hasMask = await editor.hasMask()
        prepared = true
        await renderNow()
    }

    private func scheduleRender() {
        guard prepared else { return }
        renderTask?.cancel()
        renderTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 110_000_000)
            guard !Task.isCancelled else { return }
            await self?.renderNow()
        }
    }

    private func renderNow() async {
        guard prepared else { return }
        isProcessing = true
        let current = settings
        let aspect = target.aspect
        if let result = await editor.renderWithOutfit(settings: current, targetAspect: aspect) {
            preview = UIImage(cgImage: result.image)
            outfitMissing = !result.outfitFitted
        }
        let dressed = current.outfit != .keep && !outfitMissing
        backgroundApplied = current.background == .original || hasMask || dressed
        checklist = StandardChecklist.build(
            face: face,
            settings: current,
            sourcePixels: CGSize(width: source.size.width * source.scale, height: source.size.height * source.scale),
            target: target,
            backgroundReplaced: hasMask || dressed
        )
        isProcessing = false
    }
}
