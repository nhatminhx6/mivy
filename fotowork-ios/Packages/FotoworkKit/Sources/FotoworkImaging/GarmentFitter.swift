import CoreGraphics
import CoreImage
import ImageIO
import Vision

// MARK: - Template

/// A real garment cut-out (front view, transparent background, open collar), measured once.
/// Templates are pre-made offline (PSD clothing layers) and bundled — never generated per user.
public final class GarmentTemplate: @unchecked Sendable {
    public let name: String
    let image: CGImage
    /// Template pixels, rows counted from the top.
    let collarTop: Double       // first row where fabric closes around the neck
    let neckCX: Double          // centre of the collar opening
    let neckW: Double           // opening width just under `collarTop`
    let holeTopW: Double        // opening width at `collarTop`
    let holeBottom: Int         // row where the shirt / tie closes the opening
    let holeHalf: [Int: Double] // opening half-width per row

    public init?(name: String, image: CGImage) {
        let b = RGBABitmap(image)
        let cx = b.w / 2, reach = Int(Double(b.w) * 0.3)
        func edges(_ y: Int) -> (Int, Int)? {
            var l: Int?, r: Int?
            for x in stride(from: cx, through: max(0, cx - reach), by: -1) where b.at(x, y)[3] > 128 { l = x; break }
            for x in cx..<min(b.w, cx + reach) where b.at(x, y)[3] > 128 { r = x; break }
            if let l, let r, r - l > 4 { return (l, r) }
            return nil
        }
        guard let top = (0..<b.h).first(where: { edges($0) != nil }) else { return nil }
        let probe = min(b.h - 1, top + Int(Double(b.h) * 0.03))
        let (pl, pr) = edges(probe) ?? (cx - 20, cx + 20)
        let ncx = (pl + pr) / 2

        var bottom = top
        while bottom < b.h - 1 && b.at(ncx, bottom)[3] < 128 { bottom += 1 }
        var half = [Int: Double](), topW = 0
        for y in top..<bottom {
            var l = ncx, r = ncx
            while l > 0 && b.at(l - 1, y)[3] < 128 { l -= 1 }
            while r < b.w - 1 && b.at(r + 1, y)[3] < 128 { r += 1 }
            if l == 0 || r == b.w - 1 { continue }
            if topW == 0 { topW = r - l }
            half[y] = Double(r - l) / 2
        }
        guard topW > 0 else { return nil }

        self.name = name
        self.image = image
        collarTop = Double(top)
        neckCX = Double(ncx)
        neckW = Double(pr - pl)
        holeTopW = Double(topW)
        holeBottom = bottom
        holeHalf = half
    }

    /// Loads a template bundled in `Resources/Garments`.
    public static func bundled(_ name: String) -> GarmentTemplate? {
        guard let url = bundleURL(name),
              let src = CGImageSourceCreateWithURL(url as CFURL, nil),
              let image = CGImageSourceCreateImageAtIndex(src, 0, nil)
        else { return nil }
        return GarmentTemplate(name: name, image: image)
    }

    public static func bundleURL(_ name: String) -> URL? {
        Bundle.module.url(forResource: name, withExtension: "png", subdirectory: "Garments")
    }
}

// MARK: - Fitter

/// Puts a garment template on a portrait, on-device (Vision + Core Graphics):
/// the collar opening is scaled to the neck and hung just under the chin, a neck is shaded in
/// from the person's own skin tone, the old clothing is cleared, and the head is drawn back on
/// top so the collar tucks under the jaw. The face itself is never altered.
public enum GarmentFitter {
    /// Collar opening width as a fraction of the jaw width.
    static let collarOpening = 0.8
    /// How far below the chin the collar starts, in jaw widths.
    static let collarDrop = 0.12

    /// - Parameter background: fill for cleared areas; `nil` keeps the photo behind.
    /// - Returns: `nil` when no face / subject is found.
    public static func compose(_ photo: CGImage, garment: GarmentTemplate, background: CGColor?) -> CGImage? {
        let W = Double(photo.width), H = Double(photo.height)
        guard W > 16, H > 16 else { return nil }
        let full = CGRect(x: 0, y: 0, width: W, height: H)

        // 1. Face contour (top-left coordinates from here on) + subject mask.
        // Without a subject mask (simulator, or segmentation miss) the background could not be
        // replaced either, so keep the photo itself as the backdrop instead of cutting a halo.
        let segmented = subjectMask(photo)
        let background = segmented == nil ? nil : background
        guard let pts = jawContour(photo), let personMask = segmented ?? allOnes(W, H),
              let minX = pts.map(\.x).min(), let maxX = pts.map(\.x).max(), let chinY = pts.map(\.y).max() else { return nil }
        let jawW = maxX - minX, faceCX = (minX + maxX) / 2
        guard jawW > 8 else { return nil }
        func flip(_ r: CGRect) -> CGRect { CGRect(x: r.minX, y: H - r.maxY, width: r.width, height: r.height) }

        // 2. Garment placement: opening ≈ neck, always wide enough to reach both frame edges.
        let g = garment
        let s = max(collarOpening * jawW / g.neckW,
                    0.54 * W / min(g.neckCX, Double(g.image.width) - g.neckCX))
        let vx = faceCX - g.neckCX * s
        let vy = chinY + collarDrop * jawW - g.collarTop * s
        let vw = Double(g.image.width) * s, vh = Double(g.image.height) * s
        let collarY = vy + g.collarTop * s
        let holeBottomY = vy + Double(g.holeBottom) * s

        // 3. Neck tone: the visible neck under the chin (if any) blended with the cheeks.
        let px = RGBABitmap(photo)
        let pm = RGBABitmap(personMask, width: Int(W), height: Int(H))
        func patch(_ x: Double, _ y: Double) -> [Double] {
            var acc = [0.0, 0.0, 0.0], n = 0.0
            let r = max(2, Int(jawW * 0.04))
            for dy in -r...r { for dx in -r...r {
                let p = px.at(min(px.w - 1, max(0, Int(x) + dx)), min(px.h - 1, max(0, Int(y) + dy)))
                for c in 0..<3 { acc[c] += Double(p[c]) }; n += 1
            } }
            return acc.map { $0 / n }
        }
        let cl = patch(faceCX - 0.24 * jawW, chinY - 0.45 * jawW)
        let cr = patch(faceCX + 0.24 * jawW, chinY - 0.45 * jawW)
        let cheeks = (0..<3).map { (cl[$0] + cr[$0]) / 2 * 0.9 }
        let lumRef = (cl.reduce(0, +) + cr.reduce(0, +)) / 6
        func isSkin(_ x: Int, _ y: Int) -> Bool {
            guard x >= 0, x < px.w, y >= 0, y < px.h else { return false }
            let p = px.at(x, y)
            if p[3] < 200 || pm.at(x, y)[0] < 128 { return false }
            let r = Double(p[0]), gg = Double(p[1]), b = Double(p[2]), l = (r + gg + b) / 3
            return r > gg && gg >= b - 6 && (r - b) / max(r, 1) > 0.12 && l > 0.3 * lumRef && l < 1.2 * lumRef
        }
        var neckWidth = 0.62 * jawW
        let realTop = Int(chinY + 0.02 * jawW)
        var realEnd = realTop - 1
        let probeHalf = Int(neckWidth * 0.22)
        while realEnd + 1 < min(px.h - 1, Int(holeBottomY)) {
            let y = realEnd + 1
            let hits = stride(from: -probeHalf, through: probeHalf, by: 2).filter { isSkin(Int(faceCX) + $0, y) }.count
            if Double(hits) / Double(probeHalf + 1) < 0.7 { break }
            realEnd = y
        }
        let realH = realEnd - realTop + 1
        var neckTone = cheeks
        if realH >= 3 {
            var acc = [0.0, 0.0, 0.0], n = 0.0
            for y in realTop...realEnd {
                for x in Int(faceCX - neckWidth * 0.25)...Int(faceCX + neckWidth * 0.25) where isSkin(x, y) {
                    let p = px.at(x, y); for c in 0..<3 { acc[c] += Double(p[c]) }; n += 1
                }
            }
            if n > 20 { neckTone = (0..<3).map { acc[$0] / n * 0.3 + cheeks[$0] * 0.7 } }
            if realH >= Int(0.05 * jawW) {
                let my = (realTop + realEnd) / 2
                var l = Int(faceCX), r = Int(faceCX)
                while l > 0 && isSkin(l - 1, my) { l -= 1 }
                while r < px.w - 1 && isSkin(r + 1, my) { r += 1 }
                neckWidth = Double(r - l)
            }
        }
        neckWidth = min(0.7 * jawW, max(0.56 * jawW, neckWidth))

        // 4. Neck outline: from under the jaw angles, narrowest below the chin, flaring into the
        //    collar opening and following it down to where the shirt closes.
        let sideCutY = chinY - 0.2 * jawW
        var jawTopHalf = neckWidth / 2
        var jawXs = [Double]()
        for (a, b) in zip(pts, pts.dropFirst()) where (a.y - sideCutY) * (b.y - sideCutY) <= 0 && a.y != b.y {
            jawXs.append(a.x + (sideCutY - a.y) / (b.y - a.y) * (b.x - a.x))
        }
        if let lo = jawXs.min(), let hi = jawXs.max(), hi > lo {
            jawTopHalf = min(0.45 * jawW, max(faceCX - lo, hi - faceCX) * 0.92)
        }
        let bottomHalf = max(neckWidth / 2, g.holeTopW * s / 2 + 1)
        let topHalf = max(neckWidth / 2, bottomHalf * 0.9)
        let waist = chinY + 0.1 * jawW
        func halfWidth(_ y: Double) -> Double {
            if y >= collarY {
                let ty = Int((y - vy) / s)
                return max(neckWidth * 0.25, (g.holeHalf[ty] ?? g.holeHalf[ty - 1] ?? g.holeTopW / 2) * s + 1)
            }
            let start = max(topHalf, jawTopHalf)
            if y <= sideCutY { return start }
            if y <= waist {
                let t = (y - sideCutY) / (waist - sideCutY)
                return start + (topHalf - start) * t * t * (3 - 2 * t)
            }
            if collarY <= waist { return bottomHalf }
            let t = min(1, (y - waist) / (collarY - waist))
            return topHalf + (bottomHalf - topHalf) * t * t
        }
        let nTop = chinY - 0.25 * jawW, nBot = holeBottomY + 2
        let outline = grayContext(W, H)
        var left = [CGPoint](), right = [CGPoint]()
        for y in stride(from: nTop, through: nBot, by: 1) {
            let hw = halfWidth(y)
            left.append(CGPoint(x: faceCX - hw, y: H - y))
            right.append(CGPoint(x: faceCX + hw, y: H - y))
        }
        outline.addLines(between: left + right.reversed())
        outline.closePath(); outline.fillPath()
        guard let neckMask = feathered(outline.makeImage(), sigma: max(0.8, jawW * 0.012), full) else { return nil }

        // 5. Shaded neck (cylinder falloff, lighter away from the jaw, faint grain).
        let neck = RGBABitmap(width: Int(W), height: Int(H))
        var seed: UInt64 = 0x9E3779B97F4A7C15
        for y in max(0, Int(nTop))..<min(neck.h, Int(nBot) + 2) {
            let hw = halfWidth(Double(y))
            let t = min(1, max(0, (Double(y) - chinY) / (0.3 * jawW)))
            for x in max(0, Int(faceCX - hw - 2))..<min(neck.w, Int(faceCX + hw + 2)) {
                let u = (Double(x) - faceCX) / max(1, hw)
                seed = seed &* 6364136223846793005 &+ 1442695040888963407
                let grain = 1 + (Double(seed >> 40 & 0xFF) / 255 - 0.5) * 0.04
                let shade = (0.82 + 0.18 * t) * (1 - 0.32 * pow(abs(u), 2.5)) * grain
                let d = neck.at(x, y)
                for c in 0..<3 { d[c] = UInt8(min(255, neckTone[c] * shade)) }
                d[3] = 255
            }
        }

        // 6. Masks: keep the person only in an ellipse around the head (hair stays, old
        //    shoulders go), minus a zone around the new neck; the jaw always stays.
        let jawPath = CGMutablePath()
        jawPath.addLines(between: pts.map { CGPoint(x: $0.x, y: H - $0.y) })
        jawPath.closeSubpath()
        let keep = grayContext(W, H)
        keep.fillEllipse(in: flip(CGRect(x: faceCX - 0.9 * jawW, y: chinY - 2.15 * jawW, width: 1.8 * jawW, height: 2.6 * jawW)))
        keep.fill(flip(CGRect(x: 0, y: 0, width: W, height: chinY - 0.85 * jawW)))
        keep.setFillColor(gray: 0, alpha: 1)
        keep.addLines(between: [
            CGPoint(x: faceCX - jawTopHalf - 0.02 * jawW, y: sideCutY), CGPoint(x: faceCX + jawTopHalf + 0.02 * jawW, y: sideCutY),
            CGPoint(x: faceCX + 0.85 * jawW, y: collarY + 0.4 * jawW), CGPoint(x: faceCX - 0.85 * jawW, y: collarY + 0.4 * jawW),
        ].map { CGPoint(x: $0.x, y: H - $0.y) })
        keep.closePath(); keep.fillPath()
        keep.setFillColor(gray: 1, alpha: 1)
        keep.addPath(jawPath); keep.fillPath()
        guard let keepSoft = feathered(keep.makeImage(), sigma: jawW * 0.03, full),
              let backMask = intersect(keepSoft, personMask, full) else { return nil }

        let headRegion = grayContext(W, H)
        headRegion.fill(flip(CGRect(x: 0, y: 0, width: W, height: chinY + 0.02 * jawW)))
        headRegion.addPath(jawPath); headRegion.fillPath()
        guard let headSoft = feathered(headRegion.makeImage(), sigma: max(1, jawW * 0.006), full),
              let headMask = intersect(headSoft, backMask, full) else { return nil }

        // 7. Draw: backdrop → kept person → neck → garment (shadow on the neck) → head (shadow on the neck).
        guard let ctx = rgbaContext(W, H), let neckImage = neck.image() else { return nil }
        if let background { ctx.setFillColor(background); ctx.fill(full) } else { ctx.draw(photo, in: full) }
        ctx.saveGState(); ctx.clip(to: full, mask: backMask); ctx.draw(photo, in: full); ctx.restoreGState()
        ctx.saveGState(); ctx.clip(to: full, mask: neckMask); ctx.draw(neckImage, in: full); ctx.restoreGState()

        let garmentRect = flip(CGRect(x: vx, y: vy, width: vw, height: vh))
        ctx.saveGState(); ctx.clip(to: full, mask: neckMask)
        ctx.setShadow(offset: CGSize(width: 0, height: -jawW * 0.01), blur: jawW * 0.04, color: CGColor(gray: 0, alpha: 0.45))
        ctx.draw(g.image, in: garmentRect)
        ctx.restoreGState()
        ctx.draw(g.image, in: garmentRect)
        if vy + vh < H, let strip = g.image.cropping(to: CGRect(x: 0, y: g.image.height - 6, width: g.image.width, height: 4)) {
            // garment shorter than the frame: stretch its hem strip down to the edge
            ctx.draw(strip, in: flip(CGRect(x: vx, y: vy + vh - 3, width: vw, height: H - (vy + vh) + 3)))
        }

        guard let head = rgbaContext(W, H) else { return nil }
        head.clip(to: full, mask: headMask); head.draw(photo, in: full)
        guard let headImage = head.makeImage() else { return nil }
        ctx.saveGState(); ctx.clip(to: full, mask: neckMask)
        ctx.setShadow(offset: CGSize(width: 0, height: -jawW * 0.04), blur: jawW * 0.08, color: CGColor(gray: 0, alpha: 0.5))
        ctx.draw(headImage, in: full)
        ctx.restoreGState()
        ctx.draw(headImage, in: full)
        return ctx.makeImage()
    }

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
    private static func allOnes(_ w: Double, _ h: Double) -> CGImage? {
        let c = grayContext(w, h)
        c.fill(CGRect(x: 0, y: 0, width: w, height: h))
        return c.makeImage()
    }

    // MARK: Helpers

    private static let ciContext = CIContext()
    private static let gray = CGColorSpaceCreateDeviceGray()

    private static func grayContext(_ w: Double, _ h: Double) -> CGContext {
        let c = CGContext(data: nil, width: Int(w), height: Int(h), bitsPerComponent: 8, bytesPerRow: 0,
                          space: gray, bitmapInfo: CGImageAlphaInfo.none.rawValue)!
        c.setFillColor(gray: 1, alpha: 1)
        return c
    }

    private static func rgbaContext(_ w: Double, _ h: Double) -> CGContext? {
        CGContext(data: nil, width: Int(w), height: Int(h), bitsPerComponent: 8, bytesPerRow: 0,
                  space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    }

    private static func feathered(_ image: CGImage?, sigma: Double, _ full: CGRect) -> CGImage? {
        guard let image else { return nil }
        let blurred = CIImage(cgImage: image).clampedToExtent().applyingGaussianBlur(sigma: sigma).cropped(to: full)
        return ciContext.createCGImage(blurred, from: full, format: .L8, colorSpace: gray)
    }

    private static func intersect(_ region: CGImage, _ mask: CGImage, _ full: CGRect) -> CGImage? {
        let c = grayContext(full.width, full.height)
        c.clip(to: full, mask: region)
        c.draw(mask, in: full)
        return c.makeImage()
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
    func image() -> CGImage? { ctx.makeImage() }
}
