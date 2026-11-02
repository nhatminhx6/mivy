import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
// defringe <body.png> [more.png …]: in place. The cut-out's soft edge still carries the white studio
// backdrop (a light line along the shoulders on a coloured backdrop): every pixel that is not solid,
// or lies within `band` px of one, takes the colour of the nearest solid pixel; alpha is kept.
let band = 3
for path in CommandLine.arguments.dropFirst() {
    let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil)!
    let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
    let w = img.width, h = img.height
    let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
    let px = ctx.data!.bindMemory(to: UInt8.self, capacity: w * h * 4)
    // distance (chessboard, capped) to the nearest non-opaque pixel
    var near = [Bool](repeating: false, count: w * h)
    for y in 0..<h { for x in 0..<w where px[(y * w + x) * 4 + 3] < 255 {
        for yy in max(0, y - band)...min(h - 1, y + band) { for xx in max(0, x - band)...min(w - 1, x + band) { near[yy * w + xx] = true } }
    } }
    // straight colours of the solid pixels, spread outward breadth-first to everything else
    var col = [Int32](repeating: -1, count: w * h * 3)
    var queue = [Int](), head = 0
    for i in 0..<(w * h) where !near[i] && px[i * 4 + 3] == 255 {
        for c in 0..<3 { col[i * 3 + c] = Int32(px[i * 4 + c]) }
        queue.append(i)
    }
    while head < queue.count {
        let i = queue[head]; head += 1
        let x = i % w, y = i / w
        for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
            let nx = x + dx, ny = y + dy
            guard nx >= 0, ny >= 0, nx < w, ny < h else { continue }
            let j = ny * w + nx
            guard col[j * 3] < 0 else { continue }
            for c in 0..<3 { col[j * 3 + c] = col[i * 3 + c] }
            queue.append(j)
        }
    }
    var changed = 0
    for i in 0..<(w * h) where near[i] && px[i * 4 + 3] > 0 && col[i * 3] >= 0 {
        let a = Int32(px[i * 4 + 3])
        for c in 0..<3 { px[i * 4 + c] = UInt8(col[i * 3 + c] * a / 255) }
        changed += 1
    }
    let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(d, ctx.makeImage()!, nil); CGImageDestinationFinalize(d)
    print(path, "defringed", changed, "px")
}
