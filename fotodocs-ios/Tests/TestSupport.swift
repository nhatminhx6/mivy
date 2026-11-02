import CoreGraphics

/// Synthetic sample images for headless imaging tests (no photo library needed).
enum Sample {
    static func solidImage(_ width: Int, _ height: Int, red: Double = 0.5, green: Double = 0.5, blue: Double = 0.5) -> CGImage {
        let ctx = CGContext(
            data: nil,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
        )!
        ctx.setFillColor(red: red, green: green, blue: blue, alpha: 1)
        ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
        return ctx.makeImage()!
    }
}
