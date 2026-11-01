import CoreImage
import Vision
import FotoworkCore

public enum ImagingError: Error, Sendable {
    case notImplemented
    case noFaceDetected
    case maskFailed
}

/// Separates the person from the background. Implemented on-device with Vision;
/// designed so a Core ML matting model (e.g. BiRefNet/MODNet) can be swapped in later.
public protocol PersonSegmenting: Sendable {
    func foregroundMask(for image: CIImage) async throws -> CIImage
}

/// Renders an ID photo to exact millimetre size at a target DPI, then compresses
/// JPEG to the preset's KB budget.
public protocol IDPhotoRendering: Sendable {
    func render(_ image: CIImage, printSize: PrintSize, dpi: Int) async throws -> CIImage
}

/// Vision-backed segmenter (foreground instance mask, scaled to the input image).
public struct VisionPersonSegmenter: PersonSegmenting {
    public init() {}

    public func foregroundMask(for image: CIImage) async throws -> CIImage {
        let request = VNGenerateForegroundInstanceMaskRequest()
        VisionCompute.prepare(request)
        let handler = VNImageRequestHandler(ciImage: image, options: [:])
        try handler.perform([request])
        guard let result = request.results?.first, !result.allInstances.isEmpty else { throw ImagingError.maskFailed }
        let buffer = try result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
        return CIImage(cvPixelBuffer: buffer)
    }
}
