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

/// User fine-tuning of the automatic fit (the face itself is never edited: only its overall
/// size / position on the body, and the colour of the model's neck).
public struct OutfitTuning: Sendable, Equatable {
    /// Head size multiplier, 0.85…1.15.
    public var headScale: Double = 1
    /// Head moved up (+) / down (−), in jaw widths, −0.1…0.1.
    public var headLift: Double = 0
    /// Neck brightness, −0.2…0.2 (fraction).
    public var neckBrightness: Double = 0
    /// Neck colour, −1 (cooler / pinker-free) … 1 (warmer).
    public var neckWarmth: Double = 0

    public init() {}
    public var isDefault: Bool { self == OutfitTuning() }
}

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
    public static func compose(user: CGImage, body: BodyTemplate, aspect: Double, background: CGColor,
                               tuning: OutfitTuning = OutfitTuning()) -> CGImage? {
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

        // 4. Tone the neck to the face. Colour: the cheeks (below the eyes, above beard / mouth
        //    shadows). Brightness: the user's own neck when it shows under the chin (its real
        //    shading), but never much darker than the face; else the face a touch darker.
        var uY = [Double](), uCb = [Double](), uCr = [Double]()
        for y in Int(uChin - 0.7 * uJaw)..<Int(uChin - 0.38 * uJaw) {
            for x in Int(uCX - 0.42 * uJaw)..<Int(uCX + 0.42 * uJaw) where abs(Double(x) - uCX) > 0.15 * uJaw {
                let (Y, cb, cr) = ycc(ub.clamped(x, y)); guard skinW(Y, cb, cr) > 0.5 else { continue }
                uY.append(Y); uCb.append(cb); uCr.append(cr)
            }
        }
        let userNeck = uY.isEmpty ? nil : neckSample(ub, cx: uCX, chin: uChin, jaw: uJaw, faceCb: median(uCb), faceCr: median(uCr), ycc: ycc)
        var nY = [Double]()
        for (y, (l, r)) in runs { for x in stride(from: l, through: r, by: 2) { nY.append(ycc(bb.clamped(x, y)).0) } }
        if !uY.isEmpty, !nY.isEmpty {
            let faceY = median(uY)
            var refCb = median(uCb), refCr = median(uCr), target = faceY * 0.9, refSpread = spread(uY)
            if let n = userNeck {
                target = max(median(n.Y), faceY * 0.86)
                refCb = 0.7 * refCb + 0.3 * median(n.Cb); refCr = 0.7 * refCr + 0.3 * median(n.Cr)
                refSpread = spread(n.Y)
            }
            target *= 1 + tuning.neckBrightness
            refCr += 6 * tuning.neckWarmth; refCb -= 4 * tuning.neckWarmth
            let neckY = median(nY), scale = min(1.0, max(0.55, refSpread / spread(nY)))
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
        // Head size: jaw width to the model's jaw, pulled towards the user's own neck-to-jaw
        // proportion (a head that fits the neck), within ±12%.
        var k = bJaw / uJaw
        if let n = userNeck {
            let bw = (Int(bChin + 0.12 * bJaw)..<Int(bChin + 0.32 * bJaw)).compactMap { runs[$0].map { Double($0.1 - $0.0) } }
            if bw.count > 3 {
                let kNeck = median(bw) / n.width
                k *= min(1.12, max(0.88, pow(kNeck / k, 0.7)))
            }
        }
        k *= tuning.headScale

        // Grain: the model's neck (and the smooth fill behind the jaw) is cleaner than a phone
        // photo; add luminance noise so it matches the face's grain at the scale it is drawn.
        let uGrain = grain(ub, x0: Int(uCX - 0.4 * uJaw), x1: Int(uCX + 0.4 * uJaw),
                           y0: Int(uChin - 0.7 * uJaw), y1: Int(uChin - 0.4 * uJaw), skip: { abs($0 - Int(uCX)) < Int(0.15 * uJaw) }, ycc: ycc) * min(1, k)
        let nGrain = grain(neck, x0: tl, x1: tr, y0: rowTop + blendRows, y1: min(collarY, rowTop + Int(0.3 * bJaw)), skip: { _ in false }, ycc: ycc)
        if uGrain > 0.5 {
            var rng = SplitMix(seed: 0x5EED)
            for y in upTo..<min(collarY, iH) {
                let (l, r) = y < rowTop ? (tl, tr) : (runs[y] ?? (tl, tr))
                // the fill behind the jaw has no grain of its own; the real neck has some
                let sd = y < rowTop + blendRows ? uGrain : (max(0, uGrain * uGrain - nGrain * nGrain)).squareRoot()
                guard sd > 0.3 else { continue }
                for x in l...r {
                    let n = rng.gaussian() * sd, p = neck.clamped(x, y)
                    for c in 0..<3 { p[c] = UInt8(max(0, min(255, Double(p[c]) + n))) }
                }
            }
        }
        guard let neckImg = neck.image(),
              let neckMask = FaceGeometry.feathered(neckMaskCtx.makeImage(), sigma: 1.0, full) else { return nil }

        // 5. Clothes: body pixels below the chin that are not neck skin (alpha keeps the cut-out).
        //    Above the collar the model's own jaw corners / ear lobes (skin of another tone) and
        //    stray hair strands are left out, else they peek out beside the user's jaw.
        let shoulderY = Double(collarY) + 0.15 * bJaw
        var clothes = [Bool](repeating: false, count: iW * iH)
        for y in max(0, Int(bChin))..<iH {
            for x in 0..<iW where !neckSkin(x, y) {
                let p = bb.at(x, y)
                guard p[3] > 0 else { continue }
                if Double(y) < shoulderY {
                    let (Y, cb, cr) = ycc(p)
                    if skinW(Y, cb, cr) > 0.5 { continue }
                }
                clothes[y * iW + x] = true
            }
        }
        let strand = max(1, Int(0.012 * bJaw))
        clothes = morph(morph(clothes, iW, iH, strand, grow: false), iW, iH, strand, grow: true)
        let cl = RGBABitmap(width: iW, height: iH)
        for i in clothes.indices where clothes[i] { let d = cl.at(i % iW, i / iW); d[0] = 255; d[1] = 255; d[2] = 255; d[3] = 255 }
        let clGray = FaceGeometry.grayContext(W, H)
        clGray.setFillColor(gray: 0, alpha: 1); clGray.fill(full)
        if let m = cl.image() { clGray.draw(m, in: full) }
        guard let clothesMask = FaceGeometry.feathered(clGray.makeImage(), sigma: 1.0, full) else { return nil }

        // 6. Head mask (user space): face below the cheekbones only inside the jaw; hair/ears above,
        //    fading out beside the jaw so old collars never show.
        let uFull = CGRect(x: 0, y: 0, width: UW, height: UH)
        let personMask: CGImage? = userMask ?? colourKeyMask(ub, cx: uCX, chin: uChin, jaw: uJaw, full: uFull)
        guard let personMask else { return nil }
        let hair = longHairMask(ub, person: personMask, pts: uPts, cx: uCX, chin: uChin, jaw: uJaw)
        let hr = FaceGeometry.grayContext(UW, UH)
        hr.setFillColor(gray: 0, alpha: 1); hr.fill(CGRect(x: 0, y: 0, width: UW, height: UH)); hr.setFillColor(gray: 1, alpha: 1)
        let wideTop = uChin - 0.5 * uJaw, fadeTop = uChin - 0.42 * uJaw, fadeBot = uChin - 0.12 * uJaw
        // full width (hair, whole ears — a half-faded ear looks like a ghost) down to the ear lobes,
        // then a short fade instead of a hard line
        let wideFade = 0.12 * uJaw
        hr.fill(CGRect(x: 0, y: UH - (wideTop - wideFade), width: UW, height: wideTop - wideFade))
        if let g = CGGradient(colorsSpace: FaceGeometry.gray, colors: [CGColor(gray: 1, alpha: 1), CGColor(gray: 0, alpha: 1)] as CFArray, locations: [0, 1]) {
            hr.saveGState()
            hr.clip(to: CGRect(x: 0, y: UH - wideTop, width: UW, height: wideFade))
            hr.drawLinearGradient(g, start: CGPoint(x: 0, y: UH - (wideTop - wideFade)), end: CGPoint(x: 0, y: UH - wideTop), options: [])
            hr.restoreGState()
        }
        // the face itself (eyes / temples) is never faded
        hr.fill(CGRect(x: uCX - 0.6 * uJaw, y: UH - wideTop, width: 1.2 * uJaw, height: wideFade))
        // eyes → cheekbones: always solid (no seam between the full-width region and the jaw)
        hr.fill(CGRect(x: uCX - 0.6 * uJaw, y: UH - fadeTop, width: 1.2 * uJaw, height: fadeTop - wideTop))
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
              let sharpMask = FaceGeometry.intersect(headRegion, personMask, uFull),
              let hc = FaceGeometry.rgbaContext(UW, UH) else { return nil }
        // Chin over the neck: the jaw edge fades softly into the model's neck (along the jaw line,
        // inset so nothing outside the jaw shows); beside the neck it stays crisp over the backdrop.
        let neckHalf = Double(tr - tl) / 2 / k
        let headMask = softChin(sharpMask, pts: uPts, cx: uCX, chin: uChin, jaw: uJaw, neckHalf: neckHalf, full: uFull) ?? sharpMask
        hc.clip(to: uFull, mask: headMask); hc.draw(user, in: uFull)
        guard let head = hc.makeImage() else { return nil }
        let lift = tuning.headLift * bJaw
        let headRect = CGRect(x: bCX - uCX * k, y: H - (bChin - lift - uChin * k + UH * k), width: UW * k, height: UH * k)

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

    /// Fades the lower jaw edge of `mask` within the neck's width: alpha × (soft jaw), where the
    /// soft jaw is the jaw polygon inset by ~2σ and blurred by σ (≈0 at the real jaw line).
    static func softChin(_ mask: CGImage, pts: [CGPoint], cx: Double, chin: Double, jaw: Double, neckHalf: Double, full: CGRect) -> CGImage? {
        let sigma = max(1.5, 0.018 * jaw)
        let midY = chin - 0.5 * jaw, inset = 0.97 - 4 * sigma / jaw
        let g = FaceGeometry.grayContext(full.width, full.height)
        g.setFillColor(gray: 0, alpha: 1); g.fill(full); g.setFillColor(gray: 1, alpha: 1)
        let path = CGMutablePath()
        path.addLines(between: pts.map { CGPoint(x: cx + ($0.x - cx) * inset, y: full.height - (midY + ($0.y - midY) * inset)) })
        path.closeSubpath()
        g.addPath(path); g.fillPath()
        // keep everything above the mouth solid in the soft mask
        g.fill(CGRect(x: 0, y: full.height - (chin - 0.45 * jaw), width: full.width, height: chin - 0.45 * jaw))
        guard let soft = FaceGeometry.feathered(g.makeImage(), sigma: sigma, full) else { return nil }
        let w = Int(full.width), h = Int(full.height)
        let m = RGBABitmap(mask, width: w, height: h), sm = RGBABitmap(soft, width: w, height: h)
        let x0 = max(0, Int(cx - neckHalf)), x1 = min(w, Int(cx + neckHalf))
        let y0 = max(0, Int(chin - 0.45 * jaw)), y1 = min(h, Int(chin + 0.1 * jaw))
        guard x1 > x0, y1 > y0 else { return nil }
        for y in y0..<y1 {
            for x in x0..<x1 {
                // full effect over the middle 75% of the neck, easing out to its sides
                let t = min(1, max(0, (neckHalf - abs(Double(x) - cx)) / (0.25 * neckHalf)))
                let wgt = t * t * (3 - 2 * t)
                let a = Double(m.at(x, y)[0]), s = Double(sm.at(x, y)[0]) / 255
                let v = UInt8(max(0, min(255, a * (1 - wgt + wgt * s))))
                let d = m.at(x, y); d[0] = v; d[1] = v; d[2] = v
            }
        }
        guard let rgba = m.image() else { return nil }
        let out = FaceGeometry.grayContext(full.width, full.height)
        out.draw(rgba, in: full)
        return out.makeImage()
    }

    /// High-frequency luminance noise (σ of pixel − 3×3 mean) over skin in a box.
    static func grain(_ px: RGBABitmap, x0: Int, x1: Int, y0: Int, y1: Int, skip: (Int) -> Bool,
                      ycc: (UnsafeMutablePointer<UInt8>) -> (Double, Double, Double)) -> Double {
        var sum = 0.0, n = 0.0
        let step = max(1, (x1 - x0) / 120)
        for y in stride(from: max(1, y0), to: min(px.h - 1, y1), by: step) {
            for x in stride(from: max(1, x0), to: min(px.w - 1, x1), by: step) where !skip(x) {
                let (Y, cb, cr) = ycc(px.at(x, y))
                guard Y > 25, cr > 133, cr < 176, cb > 80, cb < 130 else { continue }
                var mean = 0.0
                for dy in -1...1 { for dx in -1...1 { mean += ycc(px.at(x + dx, y + dy)).0 } }
                let d = Y - mean / 9
                sum += d * d; n += 1
            }
        }
        // σ of (pixel − 3×3 mean) underestimates pixel noise by √(8/9)
        return n > 20 ? (sum / n).squareRoot() * 1.06 : 0
    }

    /// The user's neck under the chin: per row the skin run (face-coloured) through the centre line,
    /// down to the collar. nil when too little shows (collar up, beard, bad jaw estimate).
    static func neckSample(_ px: RGBABitmap, cx: Double, chin: Double, jaw: Double, faceCb: Double, faceCr: Double,
                           ycc: (UnsafeMutablePointer<UInt8>) -> (Double, Double, Double)) -> (width: Double, Y: [Double], Cb: [Double], Cr: [Double])? {
        func skin(_ x: Int, _ y: Int) -> Bool {
            let (Y, cb, cr) = ycc(px.clamped(x, y))
            return Y > 25 && ((cb - faceCb) * (cb - faceCb) + (cr - faceCr) * (cr - faceCr)).squareRoot() < 16
        }
        var widths = [Double](), Ys = [Double](), Cbs = [Double](), Crs = [Double]()
        let x0 = Int(cx), lim = Int(0.6 * jaw)
        for y in Int(chin + 0.12 * jaw)..<min(px.h, Int(chin + 0.32 * jaw)) {
            guard skin(x0, y) else { continue }
            var l = x0, r = x0
            while x0 - l < lim && skin(l - 1, y) { l -= 1 }
            while r - x0 < lim && skin(r + 1, y) { r += 1 }
            let w = Double(r - l)
            // a run hitting the limit leaked into a skin-coloured background
            // too wide = leaked into skin-coloured hair / background (necks are ~0.4–0.65 jaw)
            guard w > 0.35 * jaw, w < 0.7 * jaw, x0 - l < lim, r - x0 < lim else { continue }
            widths.append(w)
            let m = (r - l) / 10
            for x in stride(from: l + m, through: r - m, by: 2) {
                let (Y, cb, cr) = ycc(px.clamped(x, y)); Ys.append(Y); Cbs.append(cb); Crs.append(cr)
            }
        }
        guard widths.count >= max(4, Int(0.06 * jaw)) else { return nil }
        return (widths.sorted()[widths.count / 2], Ys, Cbs, Crs)
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
            // anything darker than the hair is hair in shadow (the strip beside the jaw)
            if !skinLike && l < hairLum && l < 90 { return true }
            return !skinLike && d < 110 && abs(l - hairLum) < (hairLum < 90 ? 45 : 70)
        }
        let y0 = Int(chin - 0.8 * jaw), y1 = min(px.h, Int(chin + 0.55 * jaw))
        let x0 = max(0, Int(cx - 1.0 * jaw)), x1 = min(px.w, Int(cx + 1.0 * jaw))
        guard y1 > y0 + 4, x1 > x0 + 4 else { return nil }
        let bw = x1 - x0, bh = y1 - y0
        let midY = chin - 0.5 * jaw
        let inner = pts.map { CGPoint(x: cx + ($0.x - cx) * 0.93, y: midY + ($0.y - midY) * 0.93) }
        var seen = [Bool](repeating: false, count: bw * bh)
        var stack = [(Int, Int)]()
        for x in x0..<x1 where abs(Double(x) - cx) > 0.42 * jaw && isHair(x, y0) { stack.append((x, y0)) }
        var count = 0
        while let (x, y) = stack.popLast() {
            guard x >= x0, x < x1, y >= y0, y < y1 else { continue }
            let i = (y - y0) * bw + (x - x0)
            guard !seen[i] else { continue }
            // never inside the face (a slightly shrunk jaw: the head cut-out is inset too, and hair
            // in the shadow right beside the jaw must not fall between the two), clear of the neck centre
            if abs(Double(x) - cx) < 0.3 * jaw { continue }
            if let jy = FaceGeometry.jawY(inner, Double(x)), Double(y) < jy { continue }
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

    /// Fallback when Vision segmentation is unavailable (iOS Simulator). The background is grown
    /// from the edges of a box around the head, pixel to pixel while colours change smoothly
    /// (plain walls, vignettes); hair / skin edges stop it. A busy background (the fill cannot
    /// spread) falls back to a soft head oval rather than keeping clutter.
    static func colourKeyMask(_ px: RGBABitmap, cx: Double, chin: Double, jaw: Double, full: CGRect) -> CGImage? {
        let x0 = max(0, Int(cx - 1.0 * jaw)), x1 = min(px.w, Int(cx + 1.0 * jaw))
        let y0 = max(0, Int(chin - 2.2 * jaw)), y1 = min(px.h, Int(chin + 0.1 * jaw))
        let bw = x1 - x0, bh = y1 - y0
        guard bw > 2, bh > 2 else { return nil }
        func inHead(_ x: Int, _ y: Int, _ rx: Double, _ ry: Double, _ cyOff: Double) -> Bool {
            let dx = (Double(x) - cx) / (rx * jaw), dy = (Double(y) - (chin - cyOff * jaw)) / (ry * jaw)
            return dx * dx + dy * dy <= 1
        }
        // the face, and skin up to the crown (a bald scalp can be as pale as the wall), is never background
        func face(_ x: Int, _ y: Int) -> Bool {
            if inHead(x, y, 0.48, 0.85, 0.78) {
                // beside a narrow chin the oval reaches the wall: light colourless grey there is wall
                guard Double(y) > chin - 0.5 * jaw, abs(Double(x) - cx) > 0.25 * jaw else { return true }
                let p = px.at(x, y), r = Int(p[0]), g = Int(p[1]), b = Int(p[2])
                return !(max(r, g, b) - min(r, g, b) < 22 && r + g + b > 420)
            }
            guard inHead(x, y, 0.5, 0.9, 0.95) else { return false }
            let p = px.at(x, y), r = Double(p[0]), g = Double(p[1]), b = Double(p[2])
            let cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b, cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b
            return cr > 136 && cr < 176 && cb > 80 && cb < 128
        }
        func diff(_ a: UnsafeMutablePointer<UInt8>, _ b: UnsafeMutablePointer<UInt8>) -> Int {
            abs(Int(a[0]) - Int(b[0])) + abs(Int(a[1]) - Int(b[1])) + abs(Int(a[2]) - Int(b[2]))
        }
        var bg = [Bool](repeating: false, count: bw * bh)
        var stack = [(Int, Int)]()
        // seeds: the box's top and side edges (down to the chin)
        for x in 0..<bw { stack.append((x, 0)) }
        for y in 0..<bh where Double(y + y0) < chin { stack.append((0, y)); stack.append((bw - 1, y)) }
        // wall showing between long hair and the neck is closed off from the top: seed the bottom row
        // where it matches the wall (median of the other seeds)
        let wall = (0..<3).map { c in stack.map { Double(px.at($0.0 + x0, $0.1 + y0)[c]) }.sorted()[stack.count / 2] }
        for x in 0..<bw {
            let p = px.at(x + x0, bh - 1 + y0)
            if abs(Double(p[0]) - wall[0]) + abs(Double(p[1]) - wall[1]) + abs(Double(p[2]) - wall[2]) < 60 { stack.append((x, bh - 1)) }
        }
        // each wall pixel carries a slowly drifting reference colour: gradients and vignettes are
        // followed, a soft-focus edge (bald scalp, blurred hair) drifts too fast and stops the fill
        var ref = [Double](repeating: 0, count: bw * bh * 3)
        for (x, y) in stack where !face(x + x0, y + y0) {
            let i = y * bw + x, p = px.at(x + x0, y + y0)
            bg[i] = true; for c in 0..<3 { ref[i * 3 + c] = Double(p[c]) }
        }
        stack = stack.filter { bg[$0.1 * bw + $0.0] }
        while let (x, y) = stack.popLast() {
            let j = y * bw + x
            let p = px.at(x + x0, y + y0)
            for (nx, ny) in [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)] {
                guard nx >= 0, ny >= 0, nx < bw, ny < bh else { continue }
                let i = ny * bw + nx
                guard !bg[i], !face(nx + x0, ny + y0) else { continue }
                let q = px.at(nx + x0, ny + y0)
                var drift = 0.0
                for c in 0..<3 { drift += abs(Double(q[c]) - ref[j * 3 + c]) }
                guard diff(p, q) < 15, drift < 35 else { continue }
                bg[i] = true
                for c in 0..<3 { ref[i * 3 + c] = 0.97 * ref[j * 3 + c] + 0.03 * Double(q[c]) }
                stack.append((nx, ny))
            }
        }
        // busy background: textured (mean step between neighbours, plain walls ≈ 0–3, wood ≈ 6)
        // or the fill could not reach most of the area clear of the head
        var tex = 0, outside = 0, outsideBg = 0
        for y in 0..<(bh - 1) where Double(y + y0) < chin - 0.3 * jaw {
            for x in 0..<(bw - 1) where !inHead(x + x0, y + y0, 0.9, 1.25, 0.85) {
                tex += diff(px.at(x + x0, y + y0), px.at(x + x0 + 1, y + y0)); outside += 1
                if bg[y * bw + x] { outsideBg += 1 }
            }
        }
        let busy = outside == 0 || Double(tex) > 4.5 * Double(outside) || Double(outsideBg) < 0.75 * Double(outside)
        // person = not wall, inside the generous head ellipse, opened (thin stems / wires vanish) and
        // connected to the face (drops stray objects)
        var person = [Bool](repeating: false, count: bw * bh)
        if !busy {
            let lowY = chin - 0.4 * jaw
            func skin(_ r: Int, _ g: Int, _ b: Int) -> Bool {
                let cb = 128 - 0.1687 * Double(r) - 0.3313 * Double(g) + 0.5 * Double(b)
                let cr = 128 + 0.5 * Double(r) - 0.4187 * Double(g) - 0.0813 * Double(b)
                return cr > 134 && cr < 178 && cb > 78 && cb < 130
            }
            // hair colour: just under the crown, beside the centre line (a parting shows skin), skin left out
            var crown = 0
            while crown < bh - 1 && bg[crown * bw + Int(cx) - x0] { crown += 1 }
            var hs = [[Int]]()
            for y in (crown + 2)..<min(bh, crown + 2 + max(3, Int(0.12 * jaw))) {
                for x in stride(from: Int(cx - 0.3 * jaw) - x0, to: Int(cx + 0.3 * jaw) - x0, by: 2) where x >= 0 && x < bw && !bg[y * bw + x] {
                    let p = px.at(x + x0, y + y0)
                    if !skin(Int(p[0]), Int(p[1]), Int(p[2])) { hs.append([Int(p[0]), Int(p[1]), Int(p[2])]) }
                }
            }
            let hairRGB = hs.isEmpty ? nil : (0..<3).map { c in hs.map { $0[c] }.sorted()[hs.count / 2] }
            // beside the face (temples → jaw) only hair or skin (ears) belongs to the person
            func hairOrSkin(_ r: Int, _ g: Int, _ b: Int) -> Bool {
                // skin (ears) or the crown's hair colour (dark things behind are common in a scene)
                if skin(r, g, b) { return true }
                guard let h = hairRGB, hs.count > 10 else { return true }
                return abs(r - h[0]) + abs(g - h[1]) + abs(b - h[2]) < 50
            }
            // a scene behind (some texture: street, room) rather than a plain wall: hold the sides
            // closer to the head so things beside it are not taken for hair
            let sideReach = Double(tex) > 2.2 * Double(outside) ? 0.62 : 0.9
            var cand = (0..<(bw * bh)).map { i in
                let x = i % bw + x0, y = i / bw + y0
                guard !bg[i], inHead(x, y, sideReach, 1.25, 0.85) else { return false }
                let p = px.at(x, y), r = Int(p[0]), g = Int(p[1]), b = Int(p[2])
                // plants behind the head: hair and skin are never green
                if g > r + 12 && g > b + 4 { return false }
                // wall boxed in between long hair and the neck (the fill cannot reach it)
                // (also in shade: a light, colourless grey there is wall, never hair or skin)
                if Double(y) > lowY {
                    if abs(Double(r) - wall[0]) + abs(Double(g) - wall[1]) + abs(Double(b) - wall[2]) < 45 { return false }
                    if max(r, g, b) - min(r, g, b) < 22 && r + g + b > 420 { return false }
                }
                // on a scene (not a plain wall) beside the face only hair or skin is the person
                if sideReach < 0.7, abs(Double(x) - cx) > 0.5 * jaw, Double(y) > chin - 1.3 * jaw { return hairOrSkin(r, g, b) }
                return true
            }
            let r = max(2, Int(0.035 * jaw))
            cand = morph(morph(cand, bw, bh, r, grow: false), bw, bh, r, grow: true)
            var fill = [(Int(cx) - x0, Int(chin - 0.78 * jaw) - y0)]
            while let (x, y) = fill.popLast() {
                guard x >= 0, y >= 0, x < bw, y < bh else { continue }
                let i = y * bw + x
                guard !person[i], cand[i] || face(x + x0, y + y0) else { continue }
                person[i] = true
                fill.append((x + 1, y)); fill.append((x - 1, y)); fill.append((x, y + 1)); fill.append((x, y - 1))
            }
        }
        let m = RGBABitmap(width: px.w, height: px.h)
        for y in 0..<bh {
            for x in 0..<bw {
                let keep = busy ? inHead(x + x0, y + y0, 0.58, 0.98, 0.8) : person[y * bw + x]
                let a: UInt8 = keep ? 255 : 0
                let d = m.at(x + x0, y + y0); d[0] = a; d[1] = a; d[2] = a; d[3] = 255
            }
        }
        guard let rgbaMask = m.image() else { return nil }
        let g = FaceGeometry.grayContext(full.width, full.height)
        g.setFillColor(gray: 0, alpha: 1); g.fill(full)
        g.draw(rgbaMask, in: full)
        return FaceGeometry.feathered(g.makeImage(), sigma: busy ? max(2, jaw * 0.04) : 1.2, full)
    }

    /// Square erosion (`grow` false) or dilation of a boolean grid, radius `r`, separable.
    private static func morph(_ g: [Bool], _ w: Int, _ h: Int, _ r: Int, grow: Bool) -> [Bool] {
        func pass(_ src: [Bool], horizontal: Bool) -> [Bool] {
            var out = src
            let (lines, len) = horizontal ? (h, w) : (w, h)
            for l in 0..<lines {
                @inline(__always) func idx(_ k: Int) -> Int { horizontal ? l * w + k : k * w + l }
                // running count of `true` in the window [k - r, k + r]
                var count = 0
                for k in 0..<min(len, r) where src[idx(k)] { count += 1 }
                for k in 0..<len {
                    if k + r < len, src[idx(k + r)] { count += 1 }
                    if k - r - 1 >= 0, src[idx(k - r - 1)] { count -= 1 }
                    let window = min(len - 1, k + r) - max(0, k - r) + 1
                    out[idx(k)] = grow ? count > 0 : count == window
                }
            }
            return out
        }
        return pass(pass(g, horizontal: true), horizontal: false)
    }
}

/// Small deterministic RNG (same output for the same photo).
struct SplitMix {
    var state: UInt64
    init(seed: UInt64) { state = seed }
    mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
    mutating func uniform() -> Double { Double(next() >> 11) / Double(1 << 53) }
    /// Standard normal (Box–Muller).
    mutating func gaussian() -> Double {
        let u = max(1e-12, uniform()), v = uniform()
        return (-2 * log(u)).squareRoot() * cos(2 * .pi * v)
    }
}
