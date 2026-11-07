import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
// recolor <in.png> <out.png> black : navy suit/tie → black (only dark bluish pixels; white shirt, skin, hair kept)
let a = CommandLine.arguments
let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil)!
let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
let w = img.width, h = img.height
let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
let p = ctx.data!.assumingMemoryBound(to: UInt8.self)
for i in 0..<(w * h) {
    let o = i * 4, al = Double(p[o + 3]) / 255
    guard al > 0 else { continue }
    let r = Double(p[o]) / al, g = Double(p[o + 1]) / al, b = Double(p[o + 2]) / al
    let y = 0.299 * r + 0.587 * g + 0.114 * b, cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b
    // navy: dark and bluish (soft weight so edges blend)
    let navy = max(0, min(1, (cb - 132) / 8)) * max(0, min(1, (150 - y) / 30))
    guard navy > 0 else { continue }
    let ny = y * 0.55, k = 0.12          // black: darker, almost no chroma
    let nr = ny + (r - y) * k, ng = ny + (g - y) * k, nb = ny + (b - y) * k
    let mix = [r + (nr - r) * navy, g + (ng - g) * navy, b + (nb - b) * navy]
    for c in 0..<3 { p[o + c] = UInt8(max(0, min(255, mix[c] * al))) }
}
let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[2]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(d, ctx.makeImage()!, nil); CGImageDestinationFinalize(d)
print("ok", a[2])
