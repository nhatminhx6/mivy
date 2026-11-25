import CoreGraphics
import Foundation

/// Last step before a cut-out goes onto a new backdrop: along the whole soft edge of the mask (hair
/// especially), the old backdrop is taken out of each pixel's colour, and pixels that are really just
/// old wall lose their coverage. Without it a light wall left a glowing rim round the hair on the blue
/// backdrop (the edge clean-up near the face does not reach the crown, and feathering the mask spreads
/// it onto uncleaned wall).
///
/// Per edge pixel: B = the old backdrop around it, F = the solid subject around it (both smooth fields,
/// filled outward from clear pixels on a coarse grid). The pixel's own position between B and F gives
/// how much subject it really holds; its colour is solved for the subject part.
enum EdgeDefringe {
    /// - Parameters:
    ///   - image: the photo (opaque), full size
    ///   - alpha: the cut-out mask (gray), same size
    /// - Returns: the photo with edge colours cleaned, and the mask with wall-only pixels lowered; nil when
    ///   there is no soft edge.
    ///   - face: face probability per pixel, when known: never thinned (light skin on a light wall)
    static func apply(_ image: CGImage, alpha: CGImage,
                      face: ((Int, Int) -> Double)? = nil) -> (image: CGImage, mask: CGImage)? {
        let px = RGBABitmap(image)
        let W = px.w, H = px.h
        let m = RGBABitmap(alpha, width: W, height: H)
        // coarse grid: B and F are smooth, a full-size fill would be slow and heavy
        let s = max(2, min(W, H) / 300)
        let gw = (W + s - 1) / s, gh = (H + s - 1) / s
        var bS = [Float](repeating: 0, count: gw * gh * 3), bW = [Float](repeating: 0, count: gw * gh)
        var fS = bS, fW = bW
        var band = false
        for y in 0..<H {
            for x in 0..<W {
                let a = m.at(x, y)[0], p = px.at(x, y), k = (y / s) * gw + x / s
                if a < 6 {
                    bW[k] += 1; for c in 0..<3 { bS[k * 3 + c] += Float(p[c]) }
                } else if a <= 249 { band = true }
            }
        }
        guard band, let B = fill(bS, bW, gw, gh) else { return nil }
        // a band INSIDE the edge too: wall showing through gaps between strands is "solid" in the mask
        // (the light patches at the crown); only where the mask edge is near (blurred mask below 1)
        let R = max(2, min(W, H) / 24)
        var ab = [Float](repeating: 0, count: W * H)
        for y in 0..<H { for x in 0..<W { ab[y * W + x] = Float(m.at(x, y)[0]) / 255 } }
        do {
            var t = ab, acc = [Float](repeating: 0, count: max(W, H) + 1)
            for y in 0..<H {
                for x in 0..<W { acc[x + 1] = acc[x] + ab[y * W + x] }
                for x in 0..<W { let a = max(0, x - R), b = min(W - 1, x + R); t[y * W + x] = (acc[b + 1] - acc[a]) / Float(b - a + 1) }
            }
            for x in 0..<W {
                for y in 0..<H { acc[y + 1] = acc[y] + t[y * W + x] }
                for y in 0..<H { let a = max(0, y - R), b = min(H - 1, y + R); ab[y * W + x] = (acc[b + 1] - acc[a]) / Float(b - a + 1) }
            }
        }
        func sample(_ f: [Float], _ x: Int, _ y: Int) -> [Float] {
            let gx = max(0, min(Float(gw - 1), (Float(x) + 0.5) / Float(s) - 0.5))
            let gy = max(0, min(Float(gh - 1), (Float(y) + 0.5) / Float(s) - 0.5))
            let x0 = Int(gx), y0 = Int(gy), x1 = min(gw - 1, x0 + 1), y1 = min(gh - 1, y0 + 1)
            let tx = gx - Float(x0), ty = gy - Float(y0)
            return (0..<3).map { c in
                let a = f[(y0 * gw + x0) * 3 + c] * (1 - tx) + f[(y0 * gw + x1) * 3 + c] * tx
                let b = f[(y1 * gw + x0) * 3 + c] * (1 - tx) + f[(y1 * gw + x1) * 3 + c] * tx
                return a * (1 - ty) + b * ty
            }
        }
        // the subject colour mostly from solid pixels far from the old backdrop: wall seen through
        // gaps in thick hair counts as "solid" in the mask, and averaging it in made the subject colour
        // as light as the wall (nothing to tell them apart, the gaps stayed white)
        // Per cell, the subject colour from pixels clearly darker OR clearly lighter than the local wall,
        // whichever side stands out more there (dark hair on a light wall, or the other way round). An
        // unevenly lit wall (ceiling lights) is a little off the local average and no longer counts; cells
        // with nothing clearly off the wall (a mask grown over plain wall) borrow from their neighbours.
        func lum(_ c: [Float]) -> Float { 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] }
        var dS = [Float](repeating: 0, count: gw * gh * 3), dW = [Float](repeating: 0, count: gw * gh)
        var lS = dS, lW = dW, dM = dW, lM = dW
        for y in 0..<H {
            for x in 0..<W where m.at(x, y)[0] > 249 {
                let p = px.at(x, y), b = sample(B, x, y), pc = [Float(p[0]), Float(p[1]), Float(p[2])]
                let dy = lum(pc) - lum(b), k = (y / s) * gw + x / s
                if dy < -70 { dW[k] += 1; dM[k] -= dy; for c in 0..<3 { dS[k * 3 + c] += pc[c] } }
                else if dy > 70 { lW[k] += 1; lM[k] += dy; for c in 0..<3 { lS[k * 3 + c] += pc[c] } }
            }
        }
        for k in 0..<(gw * gh) {
            // (dark wins ties easily: bright wall patches / lights beside dark hair are the usual case)
            let dark = dM[k] * 3 >= lM[k]
            let w = dark ? dW[k] : lW[k]
            guard w > 0 else { continue }
            fW[k] = w; for c in 0..<3 { fS[k * 3 + c] = dark ? dS[k * 3 + c] : lS[k * 3 + c] }
        }
        guard let F = fill(fS, fW, gw, gh) else { return nil }
        for y in 0..<H {
            for x in 0..<W {
                let mp = m.at(x, y), a8 = mp[0]
                guard a8 >= 6, a8 <= 249 || ab[y * W + x] < 0.985 else { continue }
                let p = px.at(x, y)
                // skin (forehead at the hairline, ears, cheeks) is never thinned: light skin next to a light wall
                // reads as half wall (a blue spot on the forehead)
                let r = Float(p[0]), g = Float(p[1]), bl = Float(p[2])
                let sy = 0.299 * r + 0.587 * g + 0.114 * bl, scb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * bl
                let scr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * bl
                // (inside the person only: at the soft edge a skin/wall blend passes the skin test too, and
                // skipping it left a white rim round ears and a shaved head)
                if a8 > 249, sy > 60, scr > 136, scr < 176, scb > 80, scb < 128 { continue }
                if a8 > 249, let face, face(x, y) > 0.4 { continue }
                let b = sample(B, x, y), f = sample(F, x, y)
                let d = (0..<3).map { f[$0] - b[$0] }, L = d.reduce(0) { $0 + $1 * $1 }
                var a = Float(a8) / 255
                if L > 40 * 40 || (a8 <= 249 && L > 30 * 30) {
                    // how much subject the pixel really holds (its place between backdrop and subject)
                    let raw = max(0, min(1, (0..<3).reduce(Float(0)) { $0 + (Float(p[$1]) - b[$1]) * d[$1] } / L))
                    // a mask looser than the subject (wall inside its soft edge): coverage lowered to what
                    // the colour says; never raised (a dark wall behind dark hair says nothing)
                    a = min(a, a8 > 249 ? raw * 1.3 : max(raw * 1.15, a * 0.25))
                }
                // colour of the subject part: solved where there is enough of it, the surrounding subject
                // colour where there is little (dividing by a small coverage only amplifies noise)
                let t = min(1, max(0, (a - 0.15) / 0.45))
                // wall seen through hair the mask called solid: whatever subject is there is the hair around it
                // (solving the colour kept bright flecks of wall / shine)
                let trust = a8 > 249 && a < 0.95 ? 0 : t * t * (3 - 2 * t)
                for c in 0..<3 {
                    let est = max(0, min(255, (Float(p[c]) - (1 - a) * b[c]) / max(a, 0.15)))
                    p[c] = UInt8(max(0, min(255, f[c] * (1 - trust) + est * trust)))
                }
                let v = UInt8(max(0, min(255, a * 255)))
                mp[0] = v; mp[1] = v; mp[2] = v
            }
        }
        guard let img = px.image(), let rgba = m.image() else { return nil }
        let g = FaceGeometry.grayContext(Double(W), Double(H))
        g.draw(rgba, in: CGRect(x: 0, y: 0, width: W, height: H))
        guard let mask = g.makeImage() else { return nil }
        return (img, mask)
    }

    /// Push-pull fill of a sparse colour field (sums + weights per cell): averaged outward over coarser and
    /// coarser grids, then pulled back down (bilinear), so empty cells get the nearby colours smoothly.
    private static func fill(_ S: [Float], _ Wt: [Float], _ w: Int, _ h: Int) -> [Float]? {
        guard Wt.contains(where: { $0 > 0 }) else { return nil }
        var lw = [Wt], lc = [S], dims = [(w, h)]
        // normalise to colour × weight with weight ≤ 1
        for i in 0..<(w * h) where lw[0][i] > 1 { for c in 0..<3 { lc[0][i * 3 + c] /= lw[0][i] }; lw[0][i] = 1 }
        while dims.last!.0 > 1 || dims.last!.1 > 1 {
            let (pw, ph) = dims.last!, nw = (pw + 1) / 2, nh = (ph + 1) / 2
            var W2 = [Float](repeating: 0, count: nw * nh), C2 = [Float](repeating: 0, count: nw * nh * 3)
            let pW = lw.last!, pC = lc.last!
            for y in 0..<ph { for x in 0..<pw {
                let j = (y / 2) * nw + x / 2, i = y * pw + x
                W2[j] += pW[i]; for c in 0..<3 { C2[j * 3 + c] += pC[i * 3 + c] }
            } }
            for j in 0..<(nw * nh) where W2[j] > 1 { for c in 0..<3 { C2[j * 3 + c] /= W2[j] }; W2[j] = 1 }
            lw.append(W2); lc.append(C2); dims.append((nw, nh))
        }
        var col: [Float] = (0..<3).map { c in lw.last![0] > 0 ? lc.last![c] / lw.last![0] : 128 }
        for L in stride(from: dims.count - 2, through: 0, by: -1) {
            let (pw, ph) = dims[L], (cw, ch) = dims[L + 1], pW = lw[L], pC = lc[L]
            var out = [Float](repeating: 0, count: pw * ph * 3)
            for y in 0..<ph { for x in 0..<pw {
                let gx = max(0, min(Float(cw - 1), (Float(x) - 0.5) / 2)), gy = max(0, min(Float(ch - 1), (Float(y) - 0.5) / 2))
                let x0 = Int(gx), y0 = Int(gy), x1 = min(cw - 1, x0 + 1), y1 = min(ch - 1, y0 + 1), ax = gx - Float(x0), ay = gy - Float(y0)
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
        return col
    }
}
