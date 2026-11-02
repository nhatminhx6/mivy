import CoreGraphics
import CoreImage
import Vision

/// Face / subject geometry shared by the outfit fitter: jaw line, subject mask and small
/// Core Graphics helpers. Coordinates are top-left (row 0 = top).
enum FaceGeometry {
    /// Vision's face / subject models need an inference context the iOS Simulator lacks (junk
    /// contours, no masks), so the simulator always takes the image-based fallbacks. Tests flip
    /// this to exercise the fallbacks on a Mac.
    nonisolated(unsafe) static var useVision: Bool = {
        #if targetEnvironment(simulator)
        false
        #else
        true
        #endif
    }()

    // MARK: Face & subject

    /// Jaw line (temple → chin → temple), top-left coordinates. Vision landmarks when available,
    /// else `estimatedJaw`.
    static func jawContour(_ photo: CGImage) -> [CGPoint]? {
        guard useVision else { return estimatedJaw(photo) }
        let W = Double(photo.width), H = Double(photo.height)
        let request = VNDetectFaceLandmarksRequest()
        VisionCompute.prepare(request)
        if (try? VNImageRequestHandler(cgImage: photo, options: [:]).perform([request])) != nil,
           let face = request.results?.first,
           let contour = face.landmarks?.faceContour, contour.pointCount > 4 {
            let pts = contour.pointsInImage(imageSize: CGSize(width: W, height: H)).map { CGPoint(x: $0.x, y: H - $0.y) }
            if let lo = pts.map(\.x).min(), let hi = pts.map(\.x).max(), hi - lo > face.boundingBox.width * W * 0.6 { return pts }
        }
        return estimatedJaw(photo)
    }

    /// Average Vision jaw of frontal portraits, left temple → chin → right temple:
    /// x in jaw widths from the centre, y from the eye line (0) to the chin (1).
    private static let jawTemplate: [(Double, Double)] = {
        let side: [(Double, Double)] = [(0.5, 0), (0.497, 0.172), (0.482, 0.333), (0.46, 0.493), (0.417, 0.647),
                                         (0.342, 0.78), (0.244, 0.888), (0.13, 0.97)]
        return side.map { (-$0.0, $0.1) } + [(0, 1)] + side.reversed()
    }()

    /// Jaw without Vision: Core Image's CPU detector (eyes, mouth) scales the average jaw
    /// (width 2.16 × eye distance, chin 0.66 × eyes→mouth below the mouth — measured with Vision
    /// on frontal portraits); the chin then follows the shadow edge under it (which sits ~0.05
    /// above the outline), never above 0.62: a chin cut too high is far worse than too low.
    static func estimatedJaw(_ photo: CGImage) -> [CGPoint]? {
        guard let ci = coreImageFace(photo) else { return nil }
        let span = max(1, ci.mouthY - ci.eyeY)
        let width = 2.16 * ci.eyeDist
        let guess = ci.mouthY + 0.66 * span
        let edge = chinEdge(RGBABitmap(photo), cx: ci.cx, around: guess, span: span, halfW: 0.18 * ci.eyeDist).map { $0 + 0.05 * span } ?? guess
        let chin = max(edge, ci.mouthY + 0.62 * span)
        guard chin > ci.eyeY else { return nil }
        return jawTemplate.map { CGPoint(x: ci.cx + $0.0 * width, y: ci.eyeY + $0.1 * (chin - ci.eyeY)) }
    }

    /// Bottom of the chin: strongest bright → dark step (skin → shadow under the chin) on the
    /// centre line within ±0.15 eyes→mouth of the guess. nil when no clear step.
    static func chinEdge(_ px: RGBABitmap, cx: Double, around guess: Double, span: Double, halfW: Double) -> Double? {
        let k = max(2, Int(0.05 * span))
        let y0 = Int(guess - 0.15 * span), y1 = Int(guess + 0.15 * span)
        guard y0 - k >= 0, y1 + k < px.h else { return nil }
        var lum = [Int: Double]()
        for y in (y0 - k)...(y1 + k) {
            var s = 0.0, n = 0.0
            for x in Int(cx - halfW)...Int(cx + halfW) {
                let p = px.clamped(x, y); s += 0.299 * Double(p[0]) + 0.587 * Double(p[1]) + 0.114 * Double(p[2]); n += 1
            }
            lum[y] = s / n
        }
        var best: (y: Int, g: Double)?
        for y in y0...y1 {
            var above = 0.0, below = 0.0
            for d in 1...k { above += lum[y - d]!; below += lum[y + d]! }
            let g = (above - below) / Double(k)
            if g > (best?.g ?? 0) { best = (y, g) }
        }
        guard let best, best.g > 8 else { return nil }
        return Double(best.y)
    }

    /// Eyes / mouth from Core Image's (CPU) face detector, top-left coordinates.
    static func coreImageFace(_ photo: CGImage) -> (cx: Double, eyeY: Double, mouthY: Double, eyeDist: Double)? {
        let H = Double(photo.height)
        let detector = CIDetector(ofType: CIDetectorTypeFace, context: ciContext, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])
        guard let face = detector?.features(in: CIImage(cgImage: photo))
            .compactMap({ $0 as? CIFaceFeature })
            .max(by: { $0.bounds.width < $1.bounds.width }) else { return nil }
        let b = face.bounds
        var cx = b.midX, eyeY = H - (b.minY + b.height * 0.62), mouthY = H - (b.minY + b.height * 0.22)
        var eyeDist = b.width * 0.42
        if face.hasLeftEyePosition, face.hasRightEyePosition {
            eyeY = H - (face.leftEyePosition.y + face.rightEyePosition.y) / 2
            eyeDist = abs(face.rightEyePosition.x - face.leftEyePosition.x)
            cx = (face.leftEyePosition.x + face.rightEyePosition.x) / 2
        }
        if face.hasMouthPosition { mouthY = H - face.mouthPosition.y }
        return (cx, eyeY, mouthY, eyeDist)
    }

    static func subjectMask(_ photo: CGImage) -> CGImage? {
        guard useVision else { return nil }
        let request = VNGenerateForegroundInstanceMaskRequest()
        VisionCompute.prepare(request)
        let handler = VNImageRequestHandler(cgImage: photo, options: [:])
        guard (try? handler.perform([request])) != nil,
              let result = request.results?.first, !result.allInstances.isEmpty,
              let buffer = try? result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
        else { return nil }
        let ci = CIImage(cvPixelBuffer: buffer)
        return ciContext.createCGImage(ci, from: ci.extent, format: .L8, colorSpace: gray)
    }

    /// No subject mask available: treat the whole frame as the person (the head ellipse still limits it).
    static func allOnes(_ w: Double, _ h: Double) -> CGImage? {
        let c = grayContext(w, h)
        c.fill(CGRect(x: 0, y: 0, width: w, height: h))
        return c.makeImage()
    }

    // MARK: Helpers

    static let ciContext = CIContext()
    static let gray = CGColorSpaceCreateDeviceGray()

    static func grayContext(_ w: Double, _ h: Double) -> CGContext {
        let c = CGContext(data: nil, width: Int(w), height: Int(h), bitsPerComponent: 8, bytesPerRow: 0,
                          space: gray, bitmapInfo: CGImageAlphaInfo.none.rawValue)!
        c.setFillColor(gray: 1, alpha: 1)
        return c
    }

    static func rgbaContext(_ w: Double, _ h: Double) -> CGContext? {
        CGContext(data: nil, width: Int(w), height: Int(h), bitsPerComponent: 8, bytesPerRow: 0,
                  space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    }

    static func feathered(_ image: CGImage?, sigma: Double, _ full: CGRect) -> CGImage? {
        guard let image else { return nil }
        let blurred = CIImage(cgImage: image).clampedToExtent().applyingGaussianBlur(sigma: sigma).cropped(to: full)
        return ciContext.createCGImage(blurred, from: full, format: .L8, colorSpace: gray)
    }

    static func intersect(_ region: CGImage, _ mask: CGImage, _ full: CGRect) -> CGImage? {
        let c = grayContext(full.width, full.height)
        c.clip(to: full, mask: region)
        c.draw(mask, in: full)
        return c.makeImage()
    }

    /// Lowest jaw-line y at column `x`, or nil outside the jaw.
    static func jawY(_ pts: [CGPoint], _ x: Double) -> Double? {
        var best: Double?
        for (a, b) in zip(pts, pts.dropFirst()) where (a.x - x) * (b.x - x) <= 0 && a.x != b.x {
            let y = a.y + (x - a.x) / (b.x - a.x) * (b.y - a.y)
            best = max(best ?? y, y)
        }
        return best
    }
}

// MARK: - Pixel access

/// RGBA8 premultiplied buffer, row 0 = top.
final class RGBABitmap {
    let w: Int, h: Int
    private let ctx: CGContext
    private let p: UnsafeMutablePointer<UInt8>

    init(width: Int, height: Int) {
        w = width; h = height
        ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        p = ctx.data!.assumingMemoryBound(to: UInt8.self)
    }

    convenience init(_ image: CGImage, width: Int? = nil, height: Int? = nil) {
        self.init(width: width ?? image.width, height: height ?? image.height)
        ctx.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
    }

    @inline(__always) func at(_ x: Int, _ y: Int) -> UnsafeMutablePointer<UInt8> { p + (y * w + x) * 4 }
    /// Edge-clamped access.
    @inline(__always) func clamped(_ x: Int, _ y: Int) -> UnsafeMutablePointer<UInt8> { at(min(w - 1, max(0, x)), min(h - 1, max(0, y))) }
    func image() -> CGImage? { ctx.makeImage() }
}
