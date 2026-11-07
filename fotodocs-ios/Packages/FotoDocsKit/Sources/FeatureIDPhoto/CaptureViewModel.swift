import SwiftUI
import AVFoundation
import PhotosUI
import ImageIO
import FotoDocsCore
import FotoDocsImaging

@MainActor
@Observable
public final class CaptureViewModel {
    public let target: CaptureTarget
    public var result: FaceCheckResult = .empty
    public var cameraAvailable = false
    public var permissionDenied = false
    public var capturedImage: UIImage?
    public var isBusy = false

    /// Shoot by itself once the pose has been right and still for a moment. Off = shutter only.
    public var autoCapture = true
    /// What to fix before the camera shoots by itself (nil = ready, holding still).
    public var autoHint: String?

    private let camera = CameraService()
    private var autoStreak = 0
    private var lastCenter: CGPoint?
    /// ~2 s at the analysis rate (every 6th frame)
    private static let autoFrames = 10

    public init(target: CaptureTarget) {
        self.target = target
    }

    var session: AVCaptureSession { camera.session }

    public func onAppear() async {
        cameraAvailable = CameraService.isSupported()
        guard cameraAvailable else { return }
        let granted = await CameraService.requestAccess()
        guard granted else {
            permissionDenied = true
            cameraAvailable = false
            return
        }
        camera.onResult = { [weak self] result in
            Task { @MainActor in self?.apply(result) }
        }
        camera.onPhoto = { [weak self] data in
            Task { @MainActor in self?.useCaptured(data) }
        }
        camera.start()
    }

    public func onDisappear() {
        camera.stop()
    }

    private func apply(_ result: FaceCheckResult) {
        guard capturedImage == nil else { return }
        self.result = result
        let b = result.faceBoundingBox, center = CGPoint(x: b.midX, y: b.midY)
        let still = lastCenter.map { hypot($0.x - center.x, $0.y - center.y) < 0.02 } ?? false
        lastCenter = center
        var issue = result.autoCaptureIssue
        if issue == nil && !still { issue = "Giữ yên" }
        autoHint = issue
        guard autoCapture, issue == nil else { autoStreak = 0; return }
        autoStreak += 1
        if autoStreak >= Self.autoFrames { autoStreak = 0; camera.capturePhoto() }
    }

    public func shutter() {
        guard cameraAvailable else { return }
        camera.capturePhoto()
    }

    public func switchCamera() {
        camera.switchCamera()
    }

    public func retake() {
        autoStreak = 0
        capturedImage = nil
        result = .empty
        if cameraAvailable { camera.start() }
    }

    private func useCaptured(_ data: Data) {
        capturedImage = UIImage(data: data)
        camera.stop()
    }

    public func analyzePicked(_ item: PhotosPickerItem?) async {
        guard let item else { return }
        isBusy = true
        defer { isBusy = false }
        guard
            let data = try? await item.loadTransferable(type: Data.self),
            let image = UIImage(data: data),
            let cgImage = image.cgImage
        else { return }

        let orientation = CGImagePropertyOrientation(image.imageOrientation)
        result = FaceChecker.analyze(ciImage: CIImage(cgImage: cgImage), orientation: orientation)
        capturedImage = image
        camera.stop()
    }
}

extension CGImagePropertyOrientation {
    init(_ uiOrientation: UIImage.Orientation) {
        switch uiOrientation {
        case .up: self = .up
        case .upMirrored: self = .upMirrored
        case .down: self = .down
        case .downMirrored: self = .downMirrored
        case .left: self = .left
        case .leftMirrored: self = .leftMirrored
        case .right: self = .right
        case .rightMirrored: self = .rightMirrored
        @unknown default: self = .up
        }
    }
}
