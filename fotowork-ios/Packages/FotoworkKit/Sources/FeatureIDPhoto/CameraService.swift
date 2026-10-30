import AVFoundation
import CoreMedia
import FotoworkImaging

/// Owns the AVCaptureSession and runs on-device face checks on the video stream.
/// `@unchecked Sendable`: all mutable state is touched only on `queue` or inside
/// AVFoundation callbacks; only Sendable values cross back out via the closures.
final class CameraService: NSObject, @unchecked Sendable {
    let session = AVCaptureSession()

    private let queue = DispatchQueue(label: "fotowork.camera.session")
    private let videoOutput = AVCaptureVideoDataOutput()
    private let photoOutput = AVCapturePhotoOutput()
    private var position: AVCaptureDevice.Position = .front
    private var configured = false
    private var frameIndex = 0

    /// Called ~5fps with the latest checks (on the camera queue).
    var onResult: (@Sendable (FaceCheckResult) -> Void)?
    /// Called once with captured JPEG data.
    var onPhoto: (@Sendable (Data) -> Void)?

    // MARK: Availability / permission

    static func isSupported() -> Bool {
        !AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInWideAngleCamera, .builtInTrueDepthCamera],
            mediaType: .video,
            position: .unspecified
        ).devices.isEmpty
    }

    static func requestAccess() async -> Bool {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: return true
        case .notDetermined: return await AVCaptureDevice.requestAccess(for: .video)
        default: return false
        }
    }

    // MARK: Lifecycle

    func start() {
        queue.async { [weak self] in
            guard let self else { return }
            if !configured { configure() }
            if !session.isRunning { session.startRunning() }
        }
    }

    func stop() {
        queue.async { [weak self] in
            guard let self, session.isRunning else { return }
            session.stopRunning()
        }
    }

    func switchCamera() {
        queue.async { [weak self] in
            guard let self else { return }
            position = (position == .front) ? .back : .front
            session.beginConfiguration()
            session.inputs.forEach { session.removeInput($0) }
            addInput()
            session.commitConfiguration()
        }
    }

    func capturePhoto() {
        queue.async { [weak self] in
            guard let self else { return }
            let settings = AVCapturePhotoSettings()
            photoOutput.capturePhoto(with: settings, delegate: self)
        }
    }

    // MARK: Configuration (on queue)

    private func configure() {
        session.beginConfiguration()
        session.sessionPreset = .photo

        addInput()

        videoOutput.setSampleBufferDelegate(self, queue: queue)
        videoOutput.alwaysDiscardsLateVideoFrames = true
        if session.canAddOutput(videoOutput) { session.addOutput(videoOutput) }
        if session.canAddOutput(photoOutput) { session.addOutput(photoOutput) }

        session.commitConfiguration()
        configured = true
    }

    private func addInput() {
        guard let device = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.builtInWideAngleCamera],
            mediaType: .video,
            position: position
        ).devices.first,
        let input = try? AVCaptureDeviceInput(device: device),
        session.canAddInput(input) else { return }
        session.addInput(input)
    }

    private var frameOrientation: CGImagePropertyOrientation {
        position == .front ? .leftMirrored : .right
    }
}

// MARK: - Video frames

extension CameraService: AVCaptureVideoDataOutputSampleBufferDelegate {
    func captureOutput(
        _ output: AVCaptureOutput,
        didOutput sampleBuffer: CMSampleBuffer,
        from connection: AVCaptureConnection
    ) {
        frameIndex += 1
        guard frameIndex % 6 == 0 else { return }
        guard let pixelBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let result = FaceChecker.analyze(pixelBuffer: pixelBuffer, orientation: frameOrientation)
        onResult?(result)
    }
}

// MARK: - Still capture

extension CameraService: AVCapturePhotoCaptureDelegate {
    func photoOutput(
        _ output: AVCapturePhotoOutput,
        didFinishProcessingPhoto photo: AVCapturePhoto,
        error: Error?
    ) {
        guard error == nil, let data = photo.fileDataRepresentation() else { return }
        onPhoto?(data)
    }
}
