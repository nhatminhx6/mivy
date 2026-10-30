import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
import FotoworkCore

public struct PrintSheet {
    public let image: CGImage
    public let count: Int
    public let pixelSize: CGSize
}

/// Pure Core Graphics export: print layout and digital JPEG. No UI dependency.
public enum PhotoExporter {
    public static let dpi: CGFloat = 300

    public static func px(_ mm: Double) -> CGFloat { CGFloat(mm) / 25.4 * dpi }

    /// Lays out as many copies of `photo` as fit on a 10×15 cm sheet at 300 DPI.
    public static func printSheet(
        photo: CGImage,
        photoWidthMm: Double,
        photoHeightMm: Double,
        sheetWidthMm: Double = 100,
        sheetHeightMm: Double = 150,
        gapMm: Double = 2
    ) -> PrintSheet? {
        let sheetW = Int(px(sheetWidthMm).rounded())
        let sheetH = Int(px(sheetHeightMm).rounded())
        let pw = px(photoWidthMm)
        let ph = px(photoHeightMm)
        let gap = px(gapMm)

        let cols = max(1, Int((px(sheetWidthMm) + gap) / (pw + gap)))
        let rows = max(1, Int((px(sheetHeightMm) + gap) / (ph + gap)))

        guard let ctx = context(sheetW, sheetH) else { return nil }
        ctx.setFillColor(CGColor(gray: 1, alpha: 1))
        ctx.fill(CGRect(x: 0, y: 0, width: sheetW, height: sheetH))
        // Flip to a top-left origin for intuitive layout.
        ctx.translateBy(x: 0, y: CGFloat(sheetH))
        ctx.scaleBy(x: 1, y: -1)

        let totalW = CGFloat(cols) * pw + CGFloat(cols - 1) * gap
        let totalH = CGFloat(rows) * ph + CGFloat(rows - 1) * gap
        let startX = (CGFloat(sheetW) - totalW) / 2
        let startY = (CGFloat(sheetH) - totalH) / 2

        for row in 0..<rows {
            for col in 0..<cols {
                let x = startX + CGFloat(col) * (pw + gap)
                let y = startY + CGFloat(row) * (ph + gap)
                ctx.draw(photo, in: CGRect(x: x, y: y, width: pw, height: ph))
            }
        }

        guard let image = ctx.makeImage() else { return nil }
        return PrintSheet(image: image, count: cols * rows, pixelSize: CGSize(width: sheetW, height: sheetH))
    }

    public static func resized(_ photo: CGImage, to size: CGSize) -> CGImage? {
        let w = Int(size.width.rounded())
        let h = Int(size.height.rounded())
        guard w > 0, h > 0, let ctx = context(w, h) else { return nil }
        ctx.interpolationQuality = .high
        ctx.draw(photo, in: CGRect(x: 0, y: 0, width: w, height: h))
        return ctx.makeImage()
    }

    public static func jpeg(_ image: CGImage, quality: Double) -> Data? {
        let data = NSMutableData()
        guard let dest = CGImageDestinationCreateWithData(data, UTType.jpeg.identifier as CFString, 1, nil) else {
            return nil
        }
        CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
        guard CGImageDestinationFinalize(dest) else { return nil }
        return data as Data
    }

    /// JPEG compressed to at most `maxKB` by lowering quality (if a budget is given).
    public static func compressedJPEG(_ image: CGImage, maxKB: Int?) -> Data? {
        guard let maxKB else { return jpeg(image, quality: 0.92) }
        var quality = 0.95
        var data = jpeg(image, quality: quality)
        while let current = data, current.count > maxKB * 1024, quality > 0.3 {
            quality -= 0.07
            data = jpeg(image, quality: quality)
        }
        return data
    }

    public static func digitalPixelSize(for target: CaptureTarget) -> CGSize {
        if let pixels = target.digitalPixels { return pixels }
        return CGSize(width: px(target.widthMm), height: px(target.heightMm))
    }

    private static func context(_ width: Int, _ height: Int) -> CGContext? {
        CGContext(
            data: nil,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
        )
    }
}
