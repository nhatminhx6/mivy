import CoreGraphics
import CoreImage
import Foundation
import ImageIO

// MARK: - Body template

/// A pre-made ID-photo body (model in a suit, transparent background), generated offline once
/// and bundled with its measured jaw: `Resources/Garments/<name>.png` + `<name>.json`
/// (`chin`, `cx`, `jawW` in image pixels, top-left origin).
public final class BodyTemplate: @unchecked Sendable {
    public let name: String
    let image: CGImage
    let chin: Double, cx: Double, jawW: Double

    init(name: String, image: CGImage, chin: Double, cx: Double, jawW: Double) {
        self.name = name; self.image = image; self.chin = chin; self.cx = cx; self.jawW = jawW
    }

    public static func bundled(_ name: String) -> BodyTemplate? {
        guard let url = bundleURL(name),
              let metaURL = Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Garments"),
              let data = try? Data(contentsOf: metaURL),
              let meta = try? JSONSerialization.jsonObject(with: data) as? [String: Double],
              let chin = meta["chin"], let cx = meta["cx"], let jaw = meta["jawW"],
              let src = CGImageSourceCreateWithURL(url as CFURL, nil),
              let image = CGImageSourceCreateImageAtIndex(src, 0, nil)
        else { return nil }
        return BodyTemplate(name: name, image: image, chin: chin, cx: cx, jawW: jaw)
    }

    public static func bundleURL(_ name: String) -> URL? {
        Bundle.module.url(forResource: name, withExtension: "png", subdirectory: "Garments")
    }
}

// MARK: - Head swap

/// Outfit by head swap, on-device: the user's own head (face untouched) is placed on a real
/// photographed body, so the neck, collar and suit are genuine pixels. The model's neck is
/// re-toned to the user's skin (YCbCr, measured right above the user's jaw), the area behind the
/// jaw is filled from the upper neck, and only the model's neck + clothes are kept (never its face).
public enum HeadSwap {
    /// Where the chin sits in the output frame (fraction of height) and frame width in jaw widths.
    static let chinFraction = 0.62
    static let frameJaws = 2.6

    /// - Parameters:
    ///   - user: the user's photo (ideally background already replaced), any framing.
    ///   - aspect: output width / height.
    ///   - background: output backdrop colour.
    /// - Returns: nil when no face is found.
    public static func compose(user: CGImage, body: BodyTemplate, aspect: Double, background: CGColor) -> CGImage? {
        guard let uPts = FaceGeometry.jawContour(user),
              let uMinX = uPts.map(\.x).min(), let uMaxX = uPts.map(\.x).max(), let uChin = uPts.map(\.y).max()
        else { return nil }
        let uJaw = uMaxX - uMinX, uCX = (uMinX + uMaxX) / 2
        guard uJaw > 8 else { return nil }
        let UW = Double(user.width), UH = Double(user.height)
        let userMask = FaceGeometry.subjectMask(user)

        // 1. Output frame cut from the body image.
        let BW = Double(body.image.width), BH = Double(body.image.height)
        var W = frameJaws * body.jawW, H = W / aspect
        if body.chin + (1 - chinFraction) * H > BH { H = (BH - body.chin) / (1 - chinFraction); W = H * aspect }
        if W > BW { W = BW; H = W / aspect }
        W = W.rounded(); H = H.rounded()
        let ox = body.cx - W / 2, oy = body.chin - chinFraction * H
        let full = CGRect(x: 0, y: 0, width: W, height: H)
        guard let frame = FaceGeometry.rgbaContext(W, H) else { return nil }
        frame.draw(body.image, in: CGRect(x: -ox, y: H - (BH - oy), width: BW, height: BH))
        guard let bodyImg = frame.makeImage() else { return nil }
        let bChin = body.chin - oy, bCX = body.cx - ox, bJaw = body.jawW
        let bb = RGBABitmap(bodyImg), ub = RGBABitmap(user)

        func ycc(_ p: UnsafeMutablePointer<UInt8>) -> (Double, Double, Double) {
            // premultiplied: un-premultiply so semi-transparent edges keep their colour
            let a = max(1, Double(p[3])) / 255
            let r = Double(p[0]) / a, g = Double(p[1]) / a, b = Double(p[2]) / a
            return (0.299 * r + 0.587 * g + 0.114 * b, 128 - 0.1687 * r - 0.3313 * g + 0.5 * b, 128 + 0.5 * r - 0.4187 * g - 0.0813 * b)
        }
        func skinW(_ y: Double, _ cb: Double, _ cr: Double) -> Double {
            let crOK = max(0, min(1, (cr - 133) / 6)) * max(0, min(1, (176 - cr) / 6))
            let cbOK = max(0, min(1, (cb - 80) / 6)) * max(0, min(1, (130 - cb) / 6))
            return crOK * cbOK * (y > 22 ? 1 : 0)
        }
        func median(_ v: [Double]) -> Double { v.isEmpty ? 0 : v.sorted()[v.count / 2] }
        func spread(_ v: [Double]) -> Double {
            guard v.count > 4 else { return 1 }
            let s = v.sorted(); return max(1, s[s.count * 3 / 4] - s[s.count / 4])
        }

        // 2. Model neck: chroma reference under the chin, then per row the skin run from the centre.
        var mCb = [Double](), mCr = [Double]()
        for y in Int(bChin + 0.1 * bJaw)..<Int(bChin + 0.3 * bJaw) {
            for x in Int(bCX - 0.12 * bJaw)..<Int(bCX + 0.12 * bJaw) {
                let (Y, cb, cr) = ycc(bb.clamped(x, y)); if skinW(Y, cb, cr) > 0.5 { mCb.append(cb); mCr.append(cr) }
            }
        }
        guard !mCb.isEmpty else { return nil }
        let neckCb = median(mCb), neckCr = median(mCr)
        func neckSkin(_ x: Int, _ y: Int) -> Bool {
            let p = bb.clamped(x, y); guard p[3] > 128 else { return false }
            let (Y, cb, cr) = ycc(p)
            return Y > 15 && ((cb - neckCb) * (cb - neckCb) + (cr - neckCr) * (cr - neckCr)).squareRoot() < 20
        }
        let iW = Int(W), iH = Int(H)
        let rowTop = Int(bChin + 0.06 * bJaw)
        var runs = [Int: (Int, Int)]()
        var collarY = iH
        for y in rowTop..<iH {
            var l = Int(bCX), r = Int(bCX)
            guard neckSkin(l, y) else { collarY = y; break }
            while l > 0 && neckSkin(l - 1, y) { l -= 1 }
            while r < iW - 1 && neckSkin(r + 1, y) { r += 1 }
            runs[y] = (l, r)
        }
        let (tl, tr) = runs[rowTop] ?? (Int(bCX - 0.25 * bJaw), Int(bCX + 0.25 * bJaw))
        guard tr > tl else { return nil }

        // 3. Neck image: real rows; behind the user's jaw a smooth fill from the upper neck,
        //    cross-faded into the real neck.
        let neck = RGBABitmap(bodyImg)
        let upTo = max(0, Int(bChin - 0.45 * bJaw))
        let blendRows = max(4, Int(0.15 * bJaw))
        let sampleRows = rowTop..<max(rowTop + 1, min(collarY, rowTop + Int(0.2 * bJaw)))
        var colMean: [[Double]] = (tl...tr).map { x in
            var acc = [0.0, 0.0, 0.0], n = 0.0
            for y in sampleRows where neckSkin(x, y) { let p = bb.clamped(x, y); for c in 0..<3 { acc[c] += Double(p[c]) }; n += 1 }
            return n > 0 ? acc.map { $0 / n } : []
        }
        for i in colMean.indices where colMean[i].isEmpty {
            var d = 1
            while d < colMean.count {
                if i - d >= 0, !colMean[i - d].isEmpty { colMean[i] = colMean[i - d]; break }
                if i + d < colMean.count, !colMean[i + d].isEmpty { colMean[i] = colMean[i + d]; break }
                d += 1
            }
            if colMean[i].isEmpty { colMean[i] = [180, 140, 120] }
        }
        for _ in 0..<3 {
            let src = colMean
            for i in src.indices {
                let a = src[max(0, i - 3)], b = src[i], c = src[min(src.count - 1, i + 3)]
                colMean[i] = (0..<3).map { (a[$0] + 2 * b[$0] + c[$0]) / 4 }
            }
        }
        let neckMaskCtx = FaceGeometry.grayContext(W, H)
        neckMaskCtx.setFillColor(gray: 0, alpha: 1); neckMaskCtx.fill(full); neckMaskCtx.setFillColor(gray: 1, alpha: 1)
        for y in upTo..<min(collarY, iH) {
            let (l, r) = y < rowTop ? (tl, tr) : (runs[y] ?? (tl, tr))
            if y < rowTop {
                for x in l...r { let d = neck.clamped(x, y), c = colMean[x - tl]; for i in 0..<3 { d[i] = UInt8(c[i]) }; d[3] = 255 }
            } else if y < rowTop + blendRows {
                let t = Double(y - rowTop) / Double(blendRows), e = t * t * (3 - 2 * t)
                for x in max(l, tl)...max(max(l, tl), min(r, tr)) {
                    let d = neck.clamped(x, y), c = colMean[x - tl]
                    for i in 0..<3 { d[i] = UInt8(c[i] * (1 - e) + Double(d[i]) * e) }
                }
            }
            neckMaskCtx.fill(CGRect(x: l, y: iH - 1 - y, width: r - l + 1, height: 1))
        }

        // 4. Tone the neck to the user's skin just above the jaw (median, a touch darker).
        var uY = [Double](), uCb = [Double](), uCr = [Double]()
        for y in Int(uChin - 0.45 * uJaw)..<Int(uChin - 0.08 * uJaw) {
            for x in Int(uCX - 0.45 * uJaw)..<Int(uCX + 0.45 * uJaw) {
                guard abs(Double(x) - uCX) > 0.18 * uJaw, let jy = FaceGeometry.jawY(uPts, Double(x)),
                      Double(y) < jy - 0.03 * uJaw else { continue }
                let (Y, cb, cr) = ycc(ub.clamped(x, y)); guard skinW(Y, cb, cr) > 0.5 else { continue }
                uY.append(Y); uCb.append(cb); uCr.append(cr)
            }
        }
        var nY = [Double]()
        for (y, (l, r)) in runs { for x in stride(from: l, through: r, by: 2) { nY.append(ycc(bb.clamped(x, y)).0) } }
        if !uY.isEmpty, !nY.isEmpty {
            let refY = median(uY), refCb = median(uCb), refCr = median(uCr), neckY = median(nY)
            let target = refY * 0.85, scale = min(1.0, max(0.55, spread(uY) / spread(nY)))
            func tone(_ x: Int, _ y: Int) {
                let p = neck.clamped(x, y); let (Y, cb, cr) = ycc(p)
                let fy = target + (Y - neckY) * scale, fcb = cb + (refCb - neckCb), fcr = cr + (refCr - neckCr)
                let r = fy + 1.402 * (fcr - 128), g = fy - 0.344136 * (fcb - 128) - 0.714136 * (fcr - 128), b = fy + 1.772 * (fcb - 128)
                p[0] = UInt8(max(0, min(255, r))); p[1] = UInt8(max(0, min(255, g))); p[2] = UInt8(max(0, min(255, b))); p[3] = 255
            }
            for y in upTo..<min(collarY, iH) {
                let (l, r) = y < rowTop ? (tl, tr) : (runs[y] ?? (tl, tr))
                for x in l...r { tone(x, y) }
            }
        }
        guard let neckImg = neck.image(),
              let neckMask = FaceGeometry.feathered(neckMaskCtx.makeImage(), sigma: 1.0, full) else { return nil }

        // 5. Clothes: body pixels below the chin that are not neck skin (alpha keeps the cut-out).
        let cl = FaceGeometry.grayContext(W, H)
        cl.setFillColor(gray: 0, alpha: 1); cl.fill(full); cl.setFillColor(gray: 1, alpha: 1)
        for y in max(0, Int(bChin))..<iH {
            var x = 0
            while x < iW {
                if neckSkin(x, y) { x += 1; continue }
                var e = x; while e < iW && !neckSkin(e, y) { e += 1 }
                cl.fill(CGRect(x: x, y: iH - 1 - y, width: e - x, height: 1)); x = e
            }
        }
        guard let clothesMask = FaceGeometry.feathered(cl.makeImage(), sigma: 1.0, full) else { return nil }

        // 6. Head mask (user space): face below the cheekbones only inside the jaw; hair/ears above,
        //    fading out beside the jaw so old collars never show.
        let uFull = CGRect(x: 0, y: 0, width: UW, height: UH)
        let personMask: CGImage? = userMask ?? colourKeyMask(ub, cx: uCX, chin: uChin, jaw: uJaw, full: uFull)
        guard let personMask else { return nil }
        let hair = longHairMask(ub, person: personMask, pts: uPts, cx: uCX, chin: uChin, jaw: uJaw)
        let hr = FaceGeometry.grayContext(UW, UH)
        hr.setFillColor(gray: 0, alpha: 1); hr.fill(CGRect(x: 0, y: 0, width: UW, height: UH)); hr.setFillColor(gray: 1, alpha: 1)
        let wideTop = uChin - 0.75 * uJaw, fadeTop = uChin - 0.42 * uJaw, fadeBot = uChin - 0.12 * uJaw
        // full width (hair, ears) above the cheekbones, fading out over 0.25 jaw instead of a hard line
        let wideFade = 0.25 * uJaw
        hr.fill(CGRect(x: 0, y: UH - (wideTop - wideFade), width: UW, height: wideTop - wideFade))
        if let g = CGGradient(colorsSpace: FaceGeometry.gray, colors: [CGColor(gray: 1, alpha: 1), CGColor(gray: 0, alpha: 1)] as CFArray, locations: [0, 1]) {
            hr.saveGState()
            hr.clip(to: CGRect(x: 0, y: UH - wideTop, width: UW, height: wideFade))
            hr.drawLinearGradient(g, start: CGPoint(x: 0, y: UH - (wideTop - wideFade)), end: CGPoint(x: 0, y: UH - wideTop), options: [])
            hr.restoreGState()
        }
        // the face itself (eyes / temples) is never faded
        hr.fill(CGRect(x: uCX - 0.6 * uJaw, y: UH - wideTop, width: 1.2 * uJaw, height: wideFade))
        if hair == nil {
            hr.fill(CGRect(x: uCX - 0.6 * uJaw, y: UH - fadeTop, width: 1.2 * uJaw, height: fadeTop - wideTop))
        }
        if hair == nil, let grad = CGGradient(colorsSpace: FaceGeometry.gray, colors: [CGColor(gray: 1, alpha: 1), CGColor(gray: 0, alpha: 1)] as CFArray, locations: [0, 1]) {
            hr.saveGState()
            hr.clip(to: CGRect(x: uCX - 0.6 * uJaw, y: UH - fadeBot, width: 1.2 * uJaw, height: fadeBot - fadeTop))
            hr.drawLinearGradient(grad, start: CGPoint(x: 0, y: UH - fadeTop), end: CGPoint(x: 0, y: UH - fadeBot), options: [])
            hr.restoreGState()
        }
        let midY = uChin - 0.5 * uJaw
        let jaw = CGMutablePath()
        jaw.addLines(between: uPts.map { CGPoint(x: uCX + ($0.x - uCX) * 0.97, y: UH - (midY + ($0.y - midY) * 0.97)) })
        jaw.closeSubpath()
        hr.addPath(jaw); hr.fillPath()
        // long hair falling beside the neck stays (drawn over the suit)
        if let hair {
            hr.saveGState(); hr.clip(to: uFull, mask: hair); hr.setFillColor(gray: 1, alpha: 1); hr.fill(uFull); hr.restoreGState()
        }
        guard let headRegion = FaceGeometry.feathered(hr.makeImage(), sigma: max(1, uJaw * 0.008), uFull),
              let headMask = FaceGeometry.intersect(headRegion, personMask, uFull),
              let hc = FaceGeometry.rgbaContext(UW, UH) else { return nil }
        hc.clip(to: uFull, mask: headMask); hc.draw(user, in: uFull)
        guard let head = hc.makeImage() else { return nil }
        let k = bJaw / uJaw
        let headRect = CGRect(x: bCX - uCX * k, y: H - (bChin - uChin * k + UH * k), width: UW * k, height: UH * k)

        // 7. Compose: backdrop → neck → clothes → head (soft shadow on the neck).
        guard let ctx = FaceGeometry.rgbaContext(W, H) else { return nil }
        ctx.setFillColor(background); ctx.fill(full)
        ctx.saveGState(); ctx.clip(to: full, mask: neckMask); ctx.draw(neckImg, in: full); ctx.restoreGState()
        ctx.saveGState(); ctx.clip(to: full, mask: clothesMask); ctx.draw(bodyImg, in: full); ctx.restoreGState()
        // the jaw shadows the neck only (never the backdrop around the hair)
        ctx.saveGState(); ctx.clip(to: full, mask: neckMask)
        ctx.setShadow(offset: CGSize(width: 0, height: -bJaw * 0.03), blur: bJaw * 0.06, color: CGColor(gray: 0, alpha: 0.25))
        ctx.draw(head, in: headRect)
        ctx.restoreGState()
        ctx.draw(head, in: headRect)
        return ctx.makeImage()
    }

    /// Hair below the cheekbones beside the face: pixels close to the hair colour (sampled at the
    /// crown), flood-filled from seeds beside the temples so only hair connected to the head counts.
    /// Ends with a soft fade around the shoulders. nil when there is no long hair.
    static func longHairMask(_ px: RGBABitmap, person: CGImage, pts: [CGPoint], cx: Double, chin: Double, jaw: Double) -> CGImage? {
        let pm = RGBABitmap(person, width: px.w, height: px.h)
        func inPerson(_ x: Int, _ y: Int) -> Bool { pm.clamped(x, y)[0] > 128 }
        // crown: first person row at the centre line, then a band below it
        var top = 0
        while top < px.h - 1 && !inPerson(Int(cx), top) { top += 1 }
        var hair = [[Double]]()
        for y in top..<min(px.h, top + Int(0.12 * jaw)) {
            for x in stride(from: Int(cx - 0.2 * jaw), to: Int(cx + 0.2 * jaw), by: 2) where inPerson(x, y) {
                let p = px.clamped(x, y); hair.append([Double(p[0]), Double(p[1]), Double(p[2])])
            }
        }
        guard hair.count > 10 else { return nil }
        let hc = (0..<3).map { c in hair.map { $0[c] }.sorted()[hair.count / 2] }
        let hairLum = hc.reduce(0, +) / 3
        func isHair(_ x: Int, _ y: Int) -> Bool {
            guard inPerson(x, y) else { return false }
            let p = px.clamped(x, y)
            let r = Double(p[0]), g = Double(p[1]), b = Double(p[2])
            let d = abs(r - hc[0]) + abs(g - hc[1]) + abs(b - hc[2])
            let l = (r + g + b) / 3
            // skin is never hair (unless the hair itself is skin-toned, e.g. blonde: then trust colour distance only)
            let cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b, cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b
            let hcb = 128 - 0.1687 * hc[0] - 0.3313 * hc[1] + 0.5 * hc[2], hcr = 128 + 0.5 * hc[0] - 0.4187 * hc[1] - 0.0813 * hc[2]
            let skinLike = cr > 138 && cb < 122 && abs(cr - hcr) + abs(cb - hcb) > 10
            return !skinLike && d < 110 && abs(l - hairLum) < (hairLum < 90 ? 45 : 70)
        }
        let y0 = Int(chin - 0.8 * jaw), y1 = min(px.h, Int(chin + 0.55 * jaw))
        let x0 = max(0, Int(cx - 1.0 * jaw)), x1 = min(px.w, Int(cx + 1.0 * jaw))
        guard y1 > y0 + 4, x1 > x0 + 4 else { return nil }
        let bw = x1 - x0, bh = y1 - y0
        var seen = [Bool](repeating: false, count: bw * bh)
        var stack = [(Int, Int)]()
        for x in x0..<x1 where abs(Double(x) - cx) > 0.42 * jaw && isHair(x, y0) { stack.append((x, y0)) }
        var count = 0
        while let (x, y) = stack.popLast() {
            guard x >= x0, x < x1, y >= y0, y < y1 else { continue }
            let i = (y - y0) * bw + (x - x0)
            guard !seen[i] else { continue }
            // never inside the face, and keep clear of the neck centre
            if abs(Double(x) - cx) < 0.3 * jaw { continue }
            if let jy = FaceGeometry.jawY(pts, Double(x)), Double(y) < jy { continue }
            guard isHair(x, y) else { continue }
            seen[i] = true; count += 1
            stack.append((x + 1, y)); stack.append((x - 1, y)); stack.append((x, y + 1)); stack.append((x, y - 1))
        }
        // too little = just stray dark pixels (short hair)
        guard Double(count) > 0.02 * jaw * jaw else { return nil }
        let m = RGBABitmap(width: px.w, height: px.h)
        let fadeFrom = Double(y1) - 0.18 * jaw
        for y in y0..<y1 {
            let fade = Double(y) < fadeFrom ? 1 : max(0, 1 - (Double(y) - fadeFrom) / (0.18 * jaw))
            let a = UInt8(255 * fade)
            for x in x0..<x1 where seen[(y - y0) * bw + (x - x0)] { let d = m.at(x, y); d[0] = a; d[1] = a; d[2] = a; d[3] = 255 }
        }
        guard let rgbaMask = m.image() else { return nil }
        let full = CGRect(x: 0, y: 0, width: px.w, height: px.h)
        let g = FaceGeometry.grayContext(full.width, full.height)
        g.setFillColor(gray: 0, alpha: 1); g.fill(full)
        g.draw(rgbaMask, in: full)
        return FaceGeometry.feathered(g.makeImage(), sigma: max(1, jaw * 0.01), full)
    }

    /// Fallback when Vision segmentation is unavailable (iOS Simulator): key out colours seen on
    /// the photo border beside/above the head, keep only a generous ellipse around the head.
    static func colourKeyMask(_ px: RGBABitmap, cx: Double, chin: Double, jaw: Double, full: CGRect) -> CGImage? {
        var samples = [[Double]]()
        let step = max(2, px.w / 60)
        let sideBottom = min(px.h - 1, Int(chin))
        for x in stride(from: 0, to: px.w, by: step) { samples.append(rgb(px.at(x, 1))); samples.append(rgb(px.at(x, min(px.h - 1, 6)))) }
        for y in stride(from: 0, through: sideBottom, by: step) { samples.append(rgb(px.at(1, y))); samples.append(rgb(px.at(px.w - 2, y))) }
        let m = RGBABitmap(width: px.w, height: px.h)
        let x0 = max(0, Int(cx - 1.0 * jaw)), x1 = min(px.w, Int(cx + 1.0 * jaw))
        let y0 = max(0, Int(chin - 2.2 * jaw)), y1 = min(px.h, Int(chin + 0.1 * jaw))
        let bw = x1 - x0, bh = y1 - y0
        guard bw > 2, bh > 2 else { return nil }
        var alpha = [Double](repeating: 0, count: bw * bh)
        for y in y0..<y1 {
            for x in x0..<x1 {
                let dx = (Double(x) - cx) / (0.9 * jaw), dy = (Double(y) - (chin - 0.85 * jaw)) / (1.25 * jaw)
                guard dx * dx + dy * dy <= 1 else { continue }
                // the face itself is never keyed out
                let fx = (Double(x) - cx) / (0.46 * jaw), fy = (Double(y) - (chin - 0.75 * jaw)) / (0.8 * jaw)
                if fx * fx + fy * fy <= 1 { alpha[(y - y0) * bw + x - x0] = 1; continue }
                let c = rgb(px.at(x, y))
                var best = Double.infinity
                for s in samples { let d = abs(c[0] - s[0]) + abs(c[1] - s[1]) + abs(c[2] - s[2]); if d < best { best = d } }
                alpha[(y - y0) * bw + x - x0] = max(0, min(1, (best - 30) / 40))
            }
        }
        // keep only what is connected to the face (drops background objects that survived the key)
        var seen = [Bool](repeating: false, count: bw * bh)
        var stack = [(Int(cx) - x0, Int(chin - 0.75 * jaw) - y0)]
        while let (x, y) = stack.popLast() {
            guard x >= 0, y >= 0, x < bw, y < bh else { continue }
            let i = y * bw + x
            guard !seen[i], alpha[i] > 0.5 else { continue }
            seen[i] = true
            stack.append((x + 1, y)); stack.append((x - 1, y)); stack.append((x, y + 1)); stack.append((x, y - 1))
        }
        for y in 0..<bh {
            for x in 0..<bw {
                let i = y * bw + x
                // soft edge pixels next to the kept region stay as they are
                let near = seen[i] || (x > 0 && seen[i - 1]) || (x < bw - 1 && seen[i + 1]) || (y > 0 && seen[i - bw]) || (y < bh - 1 && seen[i + bw])
                let a = UInt8(near ? alpha[i] * 255 : 0)
                let d = m.at(x + x0, y + y0); d[0] = a; d[1] = a; d[2] = a; d[3] = 255
            }
        }
        guard let rgbaMask = m.image() else { return nil }
        let g = FaceGeometry.grayContext(full.width, full.height)
        g.draw(rgbaMask, in: full)
        return FaceGeometry.feathered(g.makeImage(), sigma: 1.2, full)
    }

    private static func rgb(_ p: UnsafeMutablePointer<UInt8>) -> [Double] { [Double(p[0]), Double(p[1]), Double(p[2])] }
}
