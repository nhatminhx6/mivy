import SwiftUI
import ImageIO
import FotozCore
import FotozImaging

@MainActor
@Observable
public final class EditViewModel {
    public let target: CaptureTarget
    public var settings = EditSettings() {
        didSet { if settings != oldValue { scheduleRender() } }
    }
    public var preview: UIImage?
    public var isProcessing = false
    public var hasPerson = false
    public var checklist: [ChecklistItem] = []

    private let source: UIImage
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

    public func onAppear() async {
        guard !prepared, let cgImage = source.cgImage else { return }
        isProcessing = true
        let orientation = CGImagePropertyOrientation(source.imageOrientation)
        face = FaceChecker.analyze(ciImage: CIImage(cgImage: cgImage), orientation: orientation)
        await editor.prepare(cgImage: cgImage, orientation: orientation)
        hasPerson = await editor.hasMask()
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
        if let cgImage = await editor.render(settings: current, targetAspect: aspect) {
            preview = UIImage(cgImage: cgImage)
        }
        checklist = StandardChecklist.build(
            face: face,
            settings: current,
            sourcePixels: CGSize(width: source.size.width * source.scale, height: source.size.height * source.scale),
            target: target
        )
        isProcessing = false
    }
}
