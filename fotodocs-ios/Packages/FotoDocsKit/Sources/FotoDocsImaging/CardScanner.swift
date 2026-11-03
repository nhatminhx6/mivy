import Vision
import CoreImage
import CoreGraphics

/// A card photographed on a table: find it, flatten the perspective, and (bank cards) hide the number.
public enum CardScanner {
    private static let context = CIContext()

    /// The card cut out and squared up, landscape. Nil when no card-shaped rectangle is found.
    public static func extractCard(_ image: CGImage) -> CGImage? {
        let ci = CIImage(cgImage: image)
        guard let quad = rectangle(in: image, ci: ci) else { return nil }
        let filter = CIFilter(name: "CIPerspectiveCorrection")!
        filter.setValue(ci, forKey: kCIInputImageKey)
        filter.setValue(CIVector(cgPoint: quad.tl), forKey: "inputTopLeft")
        filter.setValue(CIVector(cgPoint: quad.tr), forKey: "inputTopRight")
        filter.setValue(CIVector(cgPoint: quad.bl), forKey: "inputBottomLeft")
        filter.setValue(CIVector(cgPoint: quad.br), forKey: "inputBottomRight")
        guard var out = filter.outputImage else { return nil }
        if out.extent.height > out.extent.width {  // card held upright: turn it to landscape
            out = out.oriented(.left)
        }
        return context.createCGImage(out, from: out.extent)
    }

    private struct Quad { var tl, tr, bl, br: CGPoint }

    /// Largest card-shaped quad (aspect ~1.586, either way round), Vision first, Core Image as fallback.
    private static func rectangle(in image: CGImage, ci: CIImage) -> Quad? {
        let w = CGFloat(image.width), h = CGFloat(image.height)
        let request = VNDetectRectanglesRequest()
        request.minimumAspectRatio = 0.5
        request.maximumAspectRatio = 1
        request.minimumSize = 0.25
        request.quadratureTolerance = 20
        request.maximumObservations = 4
        VisionCompute.prepare(request)
        try? VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
        let scale = { (p: CGPoint) in CGPoint(x: p.x * w, y: p.y * h) }
        if let r = (request.results ?? []).max(by: { area($0.boundingBox) < area($1.boundingBox) }) {
            return Quad(tl: scale(r.topLeft), tr: scale(r.topRight), bl: scale(r.bottomLeft), br: scale(r.bottomRight))
        }
        let detector = CIDetector(ofType: CIDetectorTypeRectangle, context: nil,
                                  options: [CIDetectorAccuracy: CIDetectorAccuracyHigh, CIDetectorAspectRatio: 1.586])
        let features = (detector?.features(in: ci) ?? []).compactMap { $0 as? CIRectangleFeature }
        guard let f = features.max(by: { area($0.bounds) < area($1.bounds) }),
              area(f.bounds) > 0.15 * w * h else { return nil }
        return Quad(tl: f.topLeft, tr: f.topRight, bl: f.bottomLeft, br: f.bottomRight)
    }

    private static func area(_ r: CGRect) -> CGFloat { r.width * r.height }

    /// Bank card: every run of card-number digits is covered except the last four; on the back the
    /// three-digit security code is covered too.
    @concurrent
    public static func maskCardNumbers(_ image: CGImage, back: Bool) async -> CGImage {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = false
        VisionCompute.prepare(request)
        try? VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
        var boxes: [CGRect] = []
        for obs in request.results ?? [] {
            guard let cand = obs.topCandidates(1).first else { continue }
            boxes += sensitiveRanges(in: cand.string, back: back).compactMap { try? cand.boundingBox(for: $0)?.boundingBox }
        }
        guard !boxes.isEmpty,
              let ctx = CGContext(data: nil, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: 0,
                                  space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
        else { return image }
        let w = CGFloat(image.width), h = CGFloat(image.height)
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
        ctx.setFillColor(CGColor(gray: 0.55, alpha: 1))
        for b in boxes {  // normalised, bottom-left origin — same as the bitmap context
            ctx.fill(CGRect(x: b.minX * w, y: b.minY * h, width: b.width * w, height: b.height * h).insetBy(dx: -3, dy: -3))
        }
        return ctx.makeImage() ?? image
    }

    /// Ranges of a recognised line to hide: card numbers (13–19 digits, grouped or not) minus the last
    /// four digits; on the back also a lone 3–4 digit code (CVV).
    public static func sensitiveRanges(in text: String, back: Bool) -> [Range<String.Index>] {
        var out: [Range<String.Index>] = []
        let digits = text.indices.filter { text[$0].isNumber }
        if digits.count >= 13 {
            // hide from the first digit up to (not including) the fourth-from-last digit
            out.append(digits.first!..<digits[digits.count - 4])
        } else if back, (3...4).contains(digits.count), text.trimmingCharacters(in: .whitespaces).allSatisfy(\.isNumber) {
            out.append(text.startIndex..<text.endIndex)
        }
        return out
    }
}

/// Levels a face that is tilted or lying sideways (a baby photographed on a sheet).
public enum FaceLevel {
    /// Degrees to rotate the image (counter-clockwise, as on screen) so the face is upright;
    /// nil when no face is found. Core Image's detector needs no ML model, so it works everywhere.
    public static func correction(for image: CGImage) -> Double? {
        let detector = CIDetector(ofType: CIDetectorTypeFace, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])
        let ci = CIImage(cgImage: image)
        // EXIF orientation hint → how far the content is turned; faceAngle runs clockwise
        for (orientation, base) in [(1, 0.0), (6, 90.0), (8, -90.0), (3, 180.0)] {
            let faces = (detector?.features(in: ci, options: [CIDetectorImageOrientation: orientation]) ?? [])
                .compactMap { $0 as? CIFaceFeature }
            guard let face = faces.max(by: { $0.bounds.width < $1.bounds.width }) else { continue }
            let angle = face.hasFaceAngle ? Double(face.faceAngle) : 0
            return normalised(angle - base)
        }
        return nil
    }

    /// The image turned so the face is upright, or nil when it already is (within 3°) or has no face.
    /// Measures twice (the second pass catches what the first estimate missed) and rotates the
    /// original once by the total, so the pixels are resampled only once.
    public static func leveled(_ image: CGImage) -> CGImage? {
        guard let first = correction(for: image), abs(first) > 3,
              let trial = rotated(image, degrees: first) else { return nil }
        let residual = correction(for: trial).flatMap { abs($0) < 20 ? $0 : nil } ?? 0
        return abs(residual) > 1.5 ? rotated(image, degrees: first + residual) : trial
    }

    static func normalised(_ deg: Double) -> Double {
        var d = deg.truncatingRemainder(dividingBy: 360)
        if d > 180 { d -= 360 }
        if d <= -180 { d += 360 }
        return d
    }

    /// Rotated counter-clockwise by `degrees`, canvas grown to fit, new corners filled white.
    public static func rotated(_ image: CGImage, degrees: Double) -> CGImage? {
        let r = degrees * .pi / 180
        let w = Double(image.width), h = Double(image.height)
        let nw = abs(w * cos(r)) + abs(h * sin(r)), nh = abs(w * sin(r)) + abs(h * cos(r))
        guard let ctx = CGContext(data: nil, width: Int(nw.rounded()), height: Int(nh.rounded()), bitsPerComponent: 8, bytesPerRow: 0,
                                  space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
        else { return nil }
        ctx.setFillColor(CGColor(gray: 1, alpha: 1))
        ctx.fill(CGRect(x: 0, y: 0, width: nw, height: nh))
        ctx.interpolationQuality = .high
        ctx.translateBy(x: nw / 2, y: nh / 2)
        ctx.rotate(by: r)
        ctx.draw(image, in: CGRect(x: -w / 2, y: -h / 2, width: w, height: h))
        return ctx.makeImage()
    }
}
