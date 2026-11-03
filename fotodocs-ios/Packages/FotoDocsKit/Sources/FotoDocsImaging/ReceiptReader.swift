import Vision
import CoreGraphics
import FotoDocsCore

/// On-device OCR for receipts (Vision, Vietnamese + English). Nothing leaves the phone.
public enum ReceiptReader {
    @concurrent
    public static func read(_ image: CGImage) async -> [OCRLine] {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["vi-VT", "en-US"]
        request.usesLanguageCorrection = true
        let handler = VNImageRequestHandler(cgImage: image, options: [:])
        guard (try? handler.perform([request])) != nil, let results = request.results else { return [] }
        return results.compactMap { obs in
            guard let text = obs.topCandidates(1).first?.string else { return nil }
            let b = obs.boundingBox  // normalised, bottom-left origin
            return OCRLine(text, box: CGRect(x: b.minX, y: 1 - b.maxY, width: b.width, height: b.height))
        }
    }
}
