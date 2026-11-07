import CoreGraphics
import CoreImage

/// Suit made from a body template: only the clothes (head, hair and neck skin removed), plus where
/// the collar sits and how wide the neck opening is. Top-left coordinates, template pixels.
public final class Garment: @unchecked Sendable {
    public static func bundled(_ name: String) -> Garment? { BodyTemplate.bundled(name).flatMap(Garment.init(body:)) }

    let image: CGImage          // clothes only, padded at the bottom so it never ends above the frame
    /// the model's skin at the bottom of the collar opening (with the real shadows of the collar and tie
    /// knot), faded in from above; recoloured to the user's neck and laid under the suit
    let vSkin: CGImage?
    /// first row (template px) where the shirt collar closes in on the neck from both sides
    let wingTop: Double
    let cx: Double              // neck centre
    let collarY: Double         // top of the collar at the centre (where the neck disappears)
    let neckW: Double           // width of the neck just above the collar
    let neckUnderChin: Double   // collar opening where the collar closes in on the neck (fit to the user's neck)
    let jawW: Double
    let chin: Double
    let skinRef: (Y: Double, cb: Double, cr: Double)

    init?(body: BodyTemplate) {
        let src = RGBABitmap(body.image)
        let W = src.w, H = src.h
        let cx = body.cx, chin = body.chin, jaw = body.jawW
        func skin(_ p: UnsafeMutablePointer<UInt8>) -> Double {
            guard p[3] > 40 else { return 0 }
            let (_, cb, cr) = GarmentOverlay.ycc(p)
            let crOK = max(0, min(1, (cr - 132) / 6)) * max(0, min(1, (178 - cr) / 6))
            let cbOK = max(0, min(1, (cb - 78) / 6)) * max(0, min(1, (132 - cb) / 6))
            return crOK * cbOK
        }
        // collar top: going down the centre line, the first row where skin stops for good
        var collar: Double?
        var y = Int(chin + 0.15 * jaw)
        while y < H - 6 {
            if (0..<6).allSatisfy({ skin(src.clamped(Int(cx), y + $0)) < 0.5 }) { collar = Double(y); break }
            y += 1
        }
        guard let collarY = collar else { return nil }
        // neck opening: skin run around the centre a little above the collar
        var widths = [Double]()
        for yy in Int(collarY - 0.22 * jaw)..<Int(collarY - 0.04 * jaw) {
            var l = Int(cx), r = Int(cx)
            while l > 0, skin(src.clamped(l - 1, yy)) > 0.5 { l -= 1 }
            while r < W - 1, skin(src.clamped(r + 1, yy)) > 0.5 { r += 1 }
            if r - l > 4 { widths.append(Double(r - l)) }
        }
        guard !widths.isEmpty else { return nil }
        let neckW = widths.sorted()[widths.count / 2]
        // the neck itself just under the chin (same measure as the user's, to pick the best-fitting build)
        var under = [Double]()
        for yy in Int(chin + 0.12 * jaw)..<Int(max(chin + 0.13 * jaw, min(collarY - 0.05 * jaw, chin + 0.35 * jaw))) {
            var l = Int(cx), r = Int(cx)
            while l > 0, skin(src.clamped(l - 1, yy)) > 0.5 { l -= 1 }
            while r < W - 1, skin(src.clamped(r + 1, yy)) > 0.5 { r += 1 }
            if r - l > 4 { under.append(Double(r - l)) }
        }
        let underW = under.isEmpty ? 0.68 * jaw : under.sorted()[under.count / 2]
        // the model's neck skin colour: the suit was lit for it, the user's photo was lit differently
        var ys = [Double](), cbs = [Double](), crs = [Double]()
        for yy in stride(from: Int(collarY - 0.25 * jaw), to: Int(collarY - 0.03 * jaw), by: 2) {
            for x in stride(from: Int(cx - neckW * 0.3), to: Int(cx + neckW * 0.3), by: 2) {
                let p = src.clamped(x, yy)
                guard skin(p) > 0.8 else { continue }
                let (Y, cb, cr) = GarmentOverlay.ycc(p)
                ys.append(Y); cbs.append(cb); crs.append(cr)
            }
        }
        func med(_ v: [Double], _ d: Double) -> Double { v.isEmpty ? d : v.sorted()[v.count / 2] }
        self.skinRef = (med(ys, 160), med(cbs, 112), med(crs, 150))

        // clothes only: drop everything above the collar band and every skin pixel; pad the bottom
        let pad = H
        let out = RGBABitmap(width: W, height: H + pad)
        // nothing of the model above the collar band; beside the face the jacket collar rises higher (up to the chin)
        // Near the neck the cut is a clean diagonal rising outward: where the model's jaw / hair overlapped the
        // collar tips, removing them left ragged notches — the diagonal trims those.
        // the centre cut sits above the collar's own top edge behind the neck (cutting through it left a flat,
        // ruler-straight collar top beside the neck); skin above is dropped per pixel anyway
        let cut = max(chin + 0.04 * jaw, collarY - 0.45 * jaw), sideCut = max(chin - 0.1 * jaw, collarY - 0.45 * jaw)   // no lapel spikes up by the jaw
        func cutY(_ x: Int) -> Double {
            let d = abs(Double(x) - cx)
            // centre: the collar band; beside the face (past 0.45 jaw) the jacket collar may rise to the chin;
            // in between a diagonal joins the two
            let t = max(0, min(1, (d - 0.3 * jaw) / (0.15 * jaw)))
            return cut + (min(cut, sideCut) - cut) * t
        }
        // how much of each template pixel is kept (clothes, below the cut), then smoothed a little: the
        // skin / cut boundaries are decided per pixel and would leave stepped edges
        var keepMap = [Double](repeating: 0, count: W * H)
        for y in 0..<H {
            for x in 0..<W {
                let s = src.at(x, y)
                guard s[3] > 0 else { continue }
                let edge = max(0, min(1, (Double(y) - cutY(x)) / 1.5))          // anti-aliased cut line
                guard edge > 0 else { continue }
                // the template's cut-out edge is soft (matting): firm it up so the suit outline is crisp
                let a = Double(s[3]) / 255
                let t = max(0, min(1, (a - 0.2) / 0.6))
                keepMap[y * W + x] = (1 - skin(s)) * (t * t * (3 - 2 * t)) / a * edge
            }
        }
        for _ in 0..<2 {
            let k0 = keepMap
            for y in 1..<(H - 1) {
                for x in 1..<(W - 1) where k0[y * W + x] > 0 || k0[y * W + x - 1] > 0 || k0[y * W + x + 1] > 0 {
                    var sum = 0.0
                    for dy in -1...1 { for dx in -1...1 { sum += k0[(y + dy) * W + x + dx] } }
                    keepMap[y * W + x] = sum / 9
                }
            }
        }
        for yy in 0..<(H + pad) {
            let sy = min(H - 1, yy)
            for x in 0..<W {
                let keep = keepMap[sy * W + x]
                guard keep > 0 else { continue }
                let s = src.at(x, sy), d = out.at(x, yy)
                for c in 0..<4 { d[c] = UInt8(min(255, Double(s[c]) * keep)) }
            }
        }
        guard let image = out.image() else { return nil }
        self.image = image
        let vs = RGBABitmap(width: W, height: H + pad)
        // the model's whole neck inside the collar (from where the collar closes in on both sides)
        var wingTop = collarY - 0.16 * jaw
        var openW: Double?
        let ci = Int(cx), reach = Int(0.6 * jaw)
        for y in Int(chin + 0.15 * jaw)..<Int(collarY) {
            var l = ci, r = ci
            while ci - l < reach, l > 0, keepMap[y * W + l] < 0.5 { l -= 1 }
            while r - ci < reach, r < W - 1, keepMap[y * W + r] < 0.5 { r += 1 }
            if keepMap[y * W + l] >= 0.5, keepMap[y * W + r] >= 0.5 { wingTop = Double(y); openW = Double(r - l); break }
        }
        // what the user's neck is matched against: the collar opening where the collar closes in on the neck
        self.neckUnderChin = openW ?? underW
        let vTop = wingTop - 0.04 * jaw, vFull = wingTop + 0.14 * jaw
        for y in max(0, Int(vTop))..<min(H, Int(collarY + 0.03 * jaw)) {
            let fade = max(0, min(1, (Double(y) - vTop) / (vFull - vTop)))
            for x in max(0, Int(cx - neckW))..<min(W, Int(cx + neckW)) {
                let sp = src.at(x, y)
                let k = skin(sp) * fade * (1 - keepMap[y * W + x])
                guard k > 0.02 else { continue }
                let d = vs.at(x, y)
                for c in 0..<4 { d[c] = UInt8(Double(sp[c]) * k) }
            }
        }
        self.vSkin = body.ghost ? nil : vs.image()
        self.wingTop = wingTop
        self.cx = cx; self.collarY = collarY; self.neckW = neckW; self.jawW = jaw; self.chin = chin
    }
}

/// Dresses the user in a suit WITHOUT touching the head or neck: the user's own head, neck and
/// skin stay; only the clothes are drawn over the body, scaled to the user's real neck width and
/// placed at the base of their neck. Everything of the user below the collar (old clothes,
/// shoulders) is covered by the suit or replaced by the backdrop.
public enum GarmentOverlay {
    /// Vision drops shiny spots (hair highlights, glare) out of the person: anything not connected to the
    /// photo's border is part of the person.
    static func fillHoles(_ mask: CGImage) -> CGImage? {
        let w = mask.width, h = mask.height
        let ctx = FaceGeometry.grayContext(Double(w), Double(h))
        ctx.draw(mask, in: CGRect(x: 0, y: 0, width: w, height: h))
        guard let data = ctx.data?.assumingMemoryBound(to: UInt8.self) else { return nil }
        let bpr = ctx.bytesPerRow
        var outside = [Bool](repeating: false, count: w * h)
        var stack = [Int]()
        func push(_ x: Int, _ y: Int) {
            let i = y * w + x
            if !outside[i], data[y * bpr + x] < 128 { outside[i] = true; stack.append(i) }
        }
        for x in 0..<w { push(x, 0); push(x, h - 1) }
        for y in 0..<h { push(0, y); push(w - 1, y) }
        while let i = stack.popLast() {
            let x = i % w, y = i / w
            if x > 0 { push(x - 1, y) }; if x < w - 1 { push(x + 1, y) }
            if y > 0 { push(x, y - 1) }; if y < h - 1 { push(x, y + 1) }
        }
        for y in 0..<h { for x in 0..<w where !outside[y * w + x] && data[y * bpr + x] < 255 { data[y * bpr + x] = 255 } }
        return ctx.makeImage()
    }

    static func ycc(_ p: UnsafeMutablePointer<UInt8>) -> (Double, Double, Double) {
        let a = max(1, Double(p[3])) / 255
        let r = Double(p[0]) / a, g = Double(p[1]) / a, b = Double(p[2]) / a
        return (0.299 * r + 0.587 * g + 0.114 * b, 128 - 0.1687 * r - 0.3313 * g + 0.5 * b, 128 + 0.5 * r - 0.4187 * g - 0.0813 * b)
    }

    /// - Parameters:
    ///   - user: full upright photo, backdrop already replaced when a person mask exists.
    ///   - background: backdrop colour, painted where the user's old shoulders stick out.
    /// - Returns: same size as `user`, or nil when no face / neck is found.
    public static func compose(user: CGImage, garment primary: Garment, alternatives: [Garment] = [], background: CGColor,
                               tuning: OutfitTuning = OutfitTuning()) -> CGImage? {
        guard let pts = FaceGeometry.jawContour(user),
              let minX = pts.map(\.x).min(), let maxX = pts.map(\.x).max(), let chin = pts.map(\.y).max()
        else { return nil }
        let jaw = maxX - minX, fcx = (minX + maxX) / 2
        guard jaw > 8 else { return nil }
        let W = user.width, H = user.height
        // backdrop: the person cut out of the ORIGINAL photo with the old wall taken out of the hair / cheek
        // edges (no light halo on the new colour), edge smoothed (Vision's mask is coarse: stepped cheeks)
        let full = CGRect(x: 0, y: 0, width: W, height: H)
        var base = user
        var cutout: CGImage?
        let parts = PersonParts.parse(user)       // hair / skin / clothes per pixel (nil: model unavailable)
        if let raw = FaceGeometry.subjectMask(user).map({ fillHoles($0) ?? $0 }) {
            let clean = HeadSwap.decontaminate(RGBABitmap(user), person: raw, pts: pts, cx: fcx, chin: chin, jaw: jaw,
                                               faceProb: parts.map { p in { x, y in p.face(Double(x), Double(y)) } })
            let cut = FaceGeometry.feathered(clean?.mask ?? raw, sigma: max(1, 0.004 * jaw), full) ?? raw
            // only the edge band is cleaned: inside the person (shiny hair highlights) the original stays
            var fg = user
            if let cleaned = clean?.image, let deep = FaceGeometry.feathered(raw, sigma: 0.012 * jaw, full) {
                // "inside" = solid well within the mask (the loose mask edge itself still holds wall colour)
                let c = RGBABitmap(cleaned), o = RGBABitmap(user), r = RGBABitmap(deep, width: W, height: H)
                for y in 0..<H { for x in 0..<W where r.at(x, y)[0] >= 252 { let d = c.at(x, y), q = o.at(x, y); for k in 0..<4 { d[k] = q[k] } } }
                fg = c.image() ?? cleaned
            }
            let blend = CIFilter(name: "CIBlendWithMask")
            blend?.setValue(CIImage(cgImage: fg), forKey: kCIInputImageKey)
            blend?.setValue(CIImage(color: CIColor(cgColor: background)).cropped(to: full), forKey: kCIInputBackgroundImageKey)
            blend?.setValue(CIImage(cgImage: cut), forKey: kCIInputMaskImageKey)
            if let out = blend?.outputImage, let img = FaceGeometry.ciContext.createCGImage(out, from: full) {
                base = img; cutout = cut
            }
        }
        let px = RGBABitmap(base)
        let hairSrc = parts == nil ? nil : RGBABitmap(base)      // the photo before the suit, for hair on top
        let hairCut = cutout.map { RGBABitmap($0) }
        let mask = cutout.map { RGBABitmap($0) }   // gray drawn into RGBA: r = g = b = mask
        func person(_ x: Int, _ y: Int) -> Bool {
            guard let mask else { return true }
            return mask.clamped(x, y)[0] > 127
        }


        // 1. The user's neck: per row below the chin, the person run around the face centre.
        //    Neck = the narrow part; the collar goes where it starts to widen into shoulders.
        var rows = [(y: Double, l: Double, r: Double)]()
        var y = Int(chin + 0.08 * jaw)
        let yEnd = min(H - 1, Int(chin + 1.3 * jaw))
        while y <= yEnd {
            var l = Int(fcx), r = Int(fcx)
            if person(l, y) {
                let limit = Int(1.6 * jaw)
                while l > 0, Int(fcx) - l < limit, person(l - 1, y) { l -= 1 }
                while r < W - 1, r - Int(fcx) < limit, person(r + 1, y) { r += 1 }
                rows.append((Double(y), Double(l), Double(r)))
            }
            y += 1
        }
        let inNeck = rows.filter { $0.y > chin + 0.15 * jaw }
        guard let narrow = inNeck.min(by: { ($0.r - $0.l) < ($1.r - $1.l) }) else { return nil }
        var neckW = narrow.r - narrow.l
        if mask == nil || neckW > 0.95 * jaw || neckW < 0.45 * jaw { neckW = 0.68 * jaw }   // no usable mask: typical neck
        // the template (same suit, different builds) whose neck fits the user's best: its collar then needs
        // little or no bending (a collar bent to fit came out with stubs, flat tops and ledges)
        // (the user's neck from the parts map: the person mask under the chin already spans the shoulders)
        var userNeck: Double?, userNeckC: Double?
        if let parts, mask != nil {
            var w = [Double](), cs = [Double]()
            for yy in stride(from: Int(chin + 0.12 * jaw), to: min(H - 1, Int(chin + 0.35 * jaw)), by: 2) {
                func neck(_ x: Int) -> Bool {
                    person(x, yy) && parts.skin(Double(x), Double(yy)) > 0.5 && parts.clothes(Double(x), Double(yy)) < 0.5
                }
                var l = Int(fcx), r = Int(fcx)
                guard neck(l) else { continue }
                while l > 0, Double(Int(fcx) - l) < jaw, neck(l - 1) { l -= 1 }
                while r < W - 1, Double(r - Int(fcx)) < jaw, neck(r + 1) { r += 1 }
                w.append(Double(r - l)); cs.append(Double(l + r) / 2)
            }
            if w.count > 3 { userNeck = w.sorted()[w.count / 2]; userNeckC = cs.sorted()[cs.count / 2] }
        }
        // the suit is centred on the neck itself (the person run under the chin spans the shoulders, whose
        // centre is off the neck's in a turned photo: the collar was then bent sideways to reach the neck)
        let ncx: Double
        if let c = userNeckC, let un = userNeck, un > 0.35 * jaw, un < 0.85 * jaw {   // a believable neck only
            ncx = max(fcx - 0.15 * jaw, min(fcx + 0.15 * jaw, c))
        }
        else { ncx = mask == nil ? fcx : (narrow.l + narrow.r) / 2 }
        let garment = userNeck.map { un in ([primary] + alternatives).min {
            abs(log((un / jaw) / ($0.neckUnderChin / $0.jawW))) < abs(log((un / jaw) / ($1.neckUnderChin / $1.jawW)))
        } ?? primary } ?? primary
        // 2. Scale with the face (the template is a real person: body ∝ jaw). Collar at the template's
        //    chin → collar distance, raised when the user's own clothes start higher on the neck.
        // body ∝ jaw, but the collar opening must fit round the user's real neck: widen up to 12% for a thick neck
        let sJaw = jaw / garment.jawW
        let sNeck = mask == nil ? sJaw : neckW * 1.12 / garment.neckW
        let s = max(sJaw, min(sJaw * 1.12, sNeck)) * tuning.headScale
        let templateCollar = chin + (garment.collarY - garment.chin) * s
        var collarY = templateCollar
        let ref = skinReference(px, pts: pts, cx: ncx, chin: chin, jaw: jaw)
        // the user's own neckline (old clothes) may start high (selfie from below: chin near the shoulders).
        // Raising the suit to cover it makes the person look shrugged, so the suit rises at most a little
        // and the neck is continued down to the collar instead (`neckEnd`).
        var neckEnd: Double?
        if let parts {
            // first row under the chin where old clothes take over, in the middle or beside the neck
            // (a T-shirt neckline is a U, higher at the sides)
            var top: Double?
            for side in [-0.95, -0.6, 0, 0.6, 0.95] {
                let x = ncx + side * neckW / 2
                var run = 0
                for y in Int(chin + 0.1 * jaw)..<min(H - 1, Int(chin + 1.2 * jaw)) {
                    run = parts.clothes(x, Double(y)) > 0.5 ? run + 1 : 0
                    if run >= 3 { top = min(top ?? .infinity, Double(y - 2)); break }
                }
            }
            if let top {
                collarY = max(min(collarY, top + 0.02 * jaw), templateCollar - 0.1 * jaw, chin + 0.2 * jaw)
                if top < collarY { neckEnd = max(chin + 0.12 * jaw, top) }
            }
        } else if let ref, let clothes = clothesTop(px, ref: ref, cx: ncx, chin: chin, jaw: jaw, neckHalf: neckW / 2) {
            collarY = max(min(collarY, clothes + 0.02 * jaw), templateCollar - 0.1 * jaw, chin + 0.2 * jaw)
            // an old T-shirt neckline is a U: higher beside the neck than in the middle
            let sideTop = [-0.95, -0.7, 0.7, 0.95].compactMap { side in
                sideClothesTop(px, ref: ref, x: ncx + side * neckW / 2, chin: chin, jaw: jaw)
            }.min()
            let top = min(clothes, sideTop ?? clothes)
            if top < collarY { neckEnd = max(chin + 0.12 * jaw, top) }
        }
        collarY = max(collarY, chin + 0.1 * jaw) - tuning.headLift * jaw

        // 3. Suit layer, same size as the photo.
        guard let layerCtx = FaceGeometry.rgbaContext(Double(W), Double(H)) else { return nil }
        let gw = Double(garment.image.width) * s, gh = Double(garment.image.height) * s
        let gx = ncx - garment.cx * s, gy = collarY - garment.collarY * s     // top-left placement
        layerCtx.interpolationQuality = .high
        layerCtx.draw(garment.image, in: CGRect(x: gx, y: Double(H) - gy - gh, width: gw, height: gh))
        guard let layerImg = layerCtx.makeImage() else { return nil }
        var suit = RGBABitmap(layerImg)
        var vskin: RGBABitmap?
        if let v = garment.vSkin, let vctx = FaceGeometry.rgbaContext(Double(W), Double(H)) {
            vctx.interpolationQuality = .high
            vctx.draw(v, in: CGRect(x: gx, y: Double(H) - gy - gh, width: gw, height: gh))
            vskin = vctx.makeImage().map { RGBABitmap($0) }
        }

        // top of the suit per column (first mostly-opaque row), used for the user keep-region and shadow
        var suitTop = [Int](repeating: H, count: W)
        for x in 0..<W {
            var yy = max(0, Int(collarY - 0.6 * neckW * 1.5))
            while yy < H, suit.at(x, yy)[3] < 128 { yy += 1 }
            suitTop[x] = yy
        }

        let bg = background.components ?? [1, 1, 1, 1]
        let bgR = UInt8(max(0, min(255, (bg.count >= 3 ? bg[0] : bg[0]) * 255)))
        let bgG = UInt8(max(0, min(255, (bg.count >= 3 ? bg[1] : bg[0]) * 255)))
        let bgB = UInt8(max(0, min(255, (bg.count >= 3 ? bg[2] : bg[0]) * 255)))
        let neckHalf = neckW / 2
        let shadowDepth = 0.07 * jaw
        let top = pts.map(\.y).min() ?? (chin - jaw)
        let earBottom = top + 0.74 * (chin - top)   // ear lobes end about here

        // the real neck, row by row: skin run around the centre (old clothes / shoulders are not skin),
        // smoothed so the outline follows the neck, not pixel noise
        let y0 = max(0, Int(earBottom)), y1 = min(H - 1, (suitTop.max() ?? H) + 1)
        var spanL = [Double](repeating: ncx - neckHalf, count: H), spanR = [Double](repeating: ncx + neckHalf, count: H)
        if let ref, y1 > y0 {
            let maxHalf = Int(1.2 * jaw)
            for y in y0...y1 {
                var l = Int(ncx), r = Int(ncx)
                // the person mask, not skin colour: a neck in shadow reads as "not skin". Old clothes below
                // the neck are handled by `neckEnd` (neck continued down) and the width limit below.
                // right under the chin (where the jaw's shadow falls) the mask alone; lower down also skin
                // colour, so an old T-shirt collar beside the neck is not taken for neck
                let underChin = Double(y) < chin + 0.2 * jaw
                func neckPx(_ x: Int) -> Bool {
                    if let parts {
                        // toward the neck's sides an old collar / shoulder can sit right against it: there it
                        // must also read as skin (a light T-shirt is easily mistaken for neck at 256 px)
                        let outer = abs(Double(x) - ncx) > 0.75 * neckW / 2
                        return person(x, y) && parts.clothes(Double(x), Double(y)) < 0.5
                            && (!outer || parts.skin(Double(x), Double(y)) > 0.35)
                    }
                    guard mask != nil else { return !isClothes(px.clamped(x, y), ref) }
                    return person(x, y) && (underChin || !strictClothes(px.clamped(x, y), ref))
                }
                if neckPx(l) {
                    while Int(ncx) - l < maxHalf, neckPx(l - 1) { l -= 1 }
                    while r - Int(ncx) < maxHalf, neckPx(r + 1) { r += 1 }
                }
                spanL[y] = Double(l); spanR[y] = Double(r)
            }
            let k = max(2, Int(0.03 * jaw))
            let rawL = spanL, rawR = spanR
            for y in y0...y1 {
                let a = max(y0, y - k), b = min(y1, y + k)
                spanL[y] = Array(rawL[a...b]).sorted()[(b - a) / 2]
                spanR[y] = Array(rawR[a...b]).sorted()[(b - a) / 2]
            }
        }
        // above the ear lobes the neck outline is not scanned: use the first scanned row's (a default
        // width there reaches past a thin or half-hidden neck onto an old shoulder, kept as a block)
        if y1 > y0 { for y in 0..<y0 { spanL[y] = spanL[y0]; spanR[y] = spanR[y0] } }
        // the collar closes round the user's own neck: the template's collar opening is pulled in (and over)
        // horizontally onto the neck's outline, the suit further out untouched — otherwise a thin, tilted
        // or off-centre neck stands in a wide opening with a gap (inside of the collar) on each side
        var fitWings: (from: Int, to: Int, l: [Double], r: [Double])?
        if mask != nil, y1 > y0 {
            let c0 = max(0, min(W - 1, Int(ncx))), reach = Int(0.75 * jaw)
            var oL = [Double?](repeating: nil, count: H), oR = oL
            // from a little above the collar points (the model's wider neck left an opening there too, beside
            // which the collar goes round the back): pulled in as well, or the backdrop shows beside the neck
            let wingTopRow = Int(gy + garment.wingTop * s)
            for y in max(Int(chin), wingTopRow - Int(0.15 * jaw))..<H where y >= 0 && suit.at(c0, y)[3] < 128 {
                var l = c0, r = c0
                while c0 - l < reach, l > 0, suit.at(l, y)[3] < 128 { l -= 1 }
                while r - c0 < reach, r < W - 1, suit.at(r, y)[3] < 128 { r += 1 }
                if suit.at(l, y)[3] >= 128, suit.at(r, y)[3] >= 128 { oL[y] = Double(l); oR[y] = Double(r) }
            }
            if let fr = oL.firstIndex(where: { $0 != nil }), let lr = oL.lastIndex(where: { $0 != nil }), lr - fr > 3 {
                for y in fr...lr where oL[y] == nil { oL[y] = oL[y - 1]; oR[y] = oR[y - 1] }
                let R = 0.95 * jaw, down = Int(0.3 * jaw)
                // faded in over a long stretch above the opening: the jacket collar's top reaches up there, and a
                // short fade bent its sloping edge into an upright stub with a flat top
                let up = Int(0.4 * jaw)
                let ya = max(0, fr - up), yb = min(H - 1, lr + down)
                // the user's neck outline at a row (above old clothes: their own neck ends at `neckEnd`)
                let refLimit = neckEnd.map { Int($0) - 3 } ?? y1
                var dl = [Double](repeating: 0, count: H), dr = dl
                for y in ya...yb {
                    let yc = min(max(y, fr), lr), wl = oL[yc]!, wr = oR[yc]!
                    let ry = max(y0, min(yc, refLimit, y1))
                    var nh = (spanR[ry] - spanL[ry]) / 2, nc = (spanL[ry] + spanR[ry]) / 2
                    if nh < 0.25 * jaw || nh > 0.6 * jaw { nh = neckHalf; nc = ncx }
                    let ho = (wr - wl) / 2, oc = (wl + wr) / 2
                    // the collar overlaps the neck's sides a little; only ever narrowed, never stretched open
                    let th = max(0.6 * ho, min(ho, nh - 0.015 * jaw))
                    let tc = oc + max(-0.1 * jaw, min(0.1 * jaw, nc - oc))
                    dl[y] = tc - th; dr[y] = tc + th
                }
                // smooth the SHIFTS down the rows (row-by-row neck outlines zigzag); smoothing the targets
                // themselves dragged the wide opening's targets onto the narrow tip of the V: the rows round the
                // tie knot were stretched sideways, a smeared line across knot and lapels
                var sL = [Double](repeating: 0, count: H), sR = sL
                for y in ya...yb { let yc = min(max(y, fr), lr); sL[y] = dl[y] - oL[yc]!; sR[y] = dr[y] - oR[yc]! }
                let k = max(2, Int(0.025 * jaw)), rl = sL, rr = sR
                for y in ya...yb {
                    let a = max(ya, y - k), b = min(yb, y + k), yc = min(max(y, fr), lr)
                    let wl = oL[yc]!, wr = oR[yc]!
                    var ml = rl[a...b].reduce(0, +) / Double(b - a + 1), mr = rr[a...b].reduce(0, +) / Double(b - a + 1)
                    // never pinched shut (the opening keeps at least 0.6 of its width, as unsmoothed)
                    let w0 = wr - wl, w1 = w0 + mr - ml
                    if w0 > 0, w1 < 0.6 * w0 { let f = 0.4 * w0 / max(1e-6, ml - mr); ml *= f; mr *= f }
                    dl[y] = wl + ml; dr[y] = wr + mr
                }
                func warp(_ src: RGBABitmap) -> RGBABitmap {
                    guard let img = src.image() else { return src }
                    let out = RGBABitmap(img)
                    for y in ya...yb {
                        let yc = min(max(y, fr), lr), sl = oL[yc]!, sr = oR[yc]!, oc = (sl + sr) / 2
                        func ease(_ t: Double) -> Double { let t = max(0, min(1, t)); return t * t * (3 - 2 * t) }
                        let v = y < fr ? ease(Double(y - ya) / Double(max(1, fr - ya)))
                              : y > lr ? 1 - ease(Double(y - lr) / Double(max(1, yb - lr))) : 1
                        guard v > 0.001, dr[y] - dl[y] > 1 else { continue }
                        let lo = oc - R, hi = oc + R
                        for x in max(0, Int(lo))...min(W - 1, Int(hi)) {
                            let X = Double(x)
                            var xs: Double
                            if X < dl[y] { xs = lo + (X - lo) / max(1, dl[y] - lo) * (sl - lo) }
                            else if X <= dr[y] { xs = sl + (X - dl[y]) / (dr[y] - dl[y]) * (sr - sl) }
                            else { xs = sr + (X - dr[y]) / max(1, hi - dr[y]) * (hi - sr) }
                            xs = X + v * (xs - X)
                            let x0 = max(0, min(W - 2, Int(xs.rounded(.down)))), f = max(0, min(1, xs - Double(x0)))
                            let pa = src.at(x0, y), pb = src.at(x0 + 1, y), o = out.at(x, y)
                            for c in 0..<4 { o[c] = UInt8(Double(pa[c]) * (1 - f) + Double(pb[c]) * f + 0.5) }
                        }
                    }
                    return out
                }
                suit = warp(suit)
                vskin = vskin.map(warp)
                fitWings = (max(fr, wingTopRow), lr, dl, dr)
                for x in 0..<W {
                    var yy = max(0, Int(collarY - 0.6 * neckW * 1.5))
                    while yy < H, suit.at(x, yy)[3] < 128 { yy += 1 }
                    suitTop[x] = yy
                }
            }
        }
        // inside the collar opening (between the two collar wings) there is never backdrop: it is neck,
        // or the shadow inside the shirt collar
        var wingL = [Double?](repeating: nil, count: H), wingR = [Double?](repeating: nil, count: H)
        let reach = Int(0.75 * jaw), c0 = max(0, min(W - 1, Int(ncx)))
        for y in 0..<H where y > Int(chin) && suit.at(c0, y)[3] < 128 {
            var l = c0, r = c0
            while c0 - l < reach, l > 0, suit.at(l, y)[3] < 128 { l -= 1 }
            while r - c0 < reach, r < W - 1, suit.at(r, y)[3] < 128 { r += 1 }
            if suit.at(l, y)[3] >= 128, suit.at(r, y)[3] >= 128 { wingL[y] = Double(l); wingR[y] = Double(r) }
        }
        // collar fitted to the neck: its opening is exactly where it was moved to (a re-scan from the neck's
        // centre can miss the narrow bottom of the opening when the neck is off-centre)
        if let fw = fitWings, fw.from <= fw.to {
            for y in 0..<H { wingL[y] = nil; wingR[y] = nil }
            for y in fw.from...fw.to { wingL[y] = fw.l[y]; wingR[y] = fw.r[y] }
        }
        // above the collar tips, what the scan meets is the jacket's lapels out at the sides: not the collar
        for y in 0..<min(H, Int(gy + garment.wingTop * s)) { wingL[y] = nil; wingR[y] = nil }
        // neck continued below the old neckline: the lower neck (smooth skin just above the old clothes) is
        // stretched down to the collar — no repeated chin crease, real skin texture
        var mirrorRow = [Int?](repeating: nil, count: H)
        var mirrorSpan = [(l: Double, r: Double)?](repeating: nil, count: H)
        var mirrorFrac = [Double](repeating: 0, count: H)
        // skin shows down to the bottom of the collar opening (as on the model photo)
        let lastWing = wingL.lastIndex(where: { $0 != nil }).map(Double.init) ?? 0
        let neckBottom = max(collarY + 0.04 * jaw, lastWing + 2)
        // a ghost suit has no neck of its own in the opening: the user's neck always reaches its bottom
        // (from just inside the collar tips it is rebuilt: the real one there is often an old collar's shadow)
        let ghost = garment.vSkin == nil
        let firstWingRow = wingL.firstIndex(where: { $0 != nil }).map(Double.init)
        let neckStop = ghost ? min(neckEnd ?? .infinity, (firstWingRow ?? collarY) + 0.03 * jaw, collarY - 0.03 * jaw) : neckEnd
        if let neckStop, neckBottom > neckStop {
            let e = Double(Int(neckStop) - 2), bottom = neckBottom
            // a ghost suit's collar tips sit right under the chin: the band is the short bare neck above them
            let a = ghost ? max(chin + 0.04 * jaw, e - 0.12 * jaw) : max(chin + 0.12 * jaw, e - 0.12 * jaw)
            if e > a + 2 {
                // the outline is stretched with the skin (the source row's own outline): one fixed width made a
                // step where the stretch starts, and the neck's side shading jumped there (a line across the neck)
                let l0 = spanL, r0 = spanR
                for y in Int(ghost ? e + 1 : a)..<min(H, Int(bottom)) {
                    // ghost suit: the rows below are patched (see `patch`), not stretched
                    let sf = ghost ? e : a + (Double(y) - a) * (e - a) / (bottom - a), src = Int(sf)
                    mirrorFrac[y] = sf - Double(src)
                    mirrorRow[y] = src; mirrorSpan[y] = (l0[src], r0[src]); spanL[y] = l0[src]; spanR[y] = r0[src]
                }
            }
        }
        // the neck's outline: never wider than the neck itself (what shows beside it — the neck side behind
        // the jaw seen from below, ear lobes — would stick out next to the collar), and inside the collar
        // opening it narrows with it, centred, so the inside of the collar shows evenly on both sides
        // (the collar wraps round the neck) instead of a straight-sided column filling the opening
        let firstW = wingL.firstIndex(where: { $0 != nil })
        let taperTop = chin + 0.1 * jaw
        for y in y0...max(y0, y1) where y < H {
            let wide = neckHalf * 1.08
            var mid = ncx, half = wide
            if let wl = wingL[y], let wr = wingR[y] {
                mid = (wl + wr) / 2; half = min(wide * 1.1, 0.5 * (wr - wl) + 2)
            } else if let fw = firstW, let wl = wingL[fw], let wr = wingR[fw], Double(y) > taperTop, y < fw {
                let t0 = (Double(y) - taperTop) / max(1, Double(fw) - taperTop), t = t0 * t0 * (3 - 2 * t0)
                half = wide + (min(wide * 1.1, 0.5 * (wr - wl) + 2) - wide) * t
                mid = ncx + ((wl + wr) / 2 - ncx) * t
            }
            spanL[y] = max(spanL[y], mid - half)
            spanR[y] = min(spanR[y], mid + half)
        }
        // smooth the outline (per-row decisions zigzag along the diagonal collar edges)
        if y1 > y0 {
            let k = max(2, Int(0.02 * jaw)), rawL = spanL, rawR = spanR
            for y in y0...y1 where Double(y) <= neckBottom {
                let a = max(y0, y - k), b = min(y1, y + k, Int(neckBottom))
                guard b >= a else { continue }
                spanL[y] = rawL[a...b].reduce(0, +) / Double(b - a + 1)
                spanR[y] = rawR[a...b].reduce(0, +) / Double(b - a + 1)
            }
        }
        var bandRow = Array(0..<H)          // row the collar colour is sampled from
        let firstWing = Double(wingL.firstIndex(where: { $0 != nil }) ?? 0)
        if let yw = wingL.firstIndex(where: { $0 != nil }) {
            for y in yw..<min(H, yw + Int(0.12 * jaw)) { bandRow[y] = yw + Int(0.12 * jaw) }
        }

        // a narrow strip of backdrop left between the neck and the suit right above the collar (the model's
        // neck was wider): the neck row is stretched sideways to meet the suit instead (no painting)
        var hStretch = [(l: Double, r: Double, nl: Double, nr: Double)?](repeating: nil, count: H)
        // first: where the strip between the neck outline and the suit is the user's own skin (the side of the
        // neck behind the jaw), it is simply kept — the neck-width limit cut it off
        if mask != nil, let parts, let fw = wingL.firstIndex(where: { $0 != nil }), fw > y0 {
            let maxGap = 0.1 * jaw
            func skinPx(_ x: Int, _ y: Int) -> Bool {
                person(x, y) && parts.skin(Double(x), Double(y)) > 0.5 && parts.clothes(Double(x), Double(y)) < 0.3
            }
            let yEnd = min(H - 1, fw)
            var el = [Double](repeating: 0, count: H), er = el
            for y in y0...yEnd {
                var x = Int(spanL[y]) - 1
                while Double(x) > spanL[y] - maxGap, x > 0, suit.at(x, y)[3] < 128, skinPx(x, y) { x -= 1 }
                el[y] = spanL[y] - Double(x) - 1 + (suit.at(x, y)[3] >= 128 ? 2 : 0)
                x = Int(spanR[y]) + 1
                while Double(x) < spanR[y] + maxGap, x < W - 1, suit.at(x, y)[3] < 128, skinPx(x, y) { x += 1 }
                er[y] = Double(x) - spanR[y] - 1 + (suit.at(x, y)[3] >= 128 ? 2 : 0)
            }
            // smooth the extra width down the rows (no blocks where the strip comes and goes)
            let k = max(2, Int(0.03 * jaw)), rl = el, rr = er
            for y in y0...yEnd {
                let a = max(y0, y - k), b = min(yEnd, y + k)
                spanL[y] -= rl[a...b].reduce(0, +) / Double(b - a + 1)
                spanR[y] += rr[a...b].reduce(0, +) / Double(b - a + 1)
            }
        }
        if mask != nil, let fw = wingL.firstIndex(where: { $0 != nil }) {
            let ya = max(0, Int(chin - 0.02 * jaw)), yb = min(H - 1, fw + Int(0.05 * jaw))
            if yb > ya {
                let maxGap = 0.1 * jaw
                var gl = [Double](repeating: 0, count: H), gr = gl
                for y in ya...yb {
                    let l = spanL[y], r = spanR[y]
                    var x = Int(l) - 1
                    while Double(x) > l - maxGap, x > 0, suit.at(x, y)[3] < 128 { x -= 1 }
                    if suit.at(x, y)[3] >= 128 { gl[y] = max(0, l - Double(x)) }
                    x = Int(r) + 1
                    while Double(x) < r + maxGap, x < W - 1, suit.at(x, y)[3] < 128 { x += 1 }
                    if suit.at(x, y)[3] >= 128 { gr[y] = max(0, Double(x) - r) }
                }
                // smooth down the rows (a gap that comes and goes row by row would make a ragged edge)
                let k = max(2, Int(0.02 * jaw)), rl = gl, rr = gr
                for y in ya...yb {
                    let a = max(ya, y - k), b = min(yb, y + k)
                    // eased in under the chin: no step against the unstretched jaw just above
                    let t = max(0, min(1, (Double(y) - (chin - 0.02 * jaw)) / (0.06 * jaw))), ease = t * t * (3 - 2 * t)
                    gl[y] = ease * rl[a...b].reduce(0, +) / Double(b - a + 1); gr[y] = ease * rr[a...b].reduce(0, +) / Double(b - a + 1)
                    guard gl[y] > 0.5 || gr[y] > 0.5 else { continue }
                    let l = spanL[y], r = spanR[y]
                    hStretch[y] = (l, r, l - gl[y] - 1, r + gr[y] + 1)
                    spanL[y] = l - gl[y] - 1; spanR[y] = r + gr[y] + 1
                }
            }
        }
        let rowSrc = hStretch.contains { $0 != nil } ? RGBABitmap(base) : nil

        // Where the collar opening starts the neck's outline narrows at once (inside the collar it is held to the
        // neck's width) and the back-of-collar fill appears beside it: a flat ledge. Narrow it over a few rows.
        if let fw = wingL.firstIndex(where: { $0 != nil }), fw > 1 {
            let T = max(4, Int(0.08 * jaw)), yb = min(H - 1, fw + T)
            let l0 = spanL[fw - 1], r0 = spanR[fw - 1], l1 = spanL[yb], r1 = spanR[yb]
            // only over the user's skin: elsewhere the widened neck would show old clothes (a dark patch)
            func skinBetween(_ a: Double, _ b: Double, _ y: Int) -> Bool {
                guard let parts, b - a > 1 else { return true }
                let m = (a + b) / 2
                return parts.skin(m, Double(y)) > 0.5 && parts.clothes(m, Double(y)) < 0.4
            }
            for y in fw..<yb {
                let t = Double(y - fw) / Double(T), e = t * t * (3 - 2 * t)
                let nl = l0 + (l1 - l0) * e, nr = r0 + (r1 - r0) * e
                if nl < spanL[y], skinBetween(nl, spanL[y], y) { spanL[y] = nl }
                if nr > spanR[y], skinBetween(spanR[y], nr, y) { spanR[y] = nr }
            }
        }
        // a ghost suit's collar wraps the neck: where the neck is rebuilt it fills the whole opening (a neck
        // narrower than the V left grey wedges of "back of the collar" down to its tip)
        if garment.vSkin == nil {
            // (all the way up to the collar tips: a strip stretched sideways there showed as a straight dark wedge)
            for y in 0..<H {
                if let wl = wingL[y], let wr = wingR[y] { spanL[y] = min(spanL[y], wl + 1); spanR[y] = max(spanR[y], wr - 1) }
            }
        }
        // The suit is a clean studio render, the photo a phone shot: soften the suit to the photo's sharpness
        // and give it the photo's grain, or it reads as pasted on however well it fits.
        var grain = 0.0, skinGrain = 0.0
        do {
            let photo = detail(px, Int(fcx - 0.3 * jaw), Int(fcx + 0.3 * jaw), Int(top + 0.35 * (chin - top)), Int(chin - 0.15 * jaw), opaque: false)
            let x0 = Int(ncx - 1.4 * jaw), x1 = Int(ncx + 1.4 * jaw), y0 = Int(collarY + 0.2 * jaw)
            if let photo, var cloth = detail(suit, x0, x1, y0, H, opaque: true) {
                var passes = 0
                while cloth.ratio > photo.ratio * 1.03, passes < 4 {
                    suit = boxBlur3(suit); passes += 1
                    guard let c = detail(suit, x0, x1, y0, H, opaque: true) else { break }
                    cloth = c
                }
                // on a small (low-res) face real detail (stubble, pores) reads as noise: grain only on large faces
                let t = max(0, min(1, (jaw - 250) / 350)), res = t * t * (3 - 2 * t)
                grain = res * max(0, min(2, 0.6 * (photo.noise - cloth.noise)))
                skinGrain = res * min(3, photo.noise)
            }
        }

        var shL = spanL, shR = spanR
        do {
            let k = max(2, Int(0.05 * jaw))
            var cl = [Double](repeating: 0, count: H + 1), cr = cl
            for y in 0..<H { cl[y + 1] = cl[y] + spanL[y]; cr[y + 1] = cr[y] + spanR[y] }
            for y in 0..<H {
                let a = max(0, y - k), b = min(H - 1, y + k)
                shL[y] = (cl[b + 1] - cl[a]) / Double(b - a + 1); shR[y] = (cr[b + 1] - cr[a]) / Double(b - a + 1)
            }
        }
        // 4. Composite: user head + neck, backdrop where old clothes / shoulders stick out, suit on top.
        let feather = max(2, 0.02 * jaw)          // a real neck outline is soft, not a cut
        let jawShade = 0.16 * jaw                  // shadow the jaw casts on the neck
        func smooth(_ v: Double) -> Double { let t = max(0, min(1, v)); return t * t * (3 - 2 * t) }
        let jawRow = (0..<W).map { FaceGeometry.jawY(pts, Double($0)) }
        let jawWide = (0..<W).map { FaceGeometry.jawY(pts, fcx + (Double($0) - fcx) / 1.08).map { $0 + 0.015 * jaw } }
        let orig = neckStop == nil ? nil : RGBABitmap(user)
        // Ghost suit: inside the collar the user's real neck is kept wherever it is bare skin; what is not (old
        // clothes, the shadow an old collar casts, the backdrop of a thin neck) is filled from the skin around
        // it (push-pull: averaged outward over coarser and coarser grids, so the fill meets the real skin
        // seamlessly), plus the photo's grain. Rebuilding the whole neck looked flat and fake; stretching the
        // real one smeared it and dragged old-collar shadows down.
        var patch: (x0: Int, y0: Int, w: Int, h: Int, rgb: [Double], m: [Double])?
        if ghost, let orig {
            let ry0 = max(0, Int(chin - 0.05 * jaw)), ry1 = min(H - 1, Int(neckBottom) + 3)
            let rx0 = max(0, Int((ry0...ry1).map { spanL[$0] }.min()!) - 6), rx1 = min(W - 1, Int((ry0...ry1).map { spanR[$0] }.max()!) + 6)
            let w = rx1 - rx0 + 1, h = ry1 - ry0 + 1
            var known = [Double](repeating: 0, count: w * h), allow = known
            var C = [Double](repeating: 0, count: w * h * 3)
            // bare skin's typical brightness (to leave out shadows cast by old clothes)
            var ys = [Double]()
            for y in stride(from: Int(chin + 0.02 * jaw), to: min(ry1, Int(chin + 0.25 * jaw)), by: 2) {
                for x in stride(from: Int(spanL[y]), to: Int(spanR[y]), by: 2) where parts.map({ $0.skin(Double(x), Double(y)) > 0.5 && $0.face(Double(x), Double(y)) < 0.5 }) ?? true {
                    ys.append(ycc(orig.clamped(x, y)).0)
                }
            }
            let skinY = ys.isEmpty ? (ref?.Y ?? 150) * 0.85 : ys.sorted()[ys.count * 6 / 10]
            // and its hue: an old shirt collar beside the neck can pass as skin in the parts map (bluish fill)
            var cbs = [Double](), crs = [Double]()
            for y in stride(from: Int(chin + 0.02 * jaw), to: min(ry1, Int(chin + 0.25 * jaw)), by: 2) {
                for x in stride(from: Int(spanL[y] + 0.25 * (spanR[y] - spanL[y])), to: Int(spanR[y] - 0.25 * (spanR[y] - spanL[y])), by: 2) {
                    let (_, cb, cr) = ycc(orig.clamped(x, y)); cbs.append(cb); crs.append(cr)
                }
            }
            let skinCb = cbs.isEmpty ? (ref?.cb ?? 110) : cbs.sorted()[cbs.count / 2], skinCr = crs.isEmpty ? (ref?.cr ?? 150) : crs.sorted()[crs.count / 2]
            for y in ry0...ry1 {
                for x in rx0...rx1 {
                    let i = (y - ry0) * w + (x - rx0)
                    let inSpan = Double(x) >= spanL[y] - 1 && Double(x) <= spanR[y] + 1
                    guard inSpan, Double(y) >= chin - 0.05 * jaw else { continue }
                    let fx = Double(x), fy = Double(y), o = orig.at(x, y)
                    var k: Double
                    if let parts {
                        k = smooth((parts.skin(fx, fy) - 0.4) / 0.3) * (1 - smooth((parts.clothes(fx, fy) - 0.2) / 0.2))
                        k *= 1 - smooth((max(parts.face(fx, fy), parts.hair(fx, fy)) - 0.4) / 0.2)
                        allow[i] = 1 - smooth((max(parts.face(fx, fy), parts.hair(fx, fy)) - 0.4) / 0.2)
                    } else {
                        k = Double(y) < (neckStop ?? collarY) ? 1 : 0
                        allow[i] = 1
                    }
                    let (oy, ocb, ocr) = ycc(o)
                    k *= smooth((oy / skinY - 0.68) / 0.12)           // cast shadows are not the neck's own light
                    k *= 1 - smooth((hypot(ocb - skinCb, ocr - skinCr) - 7) / 6)
                    allow[i] *= smooth((Double(y) - (chin + 0.02 * jaw)) / (0.08 * jaw))   // never over the chin; eased in
                    known[i] = k
                    for c in 0..<3 { C[i * 3 + c] = Double(o[c]) * k }
                }
            }
            if known.reduce(0, +) < 30 {
                // nothing bare (a beard down to the collar): the skin in the shade under it
                // (darkest right under it, lighter toward the collar), darker toward the neck's sides
                let r = ref ?? (Y: 150, cb: 110, cr: 150)
                for y in 0..<h {
                    let t = smooth(Double(y + ry0 - Int(chin)) / max(1, neckBottom - chin)), Yr = r.Y * (0.45 + 0.3 * t)
                    for x in 0..<w {
                        let yy = y + ry0, half = max(1, (spanR[yy] - spanL[yy]) / 2), u = (Double(x + rx0) - (spanL[yy] + half)) / half
                        let Y = Yr * (1 - 0.25 * min(1, pow(abs(u), 3)))
                        let rgb = [Y + 1.402 * (r.cr - 128), Y - 0.344 * (r.cb - 128) - 0.714 * (r.cr - 128), Y + 1.772 * (r.cb - 128)]
                        for c in 0..<3 { C[(y * w + x) * 3 + c] = rgb[c] }
                    }
                }
                patch = (rx0, ry0, w, h, C, allow)
            } else {
                // push: halve until one cell, weights capped at 1
                var lw = [known], lc = [C], lws = [(w, h)]
                while lws.last!.0 > 1 || lws.last!.1 > 1 {
                    let (pw, ph) = lws.last!, nw = (pw + 1) / 2, nh = (ph + 1) / 2
                    var W2 = [Double](repeating: 0, count: nw * nh), C2 = [Double](repeating: 0, count: nw * nh * 3)
                    let pW = lw.last!, pC = lc.last!
                    for y in 0..<ph { for x in 0..<pw {
                        let j = (y / 2) * nw + x / 2, i = y * pw + x
                        W2[j] += pW[i]; for c in 0..<3 { C2[j * 3 + c] += pC[i * 3 + c] }
                    } }
                    for j in 0..<(nw * nh) where W2[j] > 1 { for c in 0..<3 { C2[j * 3 + c] /= W2[j] }; W2[j] = 1 }
                    lw.append(W2); lc.append(C2); lws.append((nw, nh))
                }
                // pull: each level's holes from the coarser level (bilinear), back down to full size
                var col = (0..<3).map { c in lw.last![0] > 0 ? lc.last![c] / lw.last![0] : 128 }
                for L in stride(from: lws.count - 2, through: 0, by: -1) {
                    let (pw, ph) = lws[L], (cw, ch) = lws[L + 1], pW = lw[L], pC = lc[L]
                    var out = [Double](repeating: 0, count: pw * ph * 3)
                    for y in 0..<ph { for x in 0..<pw {
                        let gx = max(0, min(Double(cw - 1), (Double(x) - 0.5) / 2)), gy = max(0, min(Double(ch - 1), (Double(y) - 0.5) / 2))
                        let x0 = Int(gx), y0 = Int(gy), x1 = min(cw - 1, x0 + 1), y1 = min(ch - 1, y0 + 1), ax = gx - Double(x0), ay = gy - Double(y0)
                        let i = y * pw + x, wv = min(1, pW[i])
                        for c in 0..<3 {
                            let a = col[(y0 * cw + x0) * 3 + c] * (1 - ax) + col[(y0 * cw + x1) * 3 + c] * ax
                            let b = col[(y1 * cw + x0) * 3 + c] * (1 - ax) + col[(y1 * cw + x1) * 3 + c] * ax
                            let cc = a * (1 - ay) + b * ay
                            out[i * 3 + c] = pW[i] > 0 ? (pC[i * 3 + c] / max(pW[i], 1e-6)) * wv + cc * (1 - wv) : cc
                        }
                    } }
                    col = out
                }
                // where the fill shows: not bare skin (softened so real skin fades into the fill), and allowed
                let R = max(1, Int(0.012 * jaw))
                var soft = known, tmp = known
                for _ in 0..<2 {
                    for y in 0..<h { var acc = [Double](repeating: 0, count: w + 1); for x in 0..<w { acc[x + 1] = acc[x] + soft[y * w + x] }
                        for x in 0..<w { let a = max(0, x - R), b = min(w - 1, x + R); tmp[y * w + x] = (acc[b + 1] - acc[a]) / Double(b - a + 1) } }
                    for x in 0..<w { var acc = [Double](repeating: 0, count: h + 1); for y in 0..<h { acc[y + 1] = acc[y] + tmp[y * w + x] }
                        for y in 0..<h { let a = max(0, y - R), b = min(h - 1, y + R); soft[y * w + x] = (acc[b + 1] - acc[a]) / Double(b - a + 1) } }
                }
                patch = (rx0, ry0, w, h, col, (0..<(w * h)).map { allow[$0] * (1 - known[$0] * min(1, soft[$0] * 1.5)) })
            }
        }
        var neckRef: (Y: Double, cb: Double, cr: Double)?
        do {
            // the user's neck just above the collar (where the model's neck takes over)
            let fw = Double(wingL.firstIndex(where: { $0 != nil }) ?? Int(collarY))
            let yb = min(fw, neckEnd ?? fw) - 0.01 * jaw, ya = max(chin + 0.1 * jaw, yb - 0.1 * jaw)
            var ys = [Double](), cbs = [Double](), crs = [Double]()
            if yb > ya {
                for y in stride(from: Int(ya), to: Int(yb), by: 2) {
                    let half = (spanR[y] - spanL[y]) * 0.3, m = (spanL[y] + spanR[y]) / 2
                    guard half > 2 else { continue }
                    for x in stride(from: Int(m - half), to: Int(m + half), by: 2) {
                        // skin only: a beard there turned the neck fill inside the collar flat grey
                        if let parts, parts.skin(Double(x), Double(y)) < 0.6 || parts.face(Double(x), Double(y)) > 0.5 { continue }
                        let (Y, cb, cr) = ycc(px.clamped(x, y)); ys.append(Y); cbs.append(cb); crs.append(cr)
                    }
                }
            }
            if ys.count > 20 { neckRef = (ys.sorted()[ys.count / 2], cbs.sorted()[cbs.count / 2], crs.sorted()[crs.count / 2]) }
            else if let ref { neckRef = (ref.Y * 0.88, ref.cb, ref.cr) }      // neck covered: cheeks, in shade
        }
        // light the suit like the user's photo: half the difference between the user's skin and the
        // model's skin (white balance), small and clamped so the suit colour stays true
        let dCb = ref.map { max(-7, min(7, 0.7 * ($0.cb - garment.skinRef.cb))) } ?? 0
        let dCr = ref.map { max(-7, min(7, 0.7 * ($0.cr - garment.skinRef.cr))) } ?? 0
        let kY = ref.map { max(0.92, min(1.06, pow($0.Y / garment.skinRef.Y, 0.3))) } ?? 1
        // the photo's light comes from one side (one cheek darker): the suit gets the same side shading
        func cheekY(_ side: Double) -> Double {
            var v = [Double]()
            for yy in stride(from: Int(chin - 0.45 * jaw), to: Int(chin - 0.2 * jaw), by: 3) {
                for xx in stride(from: Int(fcx + side * 0.22 * jaw), to: Int(fcx + side * 0.34 * jaw), by: side > 0 ? 3 : -3) {
                    v.append(ycc(px.clamped(xx, yy)).0)
                }
            }
            return v.isEmpty ? 1 : v.sorted()[v.count / 2]
        }
        let yl = cheekY(-1), yr = cheekY(1)
        let tilt = max(-0.12, min(0.12, (yr - yl) / max(1, yr + yl)))
        for yy in 0..<H {
            if let h = hStretch[yy], let rowSrc, h.r > h.l {
                // only the outer part of each side is stretched: the throat in the middle stays put
                let w = 0.35 * (h.r - h.l)
                func put(_ x: Int, _ sx: Double) {
                    let o = rowSrc.clamped(Int(sx.rounded()), yy), u = px.at(x, yy)
                    for c in 0..<3 { u[c] = o[c] }
                    u[3] = 255
                }
                if h.nl < h.l - 0.5 {
                    for x in max(0, Int(h.nl))...min(W - 1, Int(h.l + w)) { put(x, (h.l + w) - ((h.l + w) - Double(x)) * w / max(1, h.l + w - h.nl)) }
                }
                if h.nr > h.r + 0.5 {
                    for x in max(0, Int(h.r - w))...min(W - 1, Int(h.nr)) { put(x, (h.r - w) + (Double(x) - (h.r - w)) * w / max(1, h.nr - (h.r - w))) }
                }
            }
            if let pt = patch, yy >= pt.y0, yy < pt.y0 + pt.h {
                for x in max(0, pt.x0)..<min(W, pt.x0 + pt.w) {
                    let i = (yy - pt.y0) * pt.w + (x - pt.x0), m = pt.m[i]
                    guard m > 0.002 else { continue }
                    var hs = UInt32(truncatingIfNeeded: x &* 374761393 ^ yy &* 668265263)
                    hs = (hs ^ (hs >> 13)) &* 1274126177; hs ^= hs >> 16
                    let nz = ((Double(hs & 0xFFFF) + Double(hs >> 16)) / 65535 - 1) / 0.408 * skinGrain * 0.8
                    let u = px.at(x, yy)
                    for c in 0..<3 { u[c] = UInt8(max(0, min(255, Double(u[c]) * (1 - m) + (pt.rgb[i * 3 + c] + nz) * m))) }
                    u[3] = 255
                }
            } else if !ghost, let src = mirrorRow[yy], let orig, let e = neckStop {
                let t = max(0, min(1, (Double(yy) - e) / max(1, collarY - e)))
                let shade = 1 - 0.18 * t                     // toward the collar the neck falls into shadow
                // source row's neck mapped onto this row's outline (it may have been widened toward the collar since)
                let ms = mirrorSpan[yy] ?? (spanL[yy], spanR[yy])
                let k = (ms.r - ms.l) / max(1, spanR[yy] - spanL[yy])
                for x in max(0, Int(spanL[yy]) - 2)...min(W - 1, Int(spanR[yy]) + 2) {
                    let sx = Int((ms.l + (Double(x) - spanL[yy]) * k).rounded())
                    // between source rows (a stretched row repeated as-is makes horizontal bands), plus the
                    // photo's grain (stretching smooths the skin's own)
                    let o = orig.clamped(sx, src), o2 = orig.clamped(sx, src + 1), u = px.at(x, yy), fr = mirrorFrac[yy]
                    var hs = UInt32(truncatingIfNeeded: x &* 374761393 ^ yy &* 668265263)
                    hs = (hs ^ (hs >> 13)) &* 1274126177; hs ^= hs >> 16
                    let nz = ((Double(hs & 0xFFFF) + Double(hs >> 16)) / 65535 - 1) / 0.408 * skinGrain
                    for c in 0..<3 { u[c] = UInt8(max(0, min(255, (Double(o[c]) * (1 - fr) + Double(o2[c]) * fr) * shade + nz))) }
                    u[3] = 255
                }
            }
            for x in 0..<W {
                let u = px.at(x, yy)
                let dx = abs(Double(x) - ncx)
                // below the jaw (or the ear lobes beside the face) only the neck is the user's: the rest
                // (old clothes, shoulders) becomes backdrop — the backdrop is already painted around them.
                // Vision's jaw contour can be narrower than the real cheek (selfie from below), so a
                // jaw-shaped fallback outline (chin at the centre, rising toward the ears) also keeps the
                // face — no colour test: the far cheek is often in shadow and would read as "not skin".
                // Both outlines are anti-aliased over `feather` so the jaw edge never shows pixel steps.
                let jy = jawRow[x] ?? earBottom
                // Vision's contour widened a little: its shape follows the real jaw (curving in to the chin)
                // but it can sit inside the cheek
                let faceIn = jawWide[x].map { 1 - smooth((Double(yy) - $0) / feather + 0.5) } ?? 0
                let below = Double(yy) - jy
                var keepFace = max(1 - smooth(below / feather + 0.5), faceIn)
                if let parts, keepFace > 0, jawRow[x] == nil || below > 0 {
                    // outside Vision's own jaw line (widened outline, ear zone): old clothes are not face
                    keepFace *= 1 - smooth((parts.clothes(Double(x), Double(yy)) - 0.15) / 0.25)
                    // beside the face from eye level down only skin (ears, beard) and hair are the user's: the
                    // rim of an old shoulder / a turned-up coat collar there would stay as a streak or block
                    if jawRow[x] == nil, Double(yy) > top + 0.4 * (chin - top) {
                        keepFace *= smooth((parts.skin(Double(x), Double(yy)) + parts.hair(Double(x), Double(yy)) - 0.25) / 0.3)
                    }
                }
                if let ref, mask != nil, Double(yy) < chin + (parts != nil ? 1.5 : 0.05) * jaw, abs(Double(x) - fcx) < 1.3 * jaw, person(x, yy) {
                    // hair, and the face below the jaw line (a beard): the model's face class, not the neck
                    let dark = parts.map { smooth((max($0.hair(Double(x), Double(yy)), $0.face(Double(x), Double(yy))) - 0.3) / 0.4) }
                        ?? smooth((0.55 * ref.Y - ycc(u).0) / (0.12 * ref.Y))      // hair, not skin / shirt
                    let fade = parts != nil ? 1 : 1 - smooth((Double(yy) - (chin - 0.1 * jaw)) / (0.15 * jaw))
                    keepFace = max(keepFace, dark * fade)
                }
                if mask != nil, keepFace < 1 {
                    let l = spanL[yy], r = spanR[yy]
                    // shading follows the vertically smoothed outline: the outline steps where the collar
                    // opening starts, and shading on the raw one drew a line across the neck there
                    let mid = (shL[yy] + shR[yy]) / 2, half = max(1, (shR[yy] - shL[yy]) / 2)
                    // round the neck: darker toward its sides, and in the jaw's shadow right under the jaw
                    // (faded in from the jaw line so the face itself is never touched)
                    let fadeIn = smooth(below / (0.05 * jaw)) * (1 - keepFace)
                    let rim = smooth((abs(Double(x) - mid) / half - 0.55) / 0.45)
                    let under = jawRow[x] == nil ? 0 : 1 - smooth(below / jawShade)
                    let out = max(l - Double(x), Double(x) - r) + feather / 2
                    let outside = smooth(out / feather)
                    // shading only on the neck itself, never on what becomes backdrop
                    let k = 1 - fadeIn * (1 - outside) * (0.17 * rim + 0.2 * under * (1 - rim))
                    if k < 1 { for c in 0..<3 { u[c] = UInt8(Double(u[c]) * k) } }
                    var m = outside * (1 - keepFace)
                    if let wl = wingL[yy], let wr = wingR[yy], Double(x) > wl, Double(x) < wr, outside > 0 {
                        // gap between the neck and the collar: the back of the shirt collar shows there,
                        // in the neck's shade (darker right next to the neck)
                        let leftGap = Double(x) < mid
                        let wing = leftGap ? wl : wr
                        let sx = max(0, min(W - 1, Int(leftGap ? wing - 0.04 * jaw : wing + 0.04 * jaw)))   // on the collar
                        let band = suit.at(sx, min(H - 1, bandRow[yy]))
                        let edge = leftGap ? l : r
                        let t = max(0, min(1, abs(Double(x) - edge) / max(1, abs(wing - edge))))
                        let f = 0.7 + 0.2 * t
                        let ba = max(1, Double(band[3])) / 255
                        // the inside of a shirt collar is light: if the sample hit the jacket, use light grey
                        let light = ycc(band).0 > 140
                        for c in 0..<3 {
                            let shirt = (light ? Double(band[c]) / ba : 228) * f
                            u[c] = UInt8(max(0, min(255, Double(u[c]) * (1 - outside) + shirt * outside)))
                        }
                        u[3] = 255
                        // the band's top edge runs down from the wing tip to the back of the neck (it sits
                        // lower behind the neck): above that line it is still backdrop
                        let topY = firstWing + (1 - t) * 0.07 * jaw
                        m = outside * (1 - keepFace) * (1 - smooth((Double(yy) - topY) / 3 + 0.5))
                    }
                    if m > 0 {
                        u[0] = UInt8(Double(u[0]) * (1 - m) + Double(bgR) * m)
                        u[1] = UInt8(Double(u[1]) * (1 - m) + Double(bgG) * m)
                        u[2] = UInt8(Double(u[2]) * (1 - m) + Double(bgB) * m)
                        u[3] = 255
                    }
                }
                // bottom of the collar opening: the model's own skin there (real collar / knot shadows),
                // recoloured to the user's neck
                if let vskin, let nr = neckRef {
                    let v = vskin.at(x, yy), va = Double(v[3]) / 255
                    if va > 0.01 {
                        let (vy, vcb, vcr) = ycc(v)
                        // + skin grain like the photo's (the model render is smoother than a phone photo)
                        var hsh = UInt32(truncatingIfNeeded: x &* 73856093 ^ yy &* 19349663)
                        hsh = (hsh ^ (hsh >> 13)) &* 1274126177
                        let grain = (Double(hsh & 0xFF) / 255 - 0.5) * 7
                        let Y = vy * nr.Y / max(1, garment.skinRef.Y) + grain, cb = vcb - garment.skinRef.cb + nr.cb, cr = vcr - garment.skinRef.cr + nr.cr
                        let rgb = [Y + 1.402 * (cr - 128), Y - 0.344 * (cb - 128) - 0.714 * (cr - 128), Y + 1.772 * (cb - 128)]
                        for c in 0..<3 { u[c] = UInt8(max(0, min(255, Double(u[c]) * (1 - va) + rgb[c] * va))) }
                    }
                }
                // the collar wraps round the neck: shadow on the neck along the collar's inner edges
                if let wl = wingL[yy], let wr = wingR[yy], Double(x) > wl, Double(x) < wr {
                    // (ghost suit: the neck fills the whole V, so a strong narrow band read as two painted stripes)
                    let d = min(Double(x) - wl, wr - Double(x)), D = (ghost ? 0.07 : 0.045) * jaw
                    if d < D {
                        // ghost: a thin dark contact line where the collar sits on the skin, then a soft falloff
                        let tight = ghost ? 0.28 * exp(-d / max(1, 0.008 * jaw)) : 0
                        let k = 1 - min(0.4, (ghost ? 0.12 : 0.3) * pow(1 - d / D, ghost ? 2 : 3) + tight)
                        for c in 0..<3 { u[c] = UInt8(Double(u[c]) * k) }
                    }
                }
                // soft contact shadow on the neck just above the collar
                let sTop = suitTop[x]
                if Double(x) >= spanL[yy], Double(x) <= spanR[yy], dx < neckHalf * 1.3, yy < sTop, Double(sTop - yy) < shadowDepth {
                    let k = 1 - 0.22 * (1 - Double(sTop - yy) / shadowDepth)
                    u[0] = UInt8(Double(u[0]) * k); u[1] = UInt8(Double(u[1]) * k); u[2] = UInt8(Double(u[2]) * k)
                }
                let g = suit.at(x, yy)
                let a = Double(g[3]) / 255
                var cast = 1.0
                if let wl = wingL[yy], let wr = wingR[yy], Double(yy) <= neckBottom {
                    let d = Double(x) <= wl ? wl - Double(x) : Double(x) >= wr ? Double(x) - wr : -1, D = 0.03 * jaw
                    if d >= 0, d < D { cast = 1 - 0.2 * (1 - d / D) * (1 - d / D) }
                }
                // the head lights the collar from above: the jaw casts a soft shadow on the shirt / collar under it
                if a > 0, let jy = jawRow[x], Double(yy) > jy, abs(Double(x) - fcx) < 0.4 * jaw {
                    // under the chin only: toward the collar points it greyed their tips
                    let t = (Double(yy) - jy) / (0.14 * jaw)
                    if t < 1 { cast *= 1 - 0.24 * (1 - t) * (1 - t) * (1 - smooth((abs(Double(x) - fcx) - 0.2 * jaw) / (0.2 * jaw))) }
                }
                if a > 0 {
                    let lum = (0.299 * Double(g[0]) + 0.587 * Double(g[1]) + 0.114 * Double(g[2])) / 255
                    let side = 1 + tilt * max(-1, min(1, (Double(x) - ncx) / (1.5 * jaw)))
                    let gr = Double(g[0]) * kY * side * cast + lum * 1.402 * dCr
                    let gg = Double(g[1]) * kY * side * cast - lum * (0.344 * dCb + 0.714 * dCr)
                    let gb = Double(g[2]) * kY * side * cast + lum * 1.772 * dCb
                    var hn = UInt32(truncatingIfNeeded: x &* 2654435761 ^ yy &* 40503 ^ 0x5bd1e995)
                    hn = (hn ^ (hn >> 15)) &* 2246822519; hn ^= hn >> 13
                    let nz = grain * ((Double(hn & 0xFFFF) + Double(hn >> 16)) / 65535 - 1) / 0.408 * a
                    let tinted = [gr + nz, gg + nz, gb + nz]
                    for c in 0..<3 { u[c] = UInt8(max(0, min(255, tinted[c] + Double(u[c]) * (1 - a)))) }
                    u[3] = 255
                }
                // long hair falls in front of the shoulders: the user's own hair goes over the suit
                if let parts, let hairSrc, a > 0, Double(yy) > chin - 0.3 * jaw, abs(Double(x) - fcx) < 1.3 * jaw {
                    let hp = parts.hair(Double(x), Double(yy)) * (hairCut.map { Double($0.clamped(x, yy)[0]) / 255 } ?? 1)
                    let k = smooth((hp - 0.35) / 0.35)
                    if k > 0 {
                        let o = hairSrc.at(x, yy)
                        for c in 0..<3 { u[c] = UInt8(Double(u[c]) * (1 - k) + Double(o[c]) * k) }
                    }
                }
            }
        }
        return px.image()
    }

    /// Fine / coarse detail ratio (a blurred image loses the fine part first) and the noise level
    /// (robust: median of the fine detail) over a region of `bmp`; `opaque`: only fully covered pixels.
    private static func detail(_ bmp: RGBABitmap, _ x0: Int, _ x1: Int, _ y0: Int, _ y1: Int, opaque: Bool) -> (ratio: Double, noise: Double)? {
        func lum(_ x: Int, _ y: Int) -> Double { let p = bmp.at(x, y); return 0.299 * Double(p[0]) + 0.587 * Double(p[1]) + 0.114 * Double(p[2]) }
        var e1 = [Double](), e2 = 0.0
        for y in stride(from: max(2, y0), to: min(bmp.h - 2, y1), by: 2) {
            for x in stride(from: max(2, x0), to: min(bmp.w - 2, x1), by: 2) {
                if opaque, bmp.at(x - 2, y - 2)[3] < 250 || bmp.at(x + 2, y - 2)[3] < 250 || bmp.at(x - 2, y + 2)[3] < 250
                    || bmp.at(x + 2, y + 2)[3] < 250 || bmp.at(x, y)[3] < 250 { continue }
                let c = lum(x, y)
                var b1 = 0.0, b2 = 0.0
                for dy in -2...2 {
                    for dx in -2...2 {
                        let v = lum(x + dx, y + dy); b2 += v
                        if abs(dx) <= 1, abs(dy) <= 1 { b1 += v }
                    }
                }
                e1.append(abs(c - b1 / 9)); e2 += abs(c - b2 / 25)
            }
        }
        guard e1.count > 50 else { return nil }
        return (e1.reduce(0, +) / max(1e-6, e2), 1.4826 * e1.sorted()[e1.count / 2])
    }

    /// 3×3 box blur of all four (premultiplied) channels: the outline softens with the content.
    private static func boxBlur3(_ src: RGBABitmap) -> RGBABitmap {
        let w = src.w, h = src.h, out = RGBABitmap(width: w, height: h)
        for y in 0..<h {
            for x in 0..<w {
                var acc = (0, 0, 0, 0)
                for dy in -1...1 {
                    for dx in -1...1 {
                        let p = src.clamped(x + dx, y + dy)
                        acc.0 += Int(p[0]); acc.1 += Int(p[1]); acc.2 += Int(p[2]); acc.3 += Int(p[3])
                    }
                }
                let o = out.at(x, y)
                o[0] = UInt8(acc.0 / 9); o[1] = UInt8(acc.1 / 9); o[2] = UInt8(acc.2 / 9); o[3] = UInt8(acc.3 / 9)
            }
        }
        return out
    }


    /// First row under the chin where the centre of the neck is no longer skin (the user's own
    /// collar / neckline). Skin reference = the cheeks; the shadow right under the chin is skipped.
    static func skinReference(_ px: RGBABitmap, pts: [CGPoint], cx: Double, chin: Double, jaw: Double) -> (Y: Double, cb: Double, cr: Double)? {
        guard let eyeLevel = pts.map(\.y).min() else { return nil }
        var ys = [Double](), cbs = [Double](), crs = [Double]()
        let y0 = Int(eyeLevel + 0.45 * (chin - eyeLevel)), y1 = Int(eyeLevel + 0.7 * (chin - eyeLevel))
        for y in stride(from: y0, to: y1, by: 2) {
            for dx in [-0.3, -0.25, 0.25, 0.3] {
                let (Y, cb, cr) = ycc(px.clamped(Int(cx + dx * jaw), y)); ys.append(Y); cbs.append(cb); crs.append(cr)
            }
        }
        guard ys.count > 8 else { return nil }
        func med(_ v: [Double]) -> Double { v.sorted()[v.count / 2] }
        return (med(ys), med(cbs), med(crs))
    }

    static func isClothes(_ p: UnsafeMutablePointer<UInt8>, _ ref: (Y: Double, cb: Double, cr: Double)) -> Bool {
        let (Y, cb, cr) = ycc(p)
        return abs(cb - ref.cb) > 10 || abs(cr - ref.cr) > 14 || Y < 0.4 * ref.Y
    }

    /// First row (under the chin) where one neck-side column turns into clothes for good: clearly not skin
    /// colour, or very dark — a neck in shadow is darker but keeps its skin hue.
    /// Clearly not skin: another hue, or very dark (a shaded neck keeps its hue; hair is handled apart).
    static func strictClothes(_ p: UnsafeMutablePointer<UInt8>, _ ref: (Y: Double, cb: Double, cr: Double)) -> Bool {
        let (Y, cb, cr) = ycc(p)
        return abs(cb - ref.cb) > 12 || abs(cr - ref.cr) > 16 || Y < 0.28 * ref.Y
    }

    static func sideClothesTop(_ px: RGBABitmap, ref: (Y: Double, cb: Double, cr: Double), x: Double, chin: Double, jaw: Double) -> Double? {
        var run = 0
        for y in Int(chin + 0.12 * jaw)..<min(px.h - 1, Int(chin + 1.0 * jaw)) {
            let clothes = strictClothes(px.clamped(Int(x), y), ref)
            run = clothes ? run + 1 : 0
            if run >= 4 { return Double(y - 3) }
        }
        return nil
    }

    static func clothesTop(_ px: RGBABitmap, ref: (Y: Double, cb: Double, cr: Double), cx: Double, chin: Double, jaw: Double, neckHalf: Double) -> Double? {
        var run = 0
        var y = Int(chin + 0.1 * jaw)
        let end = min(px.h - 1, Int(chin + 1.2 * jaw))
        while y < end {
            var off = 0, n = 0
            for x in stride(from: Int(cx - 0.6 * neckHalf), through: Int(cx + 0.6 * neckHalf), by: 2) {
                n += 1
                if isClothes(px.clamped(x, y), ref) { off += 1 }
            }
            run = (n > 0 && Double(off) > 0.5 * Double(n)) ? run + 1 : 0
            if run >= 3 { return Double(y - 2) }
            y += 1
        }
        return nil
    }
}
