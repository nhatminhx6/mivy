import CoreGraphics
import CoreImage
import Vision

/// Face / subject geometry shared by the outfit fitter: jaw line, subject mask and small
/// Core Graphics helpers. Coordinates are top-left (row 0 = top).
enum FaceGeometry {
    // MARK: Face & subject

    /// Jaw line (temple → chin → temple), top-left coordinates. Vision landmarks first; when
    /// Vision is unavailable (the iOS Simulator has no inference context and returns junk
    /// contours) an elliptical jaw is estimated from the Vision face box and Core Image's CPU
    /// face detector (eyes / mouth), taking the lower chin of the two.
    static func jawContour(_ photo: CGImage) -> [CGPoint]? {
        let W = Double(photo.width), H = Double(photo.height)
        var estimate: (cx: Double, top: Double, rx: Double, chin: Double)?
        let request = VNDetectFaceLandmarksRequest()
        VisionCompute.prepare(request)
        if (try? VNImageRequestHandler(cgImage: photo, options: [:]).perform([request])) != nil,
           let face = request.results?.first {
            let box = face.boundingBox
            if let contour = face.landmarks?.faceContour, contour.pointCount > 4 {
                let pts = contour.pointsInImage(imageSize: CGSize(width: W, height: H)).map { CGPoint(x: $0.x, y: H - $0.y) }
                if let lo = pts.map(\.x).min(), let hi = pts.map(\.x).max(), hi - lo > box.width * W * 0.6 { return pts }
            }
            // Face box runs brow → chin (roughly): jaw ≈ its lower half-ellipse.
            estimate = (box.midX * W, (1 - box.midY) * H, box.width * W * 0.47, (1 - box.minY) * H)
        }
        if let ci = coreImageFace(photo) {
            // CIFaceFeature: mouth→chin ≈ 0.8 × eyes→mouth, cheek half-width ≈ 1.05 × eye distance.
            let span = max(1, ci.mouthY - ci.eyeY)
            let chin = ci.mouthY + 0.8 * span
            if let e = estimate {
                estimate = (e.cx, e.top, e.rx, max(e.chin, chin))
            } else {
                estimate = (ci.cx, ci.eyeY + 0.1 * span, ci.eyeDist * 1.05, chin)
            }
        }
        guard let e = estimate, e.chin > e.top else { return nil }
        return halfEllipse(cx: e.cx, top: e.top, rx: e.rx, ry: e.chin - e.top)
    }

    /// Eyes / mouth from Core Image's (CPU) face detector, top-left coordinates.
    private static func coreImageFace(_ photo: CGImage) -> (cx: Double, eyeY: Double, mouthY: Double, eyeDist: Double)? {
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

    private static func halfEllipse(cx: Double, top: Double, rx: Double, ry: Double) -> [CGPoint] {
        stride(from: 0.0, through: .pi, by: .pi / 16).map { a in CGPoint(x: cx - rx * cos(a), y: top + ry * sin(a)) }
    }

    static func subjectMask(_ photo: CGImage) -> CGImage? {
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
