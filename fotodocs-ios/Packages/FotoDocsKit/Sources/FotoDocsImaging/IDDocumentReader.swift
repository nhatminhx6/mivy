import Vision
import CoreImage
import CoreGraphics
import FotoDocsCore

/// Reads a CCCD (QR code) or a passport (MRZ) on the device. Nothing leaves the phone.
public enum IDDocumentReader {
    public enum Result: Sendable {
        case cccd(CCCDInfo)
        case passport(PassportMRZ)
        /// Read from the printed front of a card without a QR code (old CCCD, CMND): less certain.
        case cccdText(CCCDInfo)
        /// The back of an old CCCD / CMND: the details are on the other side.
        case backSide
        case nothing
    }

    @concurrent
    public static func read(_ image: CGImage) async -> Result {
        let barcodes = VNDetectBarcodesRequest()
        barcodes.symbologies = [.qr]
        let text = VNRecognizeTextRequest()
        text.recognitionLevel = .accurate
        text.recognitionLanguages = ["en-US"]
        text.usesLanguageCorrection = false  // MRZ is not words
        VisionCompute.prepare(barcodes)
        VisionCompute.prepare(text)
        let handler = VNImageRequestHandler(cgImage: image, options: [:])
        try? handler.perform([barcodes, text])

        // Core Image's QR detector as a second chance (no ML model; also works on the simulator)
        let detector = CIDetector(ofType: CIDetectorTypeQRCode, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])
        let fallback = (detector?.features(in: CIImage(cgImage: image)) ?? []).compactMap { ($0 as? CIQRCodeFeature)?.messageString }
        for payload in (barcodes.results ?? []).compactMap(\.payloadStringValue) + fallback {
            if let info = CCCDInfo.parse(payload) { return .cccd(info) }
        }
        let lines = (text.results ?? []).compactMap { $0.topCandidates(1).first?.string }
        if let mrz = PassportMRZ.parse(lines) { return .passport(mrz) }

        // no QR, no MRZ: read the printed Vietnamese text (old CCCD without chip, CMND)
        let vi = VNRecognizeTextRequest()
        vi.recognitionLevel = .accurate
        vi.recognitionLanguages = ["vi-VT", "en-US"]
        VisionCompute.prepare(vi)
        try? handler.perform([vi])
        let rows = ReceiptParser.group((vi.results ?? []).compactMap { obs in
            obs.topCandidates(1).first.map { c in
                let b = obs.boundingBox
                return OCRLine(c.string, box: CGRect(x: b.minX, y: 1 - b.maxY, width: b.width, height: b.height))
            }
        })
        if CCCDInfo.isBackSide(rows) { return .backSide }
        if let info = CCCDInfo.parse(frontText: rows) { return .cccdText(info) }
        return .nothing
    }
}
