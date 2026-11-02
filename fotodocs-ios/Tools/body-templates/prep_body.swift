import Foundation
import Vision
import CoreImage
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
// prep <body.png> <out.png> <out.json>: body with person-mask alpha + jaw/neck metadata (top-left px)
let a = CommandLine.arguments
let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil)!
let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
let W = Double(img.width), H = Double(img.height)
let h = VNImageRequestHandler(cgImage: img, options: [:])
let lm = VNDetectFaceLandmarksRequest(), fg = VNGenerateForegroundInstanceMaskRequest()
try! h.perform([lm, fg])
let face = lm.results!.first!
let pts = face.landmarks!.faceContour!.pointsInImage(imageSize: CGSize(width: W, height: H)).map { CGPoint(x: $0.x, y: H - $0.y) }
let minX = pts.map(\.x).min()!, maxX = pts.map(\.x).max()!, chin = pts.map(\.y).max()!
let r = fg.results!.first!
let buf = try! r.generateScaledMaskForImage(forInstances: r.allInstances, from: h)
let ci = CIContext(), m = CIImage(cvPixelBuffer: buf)
let mask = ci.createCGImage(m, from: m.extent, format: .L8, colorSpace: CGColorSpaceCreateDeviceGray())!
let ctx = CGContext(data: nil, width: img.width, height: img.height, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
let full = CGRect(x: 0, y: 0, width: W, height: H)
ctx.clip(to: full, mask: mask); ctx.draw(img, in: full)
let d = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[2]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(d, ctx.makeImage()!, nil); CGImageDestinationFinalize(d)
let meta: [String: Double] = ["chin": chin, "cx": (minX + maxX) / 2, "jawW": maxX - minX]
try! JSONSerialization.data(withJSONObject: meta, options: [.sortedKeys]).write(to: URL(fileURLWithPath: a[3]))
print(a[1], meta)
