import Vision
import CoreGraphics
import CoreImage
import FotoDocsCore

/// On-device OCR for receipts (Vision, Vietnamese + English). Nothing leaves the phone.
public enum ReceiptReader {
    private static let context = CIContext()

    @concurrent
    public static func read(_ image: CGImage) async -> [OCRLine] {
        guard let first = recognize(image) else { return [] }
        // A receipt photographed a few degrees off: the parser pairs "TỔNG" with the figure on the same visual row,
        // and at 5° the right-hand column already sits a whole line lower. Straighten and read again.
        let angle = skew(first, width: CGFloat(image.width), height: CGFloat(image.height))
        guard abs(angle) > 1 * .pi / 180, abs(angle) < 25 * .pi / 180,
              let straight = rotated(image, by: -angle), let second = recognize(straight) else { return lines(first) }
        return lines(second)
    }

    private static func recognize(_ image: CGImage) -> [VNRecognizedTextObservation]? {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["vi-VT", "en-US"]
        request.usesLanguageCorrection = true
        guard (try? VNImageRequestHandler(cgImage: image, options: [:]).perform([request])) != nil else { return nil }
        return request.results
    }

    private static func lines(_ results: [VNRecognizedTextObservation]) -> [OCRLine] {
        results.compactMap { obs in
            guard let text = obs.topCandidates(1).first?.string else { return nil }
            let b = obs.boundingBox  // normalised, bottom-left origin
            return OCRLine(text, box: CGRect(x: b.minX, y: 1 - b.maxY, width: b.width, height: b.height))
        }
    }

    /// Median slope of the text lines (radians, counter-clockwise), from their own top edges, in pixels.
    static func skew(_ results: [VNRecognizedTextObservation], width: CGFloat, height: CGFloat) -> CGFloat {
        let angles = results.compactMap { obs -> CGFloat? in
            let dx = (obs.topRight.x - obs.topLeft.x) * width, dy = (obs.topRight.y - obs.topLeft.y) * height
            return dx > 60 ? atan2(dy, dx) : nil  // short boxes give noisy angles
        }.sorted()
        return angles.isEmpty ? 0 : angles[angles.count / 2]
    }

    private static func rotated(_ image: CGImage, by angle: CGFloat) -> CGImage? {
        let ci = CIImage(cgImage: image)
        let turned = ci.transformed(by: CGAffineTransform(rotationAngle: angle))
        let extent = turned.extent.integral
        let flat = turned.composited(over: CIImage(color: CIColor(red: 1, green: 1, blue: 1)).cropped(to: extent))
        return context.createCGImage(flat, from: extent)
    }
}
