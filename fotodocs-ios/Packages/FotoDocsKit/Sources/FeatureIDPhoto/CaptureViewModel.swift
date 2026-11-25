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
    /// simulator only: the still photo standing in for the camera feed (nil on a device)
    public private(set) var simFrame: UIImage?
    private var simTask: Task<Void, Never>?
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
        #if targetEnvironment(simulator)
        if !cameraAvailable, let still = SimCamera.image {
            simFrame = still
            cameraAvailable = true
            startSimFeed()
            return
        }
        #endif
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
        simTask?.cancel()
        camera.stop()
    }

    /// The simulator has no camera: feed the checks with the still photo ~5 fps, like the real stream.
    private func startSimFeed() {
        simTask?.cancel()
        guard let still = simFrame, let cg = still.cgImage else { return }
        let orientation = CGImagePropertyOrientation(still.imageOrientation)
        simTask = Task { [weak self] in
            let checked = await Task.detached { FaceChecker.analyze(ciImage: CIImage(cgImage: cg), orientation: orientation) }.value
            while !Task.isCancelled {
                guard let self, self.capturedImage == nil else { return }
                self.apply(checked)
                try? await Task.sleep(for: .milliseconds(200))
            }
        }
    }

    private func takePhoto() {
        if let still = simFrame {
            simTask?.cancel()
            if let data = still.jpegData(compressionQuality: 0.95) { useCaptured(data) }
            return
        }
        camera.capturePhoto()
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
        if autoStreak >= Self.autoFrames { autoStreak = 0; takePhoto() }
    }

    public func shutter() {
        guard cameraAvailable else { return }
        takePhoto()
    }

    public func switchCamera() {
        camera.switchCamera()
    }

    public func retake() {
        autoStreak = 0
        capturedImage = nil
        result = .empty
        if simFrame != nil { startSimFeed() } else if cameraAvailable { camera.start() }
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
        simTask?.cancel()
        camera.stop()
    }
}

#if targetEnvironment(simulator)
/// Stand-in for the camera on the simulator (it has none): Tests/Fixtures/portrait-frontal.jpg from the repo
/// (the simulator reads the Mac's disk), or any photo via the SIM_CAMERA_IMAGE environment variable.
enum SimCamera {
    static let image: UIImage? = {
        let repo = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent().deletingLastPathComponent()
        let path = ProcessInfo.processInfo.environment["SIM_CAMERA_IMAGE"]
            ?? repo.appendingPathComponent("Tests/Fixtures/portrait-frontal.jpg").path
        return UIImage(contentsOfFile: path)
    }()
}
#endif

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
