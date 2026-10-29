import CoreImage
import CoreImage.CIFilterBuiltins
import Vision
import ImageIO

/// Result of the realtime standard checks on one frame. Sendable so it can cross
/// from the camera queue back to the main actor.
public struct FaceCheckResult: Sendable, Equatable {
    public var faceFound: Bool
    public var brightnessOK: Bool
    public var straightOK: Bool
    public var earsVisible: Bool
    public var roll: Double      // degrees
    public var yaw: Double       // degrees
    public var brightness: Double // 0…1 luminance
    public var faceBoundingBox: CGRect // normalised, Vision coordinate space

    public init(
        faceFound: Bool = false,
        brightnessOK: Bool = false,
        straightOK: Bool = false,
        earsVisible: Bool = false,
        roll: Double = 0,
        yaw: Double = 0,
        brightness: Double = 0,
        faceBoundingBox: CGRect = .zero
    ) {
        self.faceFound = faceFound
        self.brightnessOK = brightnessOK
        self.straightOK = straightOK
        self.earsVisible = earsVisible
        self.roll = roll
        self.yaw = yaw
        self.brightness = brightness
        self.faceBoundingBox = faceBoundingBox
    }

    public static let empty = FaceCheckResult()

    public var checks: [(label: String, ok: Bool)] {
        [
            ("Khuôn mặt", faceFound),
            ("Đủ sáng", brightnessOK),
            ("Mặt thẳng", straightOK),
            ("Lộ hai tai", earsVisible),
        ]
    }

    public var passedCount: Int { checks.filter(\.ok).count }
    public var total: Int { checks.count }
    public var passed: Bool { passedCount == total }
}

/// On-device face/standard checker. Synchronous so it can run directly on the
/// camera sample-buffer queue; also used on a picked still image.
public enum FaceChecker {
    // Thresholds (degrees / luminance). Deliberately lenient for v1.
    static let maxRoll = 8.0
    static let maxYaw = 12.0
    static let earsYaw = 10.0
    static let minBrightness = 0.32
    static let maxBrightness = 0.96

    private static let context = CIContext(options: [.workingColorSpace: NSNull()])

    public static func analyze(pixelBuffer: CVPixelBuffer, orientation: CGImagePropertyOrientation) -> FaceCheckResult {
        let handler = VNImageRequestHandler(cvPixelBuffer: pixelBuffer, orientation: orientation, options: [:])
        return run(handler: handler, source: CIImage(cvPixelBuffer: pixelBuffer))
    }

    public static func analyze(ciImage: CIImage, orientation: CGImagePropertyOrientation) -> FaceCheckResult {
        let handler = VNImageRequestHandler(ciImage: ciImage, orientation: orientation, options: [:])
        return run(handler: handler, source: ciImage)
    }

    private static func run(handler: VNImageRequestHandler, source: CIImage) -> FaceCheckResult {
        let brightness = averageLuminance(source)
        let brightnessOK = brightness >= minBrightness && brightness <= maxBrightness

        let request = VNDetectFaceLandmarksRequest()
        guard (try? handler.perform([request])) != nil,
              let face = request.results?.first else {
            return FaceCheckResult(faceFound: false, brightnessOK: brightnessOK, brightness: brightness)
        }

        let roll = degrees(face.roll)
        let yaw = degrees(face.yaw)
        let straight = abs(roll) <= maxRoll && abs(yaw) <= maxYaw
        let ears = abs(yaw) <= earsYaw

        return FaceCheckResult(
            faceFound: true,
            brightnessOK: brightnessOK,
            straightOK: straight,
            earsVisible: ears,
            roll: roll,
            yaw: yaw,
            brightness: brightness,
            faceBoundingBox: face.boundingBox
        )
    }

    private static func degrees(_ radians: NSNumber?) -> Double {
        (radians?.doubleValue ?? 0) * 180 / .pi
    }

    private static func averageLuminance(_ image: CIImage) -> Double {
        let extent = image.extent
        guard extent.width > 0, extent.height > 0, !extent.isInfinite else { return 0.5 }

        let filter = CIFilter.areaAverage()
        filter.inputImage = image
        filter.extent = extent
        guard let output = filter.outputImage else { return 0.5 }

        var pixel = [UInt8](repeating: 0, count: 4)
        context.render(
            output,
            toBitmap: &pixel,
            rowBytes: 4,
            bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
            format: .RGBA8,
            colorSpace: CGColorSpaceCreateDeviceRGB()
        )
        let r = Double(pixel[0]) / 255
        let g = Double(pixel[1]) / 255
        let b = Double(pixel[2]) / 255
        return 0.299 * r + 0.587 * g + 0.114 * b
    }
}
